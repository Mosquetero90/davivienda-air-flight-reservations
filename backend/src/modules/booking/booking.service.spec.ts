import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingService } from './booking.service';
import { FlightService } from '../flight/flight.service';
import { SeatLockService } from '../seat/seat-lock.service';
import { RedisService } from '../redis/redis.service';
import { CreateBookingDto } from '@davivienda/shared';
import {
  FlightEntity,
  SeatEntity,
  PassengerEntity,
  PaymentEntity,
  BookingEntity,
} from '../../database/entities';
import { DatabaseSeederService } from '../../database/database-seeder.service';

describe('BookingService (Checkout & PNR issuance)', () => {
  let bookingService: BookingService;
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
    bookingService = new BookingService(
      flightService,
      seatLockService,
      dataSource,
      dataSource.getRepository(BookingEntity),
      dataSource.getRepository(PassengerEntity),
      dataSource.getRepository(PaymentEntity),
    );
  });

  afterEach(async () => {
    seatLockService.onModuleDestroy();
    await redisService.onModuleDestroy();
  });

  const mockBookingDto: CreateBookingDto = {
    flightId: 'DV-204',
    seatId: '12B',
    userId: 'carlos_mendoza',
    passenger: {
      firstName: 'Carlos',
      lastName: 'Mendoza',
      documentType: 'CC',
      documentNumber: '1020482910',
      email: 'carlos.mendoza@email.com',
      phone: '3108924411',
    },
    payment: {
      method: 'DAVIPLATA',
    },
  };

  it('debe rechazar compra si el asiento NO está previamente bloqueado por el usuario', async () => {
    await expect(bookingService.createBooking(mockBookingDto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('debe confirmar compra, emitir PNR y pasar asiento a BOOKED permanentemente cuando el lock es válido', async () => {
    // 1. Usuario bloquea el asiento primero
    await seatLockService.acquireLock('DV-204', '12B', '12B', 'carlos_mendoza', 300);

    // 2. Procesa la reserva
    const response = await bookingService.createBooking(mockBookingDto);

    expect(response.bookingReference).toMatch(/^DV-[A-Z0-9]{5}$/);
    expect(response.seatNumber).toBe('12B');
    expect(response.passengerName).toBe('Carlos Mendoza');

    // 3. Verificar que el asiento ahora está comprado en el catálogo
    const seats = await flightService.getSeatsForFlight('DV-204');
    const seat12B = seats.find((s) => s.id === '12B');
    expect(seat12B?.status).toBe('BOOKED');
    expect(seat12B?.bookingReference).toBe(response.bookingReference);
  });

  it('debe rechazar si otro usuario intenta pagar un asiento bloqueado por un tercero', async () => {
    // Usuario A bloquea el asiento
    await seatLockService.acquireLock('DV-204', '12B', '12B', 'user_A', 300);

    // Usuario B intenta enviar el checkout
    const intruderDto: CreateBookingDto = {
      ...mockBookingDto,
      userId: 'user_B_intruder',
    };

    await expect(bookingService.createBooking(intruderDto)).rejects.toThrow(
      ConflictException,
    );
  });
});
