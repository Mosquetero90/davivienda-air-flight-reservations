import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Flight,
  FlightStatus,
  Seat,
  SeatClass,
  SeatStatus,
  SearchFlightsDto,
} from '@davivienda/shared';
import { FlightEntity, SeatEntity } from '../../database/entities';
import { SeatLockService } from '../seat/seat-lock.service';
import { Subject } from 'rxjs';

export interface FlightStatusChangedEvent {
  flightId: string;
  previousStatus: FlightStatus;
  newStatus: FlightStatus;
}

export interface FlightCreatedEvent {
  flight: Flight;
}

@Injectable()
export class FlightService {
  private readonly logger = new Logger(FlightService.name);

  // Streams reactivos para WebSockets Gateway
  public readonly flightStatusChanged$ = new Subject<FlightStatusChangedEvent>();
  public readonly flightCreated$ = new Subject<FlightCreatedEvent>();

  constructor(
    @InjectRepository(FlightEntity)
    private readonly flightRepo: Repository<FlightEntity>,
    @InjectRepository(SeatEntity)
    private readonly seatRepo: Repository<SeatEntity>,
    private readonly seatLockService: SeatLockService,
  ) {}

  /**
   * Búsqueda y filtrado de vuelos en Base de Datos (HU1).
   */
  async searchFlights(dto: SearchFlightsDto): Promise<Flight[]> {
    if (
      dto.origin &&
      dto.destination &&
      dto.origin.trim().toUpperCase() === dto.destination.trim().toUpperCase()
    ) {
      return [];
    }

    const query = this.flightRepo.createQueryBuilder('flight');

    if (dto.origin) {
      query.andWhere(
        '(LOWER(flight.originCode) = LOWER(:orig) OR LOWER(flight.originCity) LIKE LOWER(:origLike))',
        { orig: dto.origin, origLike: `%${dto.origin}%` },
      );
    }

    if (dto.destination) {
      query.andWhere(
        '(LOWER(flight.destinationCode) = LOWER(:dest) OR LOWER(flight.destinationCity) LIKE LOWER(:destLike))',
        { dest: dto.destination, destLike: `%${dto.destination}%` },
      );
    }

    const targetDate = dto.date || new Date().toISOString().split('T')[0];
    query.andWhere('flight.departureTime LIKE :date', { date: `${targetDate}%` });

    query.orderBy('flight.departureTime', 'ASC');
    let entities = await query.getMany();

    // Si no hay vuelos exactos en BD para la fecha solicitada (ej: fecha futura más allá de la semana sembrada),
    // proyectar los itinerarios diarios de esa ruta con la fecha solicitada para permitir la reserva fluida
    if (entities.length === 0) {
      const fallbackQuery = this.flightRepo.createQueryBuilder('flight');
      if (dto.origin) {
        fallbackQuery.andWhere(
          '(LOWER(flight.originCode) = LOWER(:orig) OR LOWER(flight.originCity) LIKE LOWER(:origLike))',
          { orig: dto.origin, origLike: `%${dto.origin}%` },
        );
      }
      if (dto.destination) {
        fallbackQuery.andWhere(
          '(LOWER(flight.destinationCode) = LOWER(:dest) OR LOWER(flight.destinationCity) LIKE LOWER(:destLike))',
          { dest: dto.destination, destLike: `%${dto.destination}%` },
        );
      }
      fallbackQuery.limit(5);
      fallbackQuery.orderBy('flight.departureTime', 'ASC');
      const fallbackEntities = await fallbackQuery.getMany();

      entities = fallbackEntities.map((f) => {
        const timePartDep = f.departureTime.split('T')[1] || '08:00:00Z';
        const timePartArr = f.arrivalTime.split('T')[1] || '09:00:00Z';
        return {
          ...f,
          departureTime: `${targetDate}T${timePartDep}`,
          arrivalTime: `${targetDate}T${timePartArr}`,
        };
      });
    }

    // Calcular conteo en vivo de asientos disponibles cruzando con Redis
    return Promise.all(
      entities.map(async (f) => {
        const seats = await this.getSeatsForFlight(f.id);
        const availableCount = seats.filter(
          (s) => s.status === SeatStatus.AVAILABLE,
        ).length;

        return {
          id: f.id,
          flightNumber: f.flightNumber,
          airline: f.airline,
          aircraftModel: f.aircraftModel,
          originCity: f.originCity,
          destinationCity: f.destinationCity,
          originCode: f.originCode,
          destinationCode: f.destinationCode,
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
          durationMinutes: f.durationMinutes,
          basePrice: Number(f.basePrice),
          currency: f.currency,
          status: availableCount === 0 ? FlightStatus.SOLD_OUT : f.status,
          cabinLayout: f.cabinLayout,
          totalSeats: f.totalSeats,
          availableSeatsCount: availableCount,
        };
      }),
    );
  }

  /**
   * Obtiene un vuelo por su ID desde Base de Datos.
   */
  async getFlightById(flightId: string): Promise<Flight> {
    const f = await this.flightRepo.findOne({ where: { id: flightId } });
    if (!f) {
      throw new NotFoundException(`Vuelo con ID ${flightId} no encontrado.`);
    }

    const seats = await this.getSeatsForFlight(flightId);
    const availableCount = seats.filter(
      (s) => s.status === SeatStatus.AVAILABLE,
    ).length;

    return {
      id: f.id,
      flightNumber: f.flightNumber,
      airline: f.airline,
      aircraftModel: f.aircraftModel,
      originCity: f.originCity,
      destinationCity: f.destinationCity,
      originCode: f.originCode,
      destinationCode: f.destinationCode,
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      durationMinutes: f.durationMinutes,
      basePrice: Number(f.basePrice),
      currency: f.currency,
      status: availableCount === 0 ? FlightStatus.SOLD_OUT : f.status,
      cabinLayout: f.cabinLayout,
      totalSeats: f.totalSeats,
      availableSeatsCount: availableCount,
    };
  }

  /**
   * Obtiene la matriz completa de asientos combinando la persistencia de PostgreSQL/SQLite
   * con los bloqueos temporales efímeros activos en Redis (HU2).
   */
  async getSeatsForFlight(flightId: string, currentUserId?: string): Promise<Seat[]> {
    const seatEntities = await this.seatRepo.find({
      where: { flightId },
      order: { rowNumber: 'ASC', columnLetter: 'ASC' },
    });

    if (!seatEntities || seatEntities.length === 0) {
      throw new NotFoundException(
        `Mapa de cabina no encontrado para el vuelo ${flightId}.`,
      );
    }

    const result: Seat[] = [];

    for (const s of seatEntities) {
      // 1. Si en Base de Datos ya está vendido (BOOKED), se respeta la persistencia
      if (s.status === SeatStatus.BOOKED) {
        result.push({
          id: s.seatNumber,
          flightId: s.flightId,
          row: s.rowNumber,
          column: s.columnLetter,
          seatNumber: s.seatNumber,
          seatClass: s.seatClass,
          price: Number(s.price),
          isExitRow: s.isExitRow,
          status: SeatStatus.BOOKED,
          bookingReference: s.bookingReference,
        });
        continue;
      }

      // 2. Si no está vendido, consultar a Redis si tiene un bloqueo atómico temporal activo
      const lock = await this.seatLockService.getLock(flightId, s.seatNumber);
      if (lock && lock.lockedUntil > Date.now()) {
        result.push({
          id: s.seatNumber,
          flightId: s.flightId,
          row: s.rowNumber,
          column: s.columnLetter,
          seatNumber: s.seatNumber,
          seatClass: s.seatClass,
          price: Number(s.price),
          isExitRow: s.isExitRow,
          status: SeatStatus.LOCKED,
          lockedByUserId: lock.userId,
          lockedAt: lock.lockedAt,
          lockedUntil: lock.lockedUntil,
        });
        continue;
      }

      // 3. Asiento disponible
      result.push({
        id: s.seatNumber,
        flightId: s.flightId,
        row: s.rowNumber,
        column: s.columnLetter,
        seatNumber: s.seatNumber,
        seatClass: s.seatClass,
        price: Number(s.price),
        isExitRow: s.isExitRow,
        status: SeatStatus.AVAILABLE,
      });
    }

    return result;
  }

  /**
   * Marca un asiento como comprado permanentemente en la Base de Datos.
   */
  async markSeatAsBooked(
    flightId: string,
    seatNumber: string,
    userId: string,
    bookingReference: string,
  ): Promise<Seat> {
    const seatId = `${flightId}-${seatNumber}`;

    await this.seatRepo.update(
      { flightId, seatNumber },
      { status: SeatStatus.BOOKED, bookingReference },
    );

    // Liberar lock en Redis
    await this.seatLockService.releaseLock(
      flightId,
      seatNumber,
      seatNumber,
      userId,
      'BOOKED',
    );

    const s = await this.seatRepo.findOne({ where: { flightId, seatNumber } });

    return {
      id: seatNumber,
      flightId,
      row: s?.rowNumber || 1,
      column: s?.columnLetter || 'A',
      seatNumber,
      seatClass: s?.seatClass || SeatClass.ECONOMY,
      price: Number(s?.price || 280000),
      isExitRow: s?.isExitRow || false,
      status: SeatStatus.BOOKED,
      bookedByUserId: userId,
      bookingReference,
    };
  }

  /**
   * Actualiza el estado operativo de un vuelo (HU1).
   */
  async updateFlightStatus(
    flightId: string,
    newStatus: FlightStatus,
  ): Promise<Flight> {
    const flight = await this.getFlightById(flightId);
    const previousStatus = flight.status;

    await this.flightRepo.update({ id: flightId }, { status: newStatus });
    flight.status = newStatus;

    this.logger.log(
      `[FLIGHT STATUS] Vuelo ${flightId} cambió de ${previousStatus} a ${newStatus}`,
    );

    this.flightStatusChanged$.next({
      flightId,
      previousStatus,
      newStatus,
    });

    return flight;
  }

  /**
   * Crea un nuevo vuelo en caliente en Base de Datos y genera sus 180 asientos de cabina.
   */
  async createFlight(data: {
    flightNumber: string;
    airline?: string;
    aircraftModel?: string;
    originCode: string;
    originCity: string;
    destinationCode: string;
    destinationCity: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;
    basePrice: number;
    currency?: string;
  }): Promise<Flight> {
    const id = data.flightNumber.toUpperCase();
    const cabinLayout = {
      rows: 30,
      columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      aisleAfterColumn: ['C'],
      exitRows: [11, 12],
      businessRows: [1, 2, 3],
    };

    const flightEntity = this.flightRepo.create({
      id,
      flightNumber: data.flightNumber.toUpperCase(),
      airline: data.airline || 'Davivienda Air',
      aircraftModel: data.aircraftModel || 'Airbus A320neo',
      originCode: data.originCode.toUpperCase(),
      originCity: data.originCity,
      destinationCode: data.destinationCode.toUpperCase(),
      destinationCity: data.destinationCity,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      durationMinutes: data.durationMinutes,
      basePrice: data.basePrice,
      currency: data.currency || 'COP',
      status: FlightStatus.ON_TIME,
      cabinLayout,
      totalSeats: 180,
    });

    await this.flightRepo.save(flightEntity);

    // Generar 180 asientos
    const seats: SeatEntity[] = [];
    for (let r = 1; r <= 30; r++) {
      const isExit = [11, 12].includes(r);
      const isBusiness = [1, 2, 3].includes(r);

      let seatClass = SeatClass.ECONOMY;
      let price = data.basePrice;
      if (isBusiness) {
        seatClass = SeatClass.BUSINESS;
        price = Math.round(data.basePrice * 1.6);
      } else if (isExit) {
        seatClass = SeatClass.PREMIUM_ECONOMY;
        price = data.basePrice + 40000;
      }

      for (const col of ['A', 'B', 'C', 'D', 'E', 'F']) {
        const rowStr = r < 10 ? `0${r}` : `${r}`;
        const seatNumber = `${rowStr}${col}`;
        seats.push(
          this.seatRepo.create({
            id: `${id}-${seatNumber}`,
            flightId: id,
            seatNumber,
            rowNumber: r,
            columnLetter: col,
            seatClass,
            price,
            isExitRow: isExit,
            status: SeatStatus.AVAILABLE,
          }),
        );
      }
    }

    await this.seatRepo.save(seats);

    const flight: Flight = {
      id,
      flightNumber: flightEntity.flightNumber,
      airline: flightEntity.airline,
      aircraftModel: flightEntity.aircraftModel,
      originCode: flightEntity.originCode,
      originCity: flightEntity.originCity,
      destinationCode: flightEntity.destinationCode,
      destinationCity: flightEntity.destinationCity,
      departureTime: flightEntity.departureTime,
      arrivalTime: flightEntity.arrivalTime,
      durationMinutes: flightEntity.durationMinutes,
      basePrice: Number(flightEntity.basePrice),
      currency: flightEntity.currency,
      status: FlightStatus.ON_TIME,
      cabinLayout,
      totalSeats: 180,
      availableSeatsCount: 180,
    };

    this.logger.log(`✓ Nuevo vuelo creado en BD: ${id} (${flight.originCode} -> ${flight.destinationCode})`);
    this.flightCreated$.next({ flight });

    return flight;
  }
}
