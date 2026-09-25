import { DataSource } from 'typeorm';
import { FlightService } from './flight.service';
import { SeatLockService } from '../seat/seat-lock.service';
import { RedisService } from '../redis/redis.service';
import { FlightStatus, SeatStatus } from '@davivienda/shared';
import {
  FlightEntity,
  SeatEntity,
  PassengerEntity,
  PaymentEntity,
  BookingEntity,
  CountryEntity,
  CityEntity,
  AirportEntity,
} from '../../database/entities';
import { DatabaseSeederService } from '../../database/database-seeder.service';

describe('FlightService (Catalog & Seats Matrix)', () => {
  let flightService: FlightService;
  let seatLockService: SeatLockService;
  let redisService: RedisService;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [
        FlightEntity,
        SeatEntity,
        PassengerEntity,
        PaymentEntity,
        BookingEntity,
        CountryEntity,
        CityEntity,
        AirportEntity,
      ],
      synchronize: true,
    });
    await dataSource.initialize();

    const seeder = new DatabaseSeederService(
      dataSource.getRepository(FlightEntity),
      dataSource.getRepository(SeatEntity),
      dataSource.getRepository(BookingEntity),
      dataSource.getRepository(PassengerEntity),
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(CountryEntity),
      dataSource.getRepository(CityEntity),
      dataSource.getRepository(AirportEntity),
    );
    await seeder.onApplicationBootstrap();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(() => {
    redisService = new RedisService();
    seatLockService = new SeatLockService(redisService);
    flightService = new FlightService(
      dataSource.getRepository(FlightEntity),
      dataSource.getRepository(SeatEntity),
      seatLockService,
    );
  });

  afterEach(async () => {
    seatLockService.onModuleDestroy();
    await redisService.onModuleDestroy();
  });

  it('debe listar vuelos filtrados por origen y destino', async () => {
    const flights = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'MDE',
    });

    expect(flights.length).toBeGreaterThan(0);
    expect(flights[0].originCode).toBe('BOG');
    expect(flights[0].destinationCode).toBe('MDE');
  });

  it('debe generar la cabina completa de 180 asientos para el Airbus A320neo', async () => {
    const seats = await flightService.getSeatsForFlight('DV-204');

    expect(seats.length).toBe(180);
    expect(seats[0].seatNumber).toBe('01A');
    expect(seats[seats.length - 1].seatNumber).toBe('30F');
  });

  it('debe reflejar asientos bloqueados por Redis en la matriz de cabina', async () => {
    // Bloquear el asiento 14B
    await seatLockService.acquireLock('DV-204', '14B', '14B', 'user_test', 300);

    const seats = await flightService.getSeatsForFlight('DV-204');
    const seat14B = seats.find((s) => s.id === '14B');

    expect(seat14B?.status).toBe(SeatStatus.LOCKED);
    expect(seat14B?.lockedByUserId).toBe('user_test');
  });

  it('debe emitir evento reactivo al actualizar el estado de un vuelo (HU1)', async () => {
    let capturedEvent: any = null;
    flightService.flightStatusChanged$.subscribe((ev) => {
      capturedEvent = ev;
    });

    await flightService.updateFlightStatus('DV-204', FlightStatus.DELAYED);

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent.flightId).toBe('DV-204');
    expect(capturedEvent.newStatus).toBe(FlightStatus.DELAYED);
  });

  it('debe listar 5 vuelos de regreso para una ruta (ej. MDE -> BOG) en diferentes horarios', async () => {
    const returnFlights = await flightService.searchFlights({
      origin: 'MDE',
      destination: 'BOG',
    });

    expect(returnFlights.length).toBe(5);
    const flightNumbers = returnFlights.map((f) => f.flightNumber);
    expect(flightNumbers).toContain('DV-201');
    expect(flightNumbers).toContain('DV-203');
    expect(flightNumbers).toContain('DV-205');
    expect(flightNumbers).toContain('DV-207');
    expect(flightNumbers).toContain('DV-319');
  });

  it('debe proyectar vuelos diarios al buscar por una fecha futura sin vuelos exactos', async () => {
    const futureDate = '2026-12-25';
    const flights = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'CTG',
      date: futureDate,
    });

    expect(flights.length).toBe(5);
    flights.forEach((f) => {
      expect(f.departureTime.startsWith(futureDate)).toBe(true);
      expect(f.originCode).toBe('BOG');
      expect(f.destinationCode).toBe('CTG');
    });
  });

  it('debe retornar lista vacía si origen y destino son la misma ciudad', async () => {
    const flights = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'BOG',
    });

    expect(flights).toEqual([]);
  });

  it('debe encontrar vuelos reales sembrados para fechas futuras dentro de la semana', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = futureDate.toISOString().split('T')[0];

    const flights = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'MDE',
      date: dateStr,
    });

    expect(flights.length).toBe(5);
    flights.forEach((f) => {
      expect(f.departureTime.startsWith(dateStr)).toBe(true);
      expect(f.originCode).toBe('BOG');
      expect(f.destinationCode).toBe('MDE');
    });
  });
});
