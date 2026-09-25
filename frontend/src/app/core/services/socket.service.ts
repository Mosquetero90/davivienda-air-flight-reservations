import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import {
  WsEvents,
  FlightInitialStatePayload,
  SeatLockedEventPayload,
  SeatLockFailedEventPayload,
  SeatReleasedEventPayload,
  SeatBookedEventPayload,
  FlightStatusUpdatedEventPayload,
  FlightMetrics,
} from '@davivienda/shared';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;
  public readonly isConnected = signal<boolean>(false);

  // Subjects reactivos de eventos entrantes
  private readonly initialStateSubject = new Subject<FlightInitialStatePayload>();
  private readonly seatLockedSubject = new Subject<SeatLockedEventPayload>();
  private readonly seatLockFailedSubject = new Subject<SeatLockFailedEventPayload>();
  private readonly seatReleasedSubject = new Subject<SeatReleasedEventPayload>();
  private readonly seatBookedSubject = new Subject<SeatBookedEventPayload>();
  private readonly flightStatusSubject = new Subject<FlightStatusUpdatedEventPayload>();
  private readonly metricsSubject = new Subject<FlightMetrics>();
  private readonly errorSubject = new Subject<string>();

  // Observables públicos
  public readonly initialState$: Observable<FlightInitialStatePayload> = this.initialStateSubject.asObservable();
  public readonly seatLocked$: Observable<SeatLockedEventPayload> = this.seatLockedSubject.asObservable();
  public readonly seatLockFailed$: Observable<SeatLockFailedEventPayload> = this.seatLockFailedSubject.asObservable();
  public readonly seatReleased$: Observable<SeatReleasedEventPayload> = this.seatReleasedSubject.asObservable();
  public readonly seatBooked$: Observable<SeatBookedEventPayload> = this.seatBookedSubject.asObservable();
  public readonly flightStatus$: Observable<FlightStatusUpdatedEventPayload> = this.flightStatusSubject.asObservable();
  public readonly metrics$: Observable<FlightMetrics> = this.metricsSubject.asObservable();
  public readonly error$: Observable<string> = this.errorSubject.asObservable();

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    const backendUrl =
      typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : '';

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected.set(true);
      console.log('✓ [SocketService] Conectado al gateway en tiempo real de Davivienda');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected.set(false);
      console.warn('⚠️ [SocketService] Desconectado del gateway:', reason);
    });

    // Mapeo de eventos entrantes del servidor
    this.socket.on(WsEvents.FLIGHT_INITIAL_STATE, (data: FlightInitialStatePayload) => {
      this.initialStateSubject.next(data);
    });

    this.socket.on(WsEvents.SEAT_LOCKED, (data: SeatLockedEventPayload) => {
      this.seatLockedSubject.next(data);
    });

    this.socket.on(WsEvents.SEAT_LOCK_FAILED, (data: SeatLockFailedEventPayload) => {
      this.seatLockFailedSubject.next(data);
    });

    this.socket.on(WsEvents.SEAT_RELEASED, (data: SeatReleasedEventPayload) => {
      this.seatReleasedSubject.next(data);
    });

    this.socket.on(WsEvents.SEAT_BOOKED, (data: SeatBookedEventPayload) => {
      this.seatBookedSubject.next(data);
    });

    this.socket.on(WsEvents.FLIGHT_STATUS_UPDATED, (data: FlightStatusUpdatedEventPayload) => {
      this.flightStatusSubject.next(data);
    });

    this.socket.on(WsEvents.METRICS_UPDATED, (data: FlightMetrics) => {
      this.metricsSubject.next(data);
    });

    this.socket.on(WsEvents.ERROR, (err: { message: string }) => {
      this.errorSubject.next(err.message || 'Error en comunicación en tiempo real');
    });
  }

  // Comandos salientes del cliente
  public joinFlight(flightId: string, userId: string) {
    if (this.socket?.connected) {
      this.socket.emit(WsEvents.JOIN_FLIGHT, { flightId, userId });
    }
  }

  public leaveFlight(flightId: string, userId: string) {
    if (this.socket?.connected) {
      this.socket.emit(WsEvents.LEAVE_FLIGHT, { flightId, userId });
    }
  }

  public requestSeatLock(flightId: string, seatId: string, userId: string) {
    if (this.socket?.connected) {
      this.socket.emit(WsEvents.SEAT_LOCK_REQUEST, { flightId, seatId, userId });
    }
  }

  public requestSeatUnlock(flightId: string, seatId: string, userId: string) {
    if (this.socket?.connected) {
      this.socket.emit(WsEvents.SEAT_UNLOCK_REQUEST, { flightId, seatId, userId });
    }
  }

  public subscribeMetrics(flightId: string) {
    if (this.socket?.connected) {
      this.socket.emit(WsEvents.SUBSCRIBE_METRICS, { flightId });
    }
  }
}
