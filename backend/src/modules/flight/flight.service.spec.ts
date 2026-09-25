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
});
