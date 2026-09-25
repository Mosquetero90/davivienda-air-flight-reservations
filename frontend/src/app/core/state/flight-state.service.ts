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
  TripType,
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
  private getInitialPassengers(): number {
    try {
      const saved = sessionStorage.getItem('davivienda_passengers');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 1 && val <= 9) return val;
      }
    } catch {}
    return 1;
  }

  // Signals Principales
  public readonly flights = signal<Flight[]>([]);
  public readonly returnFlights = signal<Flight[]>([]);
  public readonly tripType = signal<TripType>('ROUND_TRIP');
  public readonly passengers = signal<number>(this.getInitialPassengers());

  public setPassengers(count: number) {
    const safe = Math.max(1, Math.min(9, count));
    this.passengers.set(safe);
    try {
      sessionStorage.setItem('davivienda_passengers', safe.toString());
    } catch {}
  }
  public readonly selectedFlight = signal<Flight | null>(null);
  public readonly selectedOutboundFlight = signal<Flight | null>(null);
  public readonly selectedReturnFlight = signal<Flight | null>(null);
  public readonly seats = signal<Seat[]>([]);
  public readonly myLockedSeats = signal<Seat[]>([]);
  public readonly myLockedSeat = computed(() => this.myLockedSeats()[0] ?? null);
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

      // Verificar si el usuario ya tenía asientos bloqueados previamente
      const currentUserId = this.userSession.currentUser().id;
      const mySeats = payload.seats.filter(
        (s) => s.status === SeatStatus.LOCKED && s.lockedByUserId === currentUserId,
      );
      this.myLockedSeats.set(mySeats);
      if (mySeats.length > 0) {
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
        const lockedSeat = this.seats().find((s) => s.seatNumber === payload.seatNumber);
        if (lockedSeat) {
          this.myLockedSeats.update((list) => {
            const idx = list.findIndex((s) => s.seatNumber === payload.seatNumber);
            if (idx >= 0) {
              const copy = [...list];
              copy[idx] = lockedSeat;
              return copy;
            }
            return [...list, lockedSeat];
          });
        }
        this.startLockCountdown(payload.remainingSeconds || 300);
        this.addNotification(
          `¡Asiento ${payload.seatNumber} bloqueado con éxito! (${this.myLockedSeats().length} de ${this.passengers()} seleccionados)`,
          'success',
        );
      } else {
        // Si fue bloqueado por otra persona y estaba en mi lista local, retirarlo
        this.myLockedSeats.update((list) => list.filter((s) => s.seatNumber !== payload.seatNumber));
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
      const wasMine = this.myLockedSeats().some((s) => s.seatNumber === payload.seatNumber);

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
        this.myLockedSeats.update((list) => list.filter((s) => s.seatNumber !== payload.seatNumber));
        if (this.myLockedSeats().length === 0) {
          this.stopLockCountdown();
        }

        if (payload.reason === 'EXPIRED') {
          this.addNotification(
            `El tiempo de 5 minutos para el asiento ${payload.seatNumber} expiró y ha sido liberado automáticamente.`,
            'warning',
          );
        } else if (payload.reason === 'USER_UNLOCKED') {
          this.addNotification(`Asiento ${payload.seatNumber} liberado.`, 'info');
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

      this.myLockedSeats.update((list) => list.filter((s) => s.seatNumber !== payload.seatNumber));
      if (this.myLockedSeats().length === 0) {
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

  // Cargar lista de vuelos desde API REST (con soporte de Ida y Vuelta)
  public loadFlights(filters?: {
    origin?: string;
    destination?: string;
    date?: string;
    returnDate?: string;
    passengers?: number;
    tripType?: TripType;
  }) {
    this.isLoading.set(true);

    if (filters?.tripType) {
      this.tripType.set(filters.tripType);
    }
    if (filters?.passengers) {
      this.setPassengers(filters.passengers);
    }

    // 1. Cargar vuelos de ida
    this.flightApi
      .getFlights({
        origin: filters?.origin,
        destination: filters?.destination,
        date: filters?.date,
        passengers: filters?.passengers ?? this.passengers(),
      })
      .subscribe({
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

    // 2. Si es viaje de Ida y Vuelta y se seleccionó origen/destino, cargar vuelos de regreso
    const isRound = filters?.tripType ? filters.tripType === 'ROUND_TRIP' : this.tripType() === 'ROUND_TRIP';
    if (isRound && filters?.origin && filters?.destination) {
      this.flightApi
        .getFlights({
          origin: filters.destination,
          destination: filters.origin,
          date: filters.returnDate,
          passengers: filters?.passengers ?? this.passengers(),
        })
        .subscribe({
          next: (returnData) => {
            this.returnFlights.set(returnData);
          },
          error: (err) => {
            console.error('Error al cargar vuelos de regreso:', err);
          },
        });
    } else {
      this.returnFlights.set([]);
    }
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

  // Solicitar bloqueo atómico de un asiento (HU2) respetando el número de pasajeros
  public requestSeatLock(seatNumber: string) {
    const flight = this.selectedFlight();
    if (!flight) return;

    const currentUserId = this.userSession.currentUser().id;
    const currentLocks = this.myLockedSeats();
    const maxAllowed = this.passengers();

    if (currentLocks.length >= maxAllowed) {
      this.addNotification(
        `Ya has seleccionado los ${maxAllowed} asientos permitidos para tus pasajeros. Deselecciona uno si deseas cambiarlo.`,
        'warning',
      );
      return;
    }

    this.socketService.requestSeatLock(flight.id, seatNumber, currentUserId);
  }

  // Liberar un asiento específico
  public releaseSeatLock(seatNumber: string) {
    const flight = this.selectedFlight();
    if (!flight) return;

    const currentUserId = this.userSession.currentUser().id;
    this.socketService.requestSeatUnlock(flight.id, seatNumber, currentUserId);
  }

  // Liberar todos los asientos actualmente bloqueados
  public releaseMySeatLock() {
    const flight = this.selectedFlight();
    const mySeats = this.myLockedSeats();
    if (!flight || mySeats.length === 0) return;

    const currentUserId = this.userSession.currentUser().id;
    for (const s of mySeats) {
      this.socketService.requestSeatUnlock(flight.id, s.seatNumber, currentUserId);
    }
  }

  // Confirmar compra y emitir boleto PNR para todos los pasajeros (HU3)
  public async confirmBooking(
    passenger: BookingPassengerDto,
    paymentMethod: 'DAVIPLATA' | 'CARD' | 'PSE',
  ): Promise<BookingResponseDto> {
    const flight = this.selectedFlight();
    const seats = this.myLockedSeats();

    if (!flight || seats.length === 0) {
      return Promise.reject(new Error('Debes tener al menos un asiento bloqueado para continuar'));
    }

    this.isLoading.set(true);
    try {
      let lastResponse: BookingResponseDto | null = null;
      let totalPaidSum = 0;

      for (const seat of seats) {
        const dto: CreateBookingDto = {
          flightId: flight.id,
          seatId: seat.seatNumber,
          userId: this.userSession.currentUser().id,
          passenger,
          payment: {
            method: paymentMethod as any,
          },
        };

        const res = await new Promise<BookingResponseDto>((resolve, reject) => {
          this.flightApi.createBooking(dto).subscribe({
            next: (data) => resolve(data),
            error: (err) => reject(err),
          });
        });

        lastResponse = res;
        totalPaidSum += res.totalPaid;
      }

      this.isLoading.set(false);
      this.myLockedSeats.set([]);
      this.stopLockCountdown();

      if (lastResponse) {
        const combinedResponse: BookingResponseDto = {
          ...lastResponse,
          seatNumber: seats.map((s) => s.seatNumber).join(', '),
          totalPaid: totalPaidSum,
        };
        this.lastBooking.set(combinedResponse);
        this.addNotification(
          `¡Compra Exitosa para ${seats.length} pasajero(s)! PNR: ${lastResponse.bookingReference}`,
          'success',
        );
        return combinedResponse;
      }

      throw new Error('No se pudo procesar la reserva.');
    } catch (err: any) {
      this.isLoading.set(false);
      const errorMsg = err.error?.message || 'Error al procesar el pago o la reserva expiró.';
      this.addNotification(errorMsg, 'error');
      throw new Error(errorMsg);
    }
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
