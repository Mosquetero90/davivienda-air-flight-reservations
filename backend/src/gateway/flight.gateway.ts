import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  WsEvents,
  JoinFlightPayload,
  LeaveFlightPayload,
  SeatLockRequestPayload,
  SeatUnlockRequestPayload,
  FlightInitialStatePayload,
  SeatLockedEventPayload,
  SeatLockFailedEventPayload,
  SeatReleasedEventPayload,
  SeatBookedEventPayload,
  FlightStatusUpdatedEventPayload,
  SeatStatus,
} from '@davivienda/shared';
import { FlightService } from '../modules/flight/flight.service';
import { SeatLockService } from '../modules/seat/seat-lock.service';
import { BookingService } from '../modules/booking/booking.service';
import { MetricsService } from '../modules/metrics/metrics.service';
import {
  WsJoinFlightDto,
  WsSeatLockRequestDto,
  WsSeatUnlockRequestDto,
} from '../common/dto/swagger-models.dto';

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200'];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class FlightGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FlightGateway.name);

  // Mapeo socketId -> { userId, flightId }
  private activeClients = new Map<string, { userId?: string; flightId?: string }>();

  constructor(
    private readonly flightService: FlightService,
    private readonly seatLockService: SeatLockService,
    private readonly bookingService: BookingService,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit() {
    // 1. Escuchar eventos de expiración autónoma de TTL desde SeatLockService
    this.seatLockService.seatReleased$.subscribe(async (event) => {
      const payload: SeatReleasedEventPayload = {
        flightId: event.flightId,
        seatId: event.seatId,
        seatNumber: event.seatNumber,
        reason: event.reason,
      };

      this.server
        .to(`flight_${event.flightId}`)
        .emit(WsEvents.SEAT_RELEASED, payload);

      // Actualizar métricas del dashboard
      const metrics = await this.metricsService.notifyMetricsUpdated(event.flightId);
      this.server.to(`flight_${event.flightId}`).emit(WsEvents.METRICS_UPDATED, metrics);
      this.server.to('metrics_feed').emit(WsEvents.METRICS_UPDATED, metrics);
    });

    // 2. Escuchar cambios operativos de vuelo (HU1)
    this.flightService.flightStatusChanged$.subscribe((event) => {
      const payload: FlightStatusUpdatedEventPayload = {
        flightId: event.flightId,
        newStatus: event.newStatus,
        previousStatus: event.previousStatus,
      };

      this.server.emit(WsEvents.FLIGHT_STATUS_UPDATED, payload);
    });

    // 3. Escuchar confirmaciones de reservas (HU3)
    this.bookingService.bookingCreated$.subscribe(async (event) => {
      const payload: SeatBookedEventPayload = {
        flightId: event.flightId,
        seatId: event.seatId,
        seatNumber: event.seatNumber,
        bookingReference: event.bookingReference,
      };

      this.server
        .to(`flight_${event.flightId}`)
        .emit(WsEvents.SEAT_BOOKED, payload);

      const metrics = await this.metricsService.notifyMetricsUpdated(event.flightId);
      this.server.to(`flight_${event.flightId}`).emit(WsEvents.METRICS_UPDATED, metrics);
      this.server.to('metrics_feed').emit(WsEvents.METRICS_UPDATED, metrics);
    });
  }

  afterInit() {
    this.logger.log('✓ WebSocket Gateway inicializado con soporte Socket.io');
  }

  handleConnection(client: Socket) {
    this.logger.log(`[WS CONNECT] Cliente conectado: ${client.id}`);
    this.activeClients.set(client.id, {});
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WS DISCONNECT] Cliente desconectado: ${client.id}`);
    this.activeClients.delete(client.id);
  }

  /**
   * Suscribe al cliente a la sala de un vuelo específico y entrega el estado inicial completo.
   */
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @SubscribeMessage(WsEvents.JOIN_FLIGHT)
  async handleJoinFlight(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsJoinFlightDto,
  ) {
    const { flightId, userId } = data;
    const roomName = `flight_${flightId}`;

    client.join(roomName);
    this.activeClients.set(client.id, { userId, flightId });

    this.logger.log(`Cliente ${client.id} (user: ${userId}) se unió a sala ${roomName}`);

    const [flight, seats, metrics] = await Promise.all([
      this.flightService.getFlightById(flightId),
      this.flightService.getSeatsForFlight(flightId, userId),
      this.metricsService.getMetricsForFlight(flightId),
    ]);

    const initialState: FlightInitialStatePayload = {
      flight,
      seats,
      metrics,
      serverTime: Date.now(),
    };

    client.emit(WsEvents.FLIGHT_INITIAL_STATE, initialState);
  }

  /**
   * Desuscribe al cliente de la sala del vuelo.
   */
  @SubscribeMessage(WsEvents.LEAVE_FLIGHT)
  handleLeaveFlight(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveFlightPayload,
  ) {
    const roomName = `flight_${data.flightId}`;
    client.leave(roomName);
    this.logger.log(`Cliente ${client.id} abandonó sala ${roomName}`);
  }

  /**
   * Procesa la solicitud atómica de bloqueo temporal de un asiento (HU2).
   */
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @SubscribeMessage(WsEvents.SEAT_LOCK_REQUEST)
  async handleSeatLockRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSeatLockRequestDto,
  ) {
    const { flightId, seatId, userId, ttlSeconds } = data;
    const seatNumber = seatId;
    const ttl = ttlSeconds || 300;

    try {
      // 1. Ejecutar bloqueo atómico en SeatLockService con TTL en segundos (default 300s / 5 min)
      const lockResult = await this.seatLockService.acquireLock(
        flightId,
        seatId,
        seatNumber,
        userId,
        ttl,
      );

      const eventPayload: SeatLockedEventPayload = {
        flightId,
        seatId,
        seatNumber,
        lockedByUserId: userId,
        lockedUntil: lockResult.lockedUntil,
        remainingSeconds: lockResult.remainingSeconds,
      };

      // 2. Difundir a TODOS en la sala del vuelo
      this.server
        .to(`flight_${flightId}`)
        .emit(WsEvents.SEAT_LOCKED, eventPayload);

      // 3. Actualizar métricas del dashboard
      const metrics = await this.metricsService.notifyMetricsUpdated(flightId);
      this.server.to(`flight_${flightId}`).emit(WsEvents.METRICS_UPDATED, metrics);
      this.server.to('metrics_feed').emit(WsEvents.METRICS_UPDATED, metrics);
    } catch (err: any) {
      this.logger.warn(`Fallo al bloquear asiento ${seatId}: ${err.message}`);

      const failurePayload: SeatLockFailedEventPayload = {
        flightId,
        seatId,
        message: err.message || 'El asiento no está disponible.',
        currentStatus: SeatStatus.LOCKED,
      };

      client.emit(WsEvents.SEAT_LOCK_FAILED, failurePayload);
    }
  }

  /**
   * Procesa la solicitud de desbloqueo manual del asiento por el usuario.
   */
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @SubscribeMessage(WsEvents.SEAT_UNLOCK_REQUEST)
  async handleSeatUnlockRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSeatUnlockRequestDto,
  ) {
    const { flightId, seatId, userId } = data;
    await this.seatLockService.releaseLock(
      flightId,
      seatId,
      seatId,
      userId,
      'USER_UNLOCKED',
    );
  }

  /**
   * Suscribe a un cliente (Dashboard administrativo) al canal general de métricas en vivo (HU4).
   */
  @SubscribeMessage(WsEvents.SUBSCRIBE_METRICS)
  async handleSubscribeMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { flightId?: string },
  ) {
    client.join('metrics_feed');

    if (data?.flightId) {
      const metrics = await this.metricsService.getMetricsForFlight(data.flightId);
      client.emit(WsEvents.METRICS_UPDATED, metrics);
    }
  }
}
