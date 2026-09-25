import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Booking,
  BookingResponseDto,
  CreateBookingDto,
  SeatStatus,
} from '@davivienda/shared';
import {
  BookingEntity,
  PassengerEntity,
  PaymentEntity,
  SeatEntity,
} from '../../database/entities';
import { FlightService } from '../flight/flight.service';
import { SeatLockService } from '../seat/seat-lock.service';
import { Subject } from 'rxjs';

export interface BookingCreatedEvent {
  flightId: string;
  seatId: string;
  seatNumber: string;
  bookingReference: string;
  userId: string;
  totalPaid: number;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  // Stream reactivo para WebSocket Gateway
  public readonly bookingCreated$ = new Subject<BookingCreatedEvent>();

  constructor(
    private readonly flightService: FlightService,
    private readonly seatLockService: SeatLockService,
    private readonly dataSource: DataSource,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(PassengerEntity)
    private readonly passengerRepo: Repository<PassengerEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
  ) {}

  /**
   * Procesa la confirmación de compra y emite el boleto digital con código PNR (HU3).
   * Ejecuta una transacción ACID estricta en PostgreSQL.
   */
  async createBooking(dto: CreateBookingDto): Promise<BookingResponseDto> {
    const { flightId, seatId, userId, passenger, payment } = dto;

    // 1. Obtener información del vuelo
    const flight = await this.flightService.getFlightById(flightId);

    // 2. Verificar que el asiento exista y esté disponible
    const seat = await this.flightService.getSeatByNumber(flightId, seatId);

    if (!seat) {
      throw new BadRequestException(
        `El asiento ${seatId} no existe en el vuelo ${flightId}.`,
      );
    }

    if (seat.status === SeatStatus.BOOKED) {
      throw new ConflictException(
        `El asiento ${seat.seatNumber} ya ha sido comprado permanentemente.`,
      );
    }

    // 3. Validar que el lock siga vigente en Redis y pertenezca al usuario solicitante
    const lock = await this.seatLockService.getLock(flightId, seat.seatNumber);

    if (!lock) {
      throw new ConflictException(
        `El tiempo de reserva temporal para el asiento ${seat.seatNumber} ha expirado. Por favor, selecciónalo nuevamente.`,
      );
    }

    if (lock.userId !== userId) {
      this.logger.warn(
        `[SECURITY FRAUD] Usuario ${userId} intentó comprar asiento ${seatId} bloqueado por ${lock.userId}`,
      );
      throw new ConflictException(
        `El asiento ${seat.seatNumber} está bloqueado por otro usuario.`,
      );
    }

    // 4. Generar código único de reserva (PNR) de 6 caracteres alfanuméricos
    const bookingReference = this.generatePnr();
    const now = new Date();
    const nowIso = now.toISOString();

    // 5. Transacción ACID atómica en PostgreSQL: Booking + Passenger + Payment + Seat Status
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedBooking: BookingEntity;

    try {
      // 5.1 Crear la reserva
      const bookingRecord = queryRunner.manager.create(BookingEntity, {
        bookingReference,
        flightId,
        seatId: `${flightId}-${seat.seatNumber}`,
        seatNumber: seat.seatNumber,
        userId,
        totalPrice: Number(seat.price),
        currency: flight.currency,
        status: 'CONFIRMED',
      });
      savedBooking = await queryRunner.manager.save(bookingRecord);

      // 5.2 Crear el pasajero
      const passengerRecord = queryRunner.manager.create(PassengerEntity, {
        bookingId: savedBooking.id,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        documentType: passenger.documentType,
        documentNumber: passenger.documentNumber,
        email: passenger.email,
        phone: passenger.phone,
      });
      await queryRunner.manager.save(passengerRecord);

      // 5.3 Crear el pago simulado
      const paymentRecord = queryRunner.manager.create(PaymentEntity, {
        bookingId: savedBooking.id,
        method: payment.method,
        lastFourDigits: payment.cardNumber?.slice(-4) || '4411',
        transactionId: `TX-DAV-${Date.now()}`,
        amount: Number(seat.price),
        status: 'APPROVED',
      });
      await queryRunner.manager.save(paymentRecord);

      // 5.4 Marcar asiento permanentemente como BOOKED en PostgreSQL DENTRO de la transacción
      await queryRunner.manager.update(
        SeatEntity,
        { flightId, seatNumber: seat.seatNumber },
        { status: SeatStatus.BOOKED, bookingReference },
      );

      // Commit de la transacción ACID
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error en transacción de reserva: ${err}`);
      throw new BadRequestException('Error al procesar la reserva en base de datos.');
    } finally {
      await queryRunner.release();
    }

    // 5.5 Liberar lock en Redis ÚNICAMENTE tras el commit exitoso de la transacción
    await this.seatLockService.releaseLock(
      flightId,
      seat.seatNumber,
      seat.seatNumber,
      userId,
      'BOOKED',
    );

    this.logger.log(
      `✓ RESERVA EXITOSA (ACID COMMIT): PNR ${bookingReference} | Vuelo ${flight.flightNumber} | Asiento ${seat.seatNumber} | Pasajero ${passenger.firstName} ${passenger.lastName}`,
    );

    // 6. Emitir evento para difusión en WebSockets
    this.bookingCreated$.next({
      flightId,
      seatId: seat.seatNumber,
      seatNumber: seat.seatNumber,
      bookingReference,
      userId,
      totalPaid: seat.price,
    });

    return {
      bookingId: savedBooking.id,
      bookingReference,
      flightNumber: flight.flightNumber,
      seatNumber: seat.seatNumber,
      origin: flight.originCity,
      destination: flight.destinationCity,
      departureTime: flight.departureTime,
      passengerName: `${passenger.firstName} ${passenger.lastName}`,
      totalPaid: seat.price,
      currency: flight.currency,
      confirmedAt: nowIso,
    };
  }

  async getBookingByReference(pnr: string): Promise<Booking | null> {
    const b = await this.bookingRepo.findOne({
      where: { bookingReference: pnr.toUpperCase() },
      relations: { passenger: true, payment: true },
    });

    if (!b) return null;

    return {
      id: b.id,
      bookingReference: b.bookingReference,
      flightId: b.flightId,
      seatId: b.seatId,
      seatNumber: b.seatNumber,
      userId: b.userId,
      passenger: {
        firstName: b.passenger?.firstName || '',
        lastName: b.passenger?.lastName || '',
        documentType: (b.passenger?.documentType as any) || 'CC',
        documentNumber: b.passenger?.documentNumber || '',
        email: b.passenger?.email || '',
        phone: b.passenger?.phone || '',
      },
      totalPrice: Number(b.totalPrice),
      currency: b.currency,
      createdAt: b.createdAt.toISOString(),
      status: b.status as any,
      paymentDetails: {
        method: (b.payment?.method as any) || 'DAVIPLATA',
        lastFourDigits: b.payment?.lastFourDigits,
        transactionId: b.payment?.transactionId || '',
        paidAt: b.payment?.paidAt?.toISOString() || b.createdAt.toISOString(),
      },
    };
  }

  private generatePnr(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DV-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
