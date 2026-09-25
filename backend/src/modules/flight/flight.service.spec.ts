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
    const result = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'MDE',
    });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].originCode).toBe('BOG');
    expect(result.data[0].destinationCode).toBe('MDE');
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(5);
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

    expect(returnFlights.data.length).toBe(5);
    const flightNumbers = returnFlights.data.map((f) => f.flightNumber);
    expect(flightNumbers).toContain('DV-201');
    expect(flightNumbers).toContain('DV-203');
    expect(flightNumbers).toContain('DV-205');
    expect(flightNumbers).toContain('DV-207');
    expect(flightNumbers).toContain('DV-319');
  });

  it('debe proyectar vuelos diarios al buscar por una fecha futura sin vuelos exactos', async () => {
    const futureDate = '2026-12-25';
    const result = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'CTG',
      date: futureDate,
    });

    expect(result.data.length).toBe(5);
    result.data.forEach((f) => {
      expect(f.departureTime.startsWith(futureDate)).toBe(true);
      expect(f.originCode).toBe('BOG');
      expect(f.destinationCode).toBe('CTG');
    });
  });

  it('debe retornar lista vacía si origen y destino son la misma ciudad', async () => {
    const result = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'BOG',
    });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('debe encontrar vuelos reales sembrados para fechas futuras dentro de la semana', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = futureDate.toISOString().split('T')[0];

    const result = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'MDE',
      date: dateStr,
    });

    expect(result.data.length).toBe(5);
    result.data.forEach((f) => {
      expect(f.departureTime.startsWith(dateStr)).toBe(true);
      expect(f.originCode).toBe('BOG');
      expect(f.destinationCode).toBe('MDE');
    });
  });

  it('debe respetar los parámetros de paginación (page y limit)', async () => {
    const page1 = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'MDE',
      page: 1,
      limit: 2,
    });

    expect(page1.data.length).toBe(2);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(2);
    expect(page1.hasNextPage).toBe(true);
    expect(page1.hasPreviousPage).toBe(false);

    const page2 = await flightService.searchFlights({
      origin: 'BOG',
      destination: 'MDE',
      page: 2,
      limit: 2,
    });

    expect(page2.data.length).toBe(2);
    expect(page2.page).toBe(2);
    expect(page2.data[0].id).not.toBe(page1.data[0].id);
    expect(page2.hasPreviousPage).toBe(true);
  });
});
