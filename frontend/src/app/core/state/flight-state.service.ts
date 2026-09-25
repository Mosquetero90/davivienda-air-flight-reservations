import { Injectable, computed, effect, signal } from '@angular/core';
import {
  Flight,
  Seat,
  SeatStatus,
  FlightMetrics,
  FlightStatus,
  BookingResponseDto,
  CreateBookingDto,
  BookingPassengerDto,
} from '@davivienda/shared';
import { FlightApiService } from '../services/flight-api.service';
import { SocketService } from '../services/socket.service';
import { UserSessionService } from '../services/user-session.service';

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class FlightStateService {
  // Signals Principales
  public readonly flights = signal<Flight[]>([]);
  public readonly selectedFlight = signal<Flight | null>(null);
  public readonly seats = signal<Seat[]>([]);
  public readonly myLockedSeat = signal<Seat | null>(null);
  public readonly lockSecondsRemaining = signal<number>(0);
  public readonly metrics = signal<FlightMetrics | null>(null);
  public readonly lastBooking = signal<BookingResponseDto | null>(null);
  public readonly isLoading = signal<boolean>(false);
  public readonly notifications = signal<AppNotification[]>([]);

  // Computed Signals para reactividad fina sin re-cálculos costosos
  public readonly totalSeatsCount = computed(() => this.seats().length);

  public readonly availableSeatsCount = computed(
    () => this.seats().filter((s) => s.status === SeatStatus.AVAILABLE).length,
  );

  public readonly lockedSeatsCount = computed(
    () => this.seats().filter((s) => s.status === SeatStatus.LOCKED).length,
  );

  public readonly bookedSeatsCount = computed(
    () => this.seats().filter((s) => s.status === SeatStatus.BOOKED).length,
  );

  public readonly occupancyPercentage = computed(() => {
    const total = this.totalSeatsCount();
    if (total === 0) return 0;
    const booked = this.bookedSeatsCount();
    return Math.round((booked / total) * 100);
  });

  // Temporizador regresivo en cliente para el TTL de 5 minutos
  private timerInterval: any = null;

  constructor(
    private readonly flightApi: FlightApiService,
    private readonly socketService: SocketService,
    private readonly userSession: UserSessionService,
  ) {
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // 1. Estado inicial completo de la cabina enviado por el servidor al unirse a la sala
    this.socketService.initialState$.subscribe((payload) => {
      this.selectedFlight.set(payload.flight);
      this.seats.set(payload.seats);
      this.metrics.set(payload.metrics);

      // Verificar si el usuario ya tenía un asiento bloqueado previamente
      const currentUserId = this.userSession.currentUser().id;
      const mySeat = payload.seats.find(
        (s) => s.status === SeatStatus.LOCKED && s.lockedByUserId === currentUserId,
      );
      if (mySeat) {
        this.myLockedSeat.set(mySeat);
        // Iniciar timer si tiene tiempo
        this.startLockCountdown(300);
      }
    });

    // 2. Un asiento fue bloqueado en tiempo real (por mí o por otro usuario)
    this.socketService.seatLocked$.subscribe((payload) => {
      const currentUserId = this.userSession.currentUser().id;
      const isMine = payload.lockedByUserId === currentUserId;

      // Actualizar la lista inmutable de asientos
      this.seats.update((currentSeats) =>
        currentSeats.map((s) => {
          if (s.seatNumber === payload.seatNumber) {
            return {
              ...s,
              status: SeatStatus.LOCKED,
              lockedByUserId: payload.lockedByUserId,
              lockedUntil: payload.lockedUntil,
            };
          }
          return s;
        }),
      );

      if (isMine) {
        const lockedSeat = this.seats().find((s) => s.seatNumber === payload.seatNumber) || null;
        this.myLockedSeat.set(lockedSeat);
        this.startLockCountdown(payload.remainingSeconds || 300);
        this.addNotification(
          `¡Asiento ${payload.seatNumber} bloqueado con éxito! Tienes 5 minutos para completar el pago.`,
          'success',
        );
      } else {
        // Bloqueado por otra persona
        if (this.selectedFlight()?.id === payload.flightId) {
          this.addNotification(
            `Asiento ${payload.seatNumber} acaba de ser reservado temporalmente por otro usuario.`,
            'info',
          );
        }
      }
    });

    // 3. Fallo al intentar bloquear un asiento (Concurrencia / Doble Reserva prevenido)
    this.socketService.seatLockFailed$.subscribe((payload) => {
      this.addNotification(
        `No fue posible reservar el asiento ${payload.seatId}: ${payload.message}`,
        'warning',
      );
    });

    // 4. Un asiento fue liberado (por timeout TTL, cancelación o compra completada)
    this.socketService.seatReleased$.subscribe((payload) => {
      const currentMySeat = this.myLockedSeat();
      const wasMine = currentMySeat?.seatNumber === payload.seatNumber;

      this.seats.update((currentSeats) =>
        currentSeats.map((s) => {
          if (s.seatNumber === payload.seatNumber) {
            return {
              ...s,
              status: SeatStatus.AVAILABLE,
              lockedByUserId: undefined,
              lockedUntil: undefined,
            };
          }
          return s;
        }),
      );

      if (wasMine) {
        this.myLockedSeat.set(null);
        this.stopLockCountdown();

        if (payload.reason === 'EXPIRED') {
          this.addNotification(
            `El tiempo de 5 minutos para el asiento ${payload.seatNumber} expiró y ha sido liberado automáticamente.`,
            'warning',
          );
        } else if (payload.reason === 'USER_UNLOCKED') {
          this.addNotification(`Asiento ${payload.seatNumber} liberado voluntariamente.`, 'info');
        }
      }
    });

    // 5. Un asiento fue comprado definitivamente y pasó a BOOKED en PostgreSQL
    this.socketService.seatBooked$.subscribe((payload) => {
      this.seats.update((currentSeats) =>
        currentSeats.map((s) => {
          if (s.seatNumber === payload.seatNumber) {
            return {
              ...s,
              status: SeatStatus.BOOKED,
              bookingReference: payload.bookingReference,
              lockedByUserId: undefined,
            };
          }
          return s;
        }),
      );

      if (this.myLockedSeat()?.seatNumber === payload.seatNumber) {
        this.myLockedSeat.set(null);
        this.stopLockCountdown();
      }
    });

    // 6. Cambio de estado operativo del vuelo en tiempo real (HU1)
    this.socketService.flightStatus$.subscribe((payload) => {
      this.flights.update((fls) =>
        fls.map((f) => {
          if (f.id === payload.flightId) {
            return { ...f, status: payload.newStatus };
          }
          return f;
        }),
      );

      if (this.selectedFlight()?.id === payload.flightId) {
        this.selectedFlight.update((f) => (f ? { ...f, status: payload.newStatus } : null));
        this.addNotification(
          `Vuelo ${payload.flightId} cambió su estado operativo a: ${payload.newStatus}`,
          'info',
        );
      }
    });

    // 7. Métricas en vivo (HU4)
    this.socketService.metrics$.subscribe((m) => {
      this.metrics.set(m);
    });

    // 8. Notificaciones de error genéricas
    this.socketService.error$.subscribe((msg) => {
      this.addNotification(msg, 'error');
    });
  }

  // Cargar lista de vuelos desde API REST
  public loadFlights(filters?: { origin?: string; destination?: string; date?: string }) {
    this.isLoading.set(true);
    this.flightApi.getFlights(filters).subscribe({
      next: (data) => {
        this.flights.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.addNotification('Error al cargar vuelos disponibles.', 'error');
        console.error(err);
      },
    });
  }

  // Seleccionar un vuelo y suscribirse a su sala WebSockets en tiempo real
  public selectFlight(flightId: string) {
    const prevFlight = this.selectedFlight();
    const currentUserId = this.userSession.currentUser().id;

    if (prevFlight) {
      this.socketService.leaveFlight(prevFlight.id, currentUserId);
    }

    this.isLoading.set(true);
    // Carga inicial vía REST
    this.flightApi.getFlightById(flightId).subscribe({
      next: (flight) => {
        this.selectedFlight.set(flight);
        this.flightApi.getSeatsForFlight(flightId).subscribe({
          next: (seats) => {
            this.seats.set(seats);
            this.isLoading.set(false);

            // Unirse a la sala Socket.io para recibir eventos en vivo
            this.socketService.joinFlight(flightId, currentUserId);
            this.socketService.subscribeMetrics(flightId);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.addNotification('Error al cargar la matriz de asientos de cabina.', 'error');
          },
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.addNotification('Error al consultar el vuelo.', 'error');
      },
    });
  }

  // Solicitar bloqueo atómico de un asiento (HU2)
  public requestSeatLock(seatNumber: string) {
    const flight = this.selectedFlight();
    if (!flight) return;

    const currentUserId = this.userSession.currentUser().id;

    // Si ya tengo otro asiento bloqueado, liberarlo primero
    const currentLock = this.myLockedSeat();
    if (currentLock && currentLock.seatNumber !== seatNumber) {
      this.socketService.requestSeatUnlock(flight.id, currentLock.seatNumber, currentUserId);
    }

    this.socketService.requestSeatLock(flight.id, seatNumber, currentUserId);
  }

  // Liberar el asiento actualmente bloqueado
  public releaseMySeatLock() {
    const flight = this.selectedFlight();
    const mySeat = this.myLockedSeat();
    if (!flight || !mySeat) return;

    const currentUserId = this.userSession.currentUser().id;
    this.socketService.requestSeatUnlock(flight.id, mySeat.seatNumber, currentUserId);
  }

  // Confirmar compra y emitir boleto PNR (HU3)
  public confirmBooking(
    passenger: BookingPassengerDto,
    paymentMethod: 'DAVIPLATA' | 'CARD' | 'PSE',
  ): Promise<BookingResponseDto> {
    const flight = this.selectedFlight();
    const seat = this.myLockedSeat();

    if (!flight || !seat) {
      return Promise.reject(new Error('Debes tener un asiento bloqueado para continuar'));
    }

    const dto: CreateBookingDto = {
      flightId: flight.id,
      seatId: seat.seatNumber,
      userId: this.userSession.currentUser().id,
      passenger,
      payment: {
        method: paymentMethod as any,
      },
    };

    this.isLoading.set(true);
    return new Promise((resolve, reject) => {
      this.flightApi.createBooking(dto).subscribe({
        next: (bookingResponse) => {
          this.isLoading.set(false);
          this.lastBooking.set(bookingResponse);
          this.myLockedSeat.set(null);
          this.stopLockCountdown();
          this.addNotification(
            `¡Compra Exitosa! PNR emitido: ${bookingResponse.bookingReference}`,
            'success',
          );
          resolve(bookingResponse);
        },
        error: (err) => {
          this.isLoading.set(false);
          const errorMsg =
            err.error?.message || 'Error al procesar el pago o la reserva expiró.';
          this.addNotification(errorMsg, 'error');
          reject(new Error(errorMsg));
        },
      });
    });
  }

  // Métodos auxiliares de countdown timer
  private startLockCountdown(seconds: number) {
    this.stopLockCountdown();
    this.lockSecondsRemaining.set(seconds);

    this.timerInterval = setInterval(() => {
      const remaining = this.lockSecondsRemaining() - 1;
      if (remaining <= 0) {
        this.stopLockCountdown();
        this.lockSecondsRemaining.set(0);
        // Notificar al usuario
        this.addNotification(
          'Tu tiempo de reserva de 5 minutos ha expirado. El asiento ha sido liberado.',
          'warning',
        );
      } else {
        this.lockSecondsRemaining.set(remaining);
      }
    }, 1000);
  }

  private stopLockCountdown() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.lockSecondsRemaining.set(0);
  }

  public addNotification(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') {
    const notif: AppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: Date.now(),
    };

    this.notifications.update((list) => [notif, ...list.slice(0, 4)]);

    // Auto-eliminar a los 5 segundos
    setTimeout(() => {
      this.notifications.update((list) => list.filter((n) => n.id !== notif.id));
    }, 5000);
  }

  public dismissNotification(id: string) {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }
}
