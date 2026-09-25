import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
const request = require('supertest');
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { CreateBookingRequestDto } from '../../common/dto/swagger-models.dto';
import { NotFoundException } from '@nestjs/common';

describe('BookingController (Rate Limiting & Endpoints)', () => {
  let app: INestApplication;
  let controller: BookingController;
  let bookingService: jest.Mocked<Partial<BookingService>>;

  const mockBookingResponse = {
    bookingId: 'uuid-1',
    bookingReference: 'DV-TEST1',
    flightNumber: 'DV-204',
    seatNumber: '12B',
    origin: 'Bogotá (BOG)',
    destination: 'Medellín (MDE)',
    departureTime: new Date().toISOString(),
    arrivalTime: new Date().toISOString(),
    passengerName: 'Carlos Mendoza',
    passengerDocument: 'CC 1020304050',
    totalPaid: 180000,
    currency: 'COP',
    paymentMethod: 'DAVIPLATA',
    status: 'CONFIRMED',
    bookedAt: new Date().toISOString(),
  };

  const validBookingDto: CreateBookingRequestDto = {
    flightId: 'DV-204',
    seatId: '12B',
    userId: 'carlos_mendoza',
    passenger: {
      firstName: 'Carlos',
      lastName: 'Mendoza',
      documentNumber: '1020304050',
      documentType: 'CC',
      email: 'carlos.mendoza@davivienda.com',
      phone: '+57 310 123 4567',
    },
    payment: {
      method: 'DAVIPLATA',
    },
  };

  beforeAll(async () => {
    bookingService = {
      createBooking: jest.fn().mockResolvedValue(mockBookingResponse as any),
      getBookingByReference: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 5,
          },
        ]),
      ],
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: bookingService,
        },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a booking successfully', async () => {
    const result = await controller.createBooking(validBookingDto);
    expect(result).toEqual(mockBookingResponse);
    expect(bookingService.createBooking).toHaveBeenCalledWith(validBookingDto);
  });

  it('should get booking by PNR', async () => {
    (bookingService.getBookingByReference as jest.Mock).mockResolvedValue(mockBookingResponse);

    const result = await controller.getBookingByPnr('DV-TEST1');
    expect(result).toEqual(mockBookingResponse);
    expect(bookingService.getBookingByReference).toHaveBeenCalledWith('DV-TEST1');
  });

  it('should throw NotFoundException if booking not found by PNR', async () => {
    (bookingService.getBookingByReference as jest.Mock).mockResolvedValue(null);

    await expect(controller.getBookingByPnr('DV-NONEXIST')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should enforce rate limiting: permit 5 requests and return 429 on the 6th', async () => {
    // 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const response = await request(app.getHttpServer())
        .post('/api/bookings')
        .send(validBookingDto);
      expect(response.status).toBe(201);
    }

    // 6th request must be blocked with HTTP 429 Too Many Requests
    const throttledResponse = await request(app.getHttpServer())
      .post('/api/bookings')
      .send(validBookingDto);

    expect(throttledResponse.status).toBe(429);
    expect(throttledResponse.body.message).toMatch(/throttler/i);
  });
});
