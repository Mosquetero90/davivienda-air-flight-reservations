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

  // Signals de Paginación
  public readonly outboundPage = signal<number>(1);
  public readonly outboundTotal = signal<number>(0);
  public readonly outboundTotalPages = signal<number>(1);
  public readonly returnPage = signal<number>(1);
  public readonly returnTotal = signal<number>(0);
  public readonly returnTotalPages = signal<number>(1);
  public readonly pageSize = signal<number>(5);

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
  public readonly currentSeatStep = signal<'outbound' | 'return'>('outbound');
  public readonly seats = signal<Seat[]>([]);
  public readonly myLockedSeats = signal<Seat[]>([]);
  public readonly myLockedOutboundSeats = signal<Seat[]>([]);
  public readonly myLockedReturnSeats = signal<Seat[]>([]);
  public readonly myLockedSeat = computed(() => this.myLockedSeats()[0] ?? null);
  public readonly lockSecondsRemaining = signal<number>(0);
  public readonly metrics = signal<FlightMetrics | null>(null);
  public readonly lastBooking = signal<BookingResponseDto | null>(null);
  public readonly lastReturnBooking = signal<BookingResponseDto | null>(null);
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
      if (!this.selectedFlight() || this.selectedFlight()?.id === payload.flight?.id) {
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
      } else {
        // Si fue bloqueado por otra persona y estaba en mi lista local, retirarlo
        this.myLockedSeats.update((list) => list.filter((s) => s.seatNumber !== payload.seatNumber));
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
      if (this.selectedFlight()?.id === m.flightId) {
        this.metrics.set(m);
      }
    });

    // 8. Notificaciones de error genéricas
    this.socketService.error$.subscribe((msg) => {
      this.addNotification(msg, 'error');
    });
  }

  private lastFilters?: {
    origin?: string;
    destination?: string;
    date?: string;
    returnDate?: string;
    passengers?: number;
    tripType?: TripType;
  };

  // Cargar lista de vuelos desde API REST (con soporte de Ida y Vuelta y Paginación)
  public loadFlights(filters?: {
    origin?: string;
    destination?: string;
    date?: string;
    returnDate?: string;
    passengers?: number;
    tripType?: TripType;
    page?: number;
    returnPage?: number;
    limit?: number;
  }) {
    this.isLoading.set(true);

    if (filters) {
      this.lastFilters = {
        origin: filters.origin,
        destination: filters.destination,
        date: filters.date,
        returnDate: filters.returnDate,
        passengers: filters.passengers,
        tripType: filters.tripType,
      };
    }

    if (filters?.tripType) {
      this.tripType.set(filters.tripType);
    }
    if (filters?.passengers) {
      this.setPassengers(filters.passengers);
    }
    if (filters?.limit) {
      this.pageSize.set(filters.limit);
    }

    const outPage = filters?.page ?? 1;
    this.outboundPage.set(outPage);

    const retPage = filters?.returnPage ?? 1;
    this.returnPage.set(retPage);

    this.fetchOutbound(this.lastFilters, outPage);

    const isRound = (filters?.tripType ?? this.tripType()) === 'ROUND_TRIP';
    if (isRound) {
      this.fetchReturn(this.lastFilters, retPage);
    } else {
      this.returnFlights.set([]);
      this.returnTotal.set(0);
      this.returnTotalPages.set(1);
    }
  }

  private fetchOutbound(filters?: typeof this.lastFilters, page: number = 1) {
    this.flightApi
      .getFlights({
        origin: filters?.origin,
        destination: filters?.destination,
        date: filters?.date,
        passengers: filters?.passengers ?? this.passengers(),
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res: any) => {
          const items: Flight[] = Array.isArray(res) ? res : (res?.data || []);
          const total: number = Array.isArray(res) ? res.length : (res?.total ?? items.length);
          const totalPages: number = Array.isArray(res) ? 1 : (res?.totalPages ?? 1);
          const currentPage: number = Array.isArray(res) ? page : (res?.page ?? page);

          this.flights.set(items);
          this.outboundTotal.set(total);
          this.outboundTotalPages.set(Math.max(1, totalPages));
          this.outboundPage.set(currentPage);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.addNotification('Error al cargar vuelos disponibles.', 'error');
          console.error(err);
        },
      });
  }

  private fetchReturn(filters?: typeof this.lastFilters, page: number = 1) {
    const isRound = (filters?.tripType ?? this.tripType()) === 'ROUND_TRIP';
    if (!isRound) {
      this.returnFlights.set([]);
      this.returnTotal.set(0);
      this.returnTotalPages.set(1);
      return;
    }

    const params: any = {
      date: filters?.returnDate,
      passengers: filters?.passengers ?? this.passengers(),
      page,
      limit: this.pageSize(),
    };

    if (filters?.origin && filters?.destination) {
      params.origin = filters.destination;
      params.destination = filters.origin;
    }

    this.flightApi.getFlights(params).subscribe({
      next: (res: any) => {
        const items: Flight[] = Array.isArray(res) ? res : (res?.data || []);
        const total: number = Array.isArray(res) ? res.length : (res?.total ?? items.length);
        const totalPages: number = Array.isArray(res) ? 1 : (res?.totalPages ?? 1);
        const currentPage: number = Array.isArray(res) ? page : (res?.page ?? page);

        this.returnFlights.set(items);
        this.returnTotal.set(total);
        this.returnTotalPages.set(Math.max(1, totalPages));
        this.returnPage.set(currentPage);
      },
      error: (err) => {
        console.error('Error al cargar vuelos de regreso:', err);
      },
    });
  }

  public setOutboundPage(page: number) {
    if (page < 1 || (this.outboundTotalPages() > 0 && page > this.outboundTotalPages())) return;
    this.outboundPage.set(page);
    this.fetchOutbound(this.lastFilters, page);
  }

  public setReturnPage(page: number) {
    if (page < 1 || (this.returnTotalPages() > 0 && page > this.returnTotalPages())) return;
    this.returnPage.set(page);
    this.fetchReturn(this.lastFilters, page);
  }

  /**
   * Actualiza el tamaño de página (límite de resultados por página) y
   * reinicia la paginación a la página 1 para ida y regreso con recarga de datos.
   */
  public setPageSize(size: number): void {
    const validSize = Math.max(1, Math.min(50, size));
    if (validSize === this.pageSize()) return;

    this.pageSize.set(validSize);
    this.outboundPage.set(1);
    this.returnPage.set(1);

    this.fetchOutbound(this.lastFilters, 1);
    if (this.tripType() === 'ROUND_TRIP') {
      this.fetchReturn(this.lastFilters, 1);
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
    // Limpiar métricas del vuelo previo para evitar estados residuales
    this.metrics.set(null);

    // Carga inicial vía REST
    this.flightApi.getFlightById(flightId).subscribe({
      next: (flight) => {
        this.selectedFlight.set(flight);
        this.flightApi.getSeatsForFlight(flightId).subscribe({
          next: (seats) => {
            this.seats.set(seats);
            this.isLoading.set(false);

            // Obtener métricas iniciales del vuelo vía REST
            this.flightApi.getMetricsForFlight(flightId).subscribe({
              next: (m: FlightMetrics) => {
                if (this.selectedFlight()?.id === flightId) {
                  this.metrics.set(m);
                }
              },
              error: () => {
                // Silencioso: las métricas se computarán reactivamente o llegarán vía WebSocket
              },
            });

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

  // Confirmar compra y emitir boleto PNR para todos los pasajeros (HU3 con soporte de Ida y Vuelta)
  public async confirmBooking(
    passenger: BookingPassengerDto,
    paymentMethod: 'DAVIPLATA' | 'CARD' | 'PSE',
    paymentDetails?: { cardNumber?: string; expiryDate?: string; cvv?: string },
  ): Promise<BookingResponseDto> {
    const isRound = this.tripType() === 'ROUND_TRIP' && !!this.selectedReturnFlight();
    const outboundFlight = this.selectedOutboundFlight() || this.selectedFlight();
    const returnFlight = this.selectedReturnFlight();

    const outboundSeats = isRound && this.myLockedOutboundSeats().length > 0
      ? this.myLockedOutboundSeats()
      : this.myLockedSeats();
    const returnSeats = this.myLockedReturnSeats();

    if (!outboundFlight || outboundSeats.length === 0) {
      return Promise.reject(new Error('Debes tener al menos un asiento de ida seleccionado para continuar'));
    }

    if (isRound && (!returnFlight || returnSeats.length === 0)) {
      return Promise.reject(new Error('Debes tener los asientos del vuelo de regreso seleccionados para continuar'));
    }

    if (isRound && returnFlight) {
      const outTime = new Date(outboundFlight.arrivalTime || outboundFlight.departureTime).getTime();
      const retTime = new Date(returnFlight.departureTime).getTime();
      if (retTime <= outTime) {
        return Promise.reject(
          new Error('El vuelo de regreso no puede despegar antes de la llegada de tu vuelo de ida.'),
        );
      }
    }

    this.isLoading.set(true);
    try {
      let lastOutboundResponse: BookingResponseDto | null = null;
      let totalOutboundPaid = 0;

      // 1. Confirmar asientos del Vuelo de Ida
      for (const seat of outboundSeats) {
        const dto: CreateBookingDto = {
          flightId: outboundFlight.id,
          seatId: seat.seatNumber,
          userId: this.userSession.currentUser().id,
          passenger,
          payment: {
            method: paymentMethod as any,
            ...(paymentDetails?.cardNumber ? { cardNumber: paymentDetails.cardNumber.replace(/\s/g, '') } : {}),
            ...(paymentDetails?.expiryDate ? { expiryDate: paymentDetails.expiryDate } : {}),
            ...(paymentDetails?.cvv ? { cvv: paymentDetails.cvv } : {}),
          },
        };

        const res = await new Promise<BookingResponseDto>((resolve, reject) => {
          this.flightApi.createBooking(dto).subscribe({
            next: (data) => resolve(data),
            error: (err) => reject(err),
          });
        });

        lastOutboundResponse = res;
        totalOutboundPaid += res.totalPaid;
      }

      // 2. Si es viaje de Ida y Vuelta, confirmar asientos del Vuelo de Regreso
      let lastReturnResponse: BookingResponseDto | null = null;
      let totalReturnPaid = 0;
      if (isRound && returnFlight && returnSeats.length > 0) {
        for (const seat of returnSeats) {
          const dto: CreateBookingDto = {
            flightId: returnFlight.id,
            seatId: seat.seatNumber,
            userId: this.userSession.currentUser().id,
            passenger,
            payment: {
              method: paymentMethod as any,
              ...(paymentDetails?.cardNumber ? { cardNumber: paymentDetails.cardNumber.replace(/\s/g, '') } : {}),
              ...(paymentDetails?.expiryDate ? { expiryDate: paymentDetails.expiryDate } : {}),
              ...(paymentDetails?.cvv ? { cvv: paymentDetails.cvv } : {}),
            },
          };

          const res = await new Promise<BookingResponseDto>((resolve, reject) => {
            this.flightApi.createBooking(dto).subscribe({
              next: (data) => resolve(data),
              error: (err) => reject(err),
            });
          });

          lastReturnResponse = res;
          totalReturnPaid += res.totalPaid;
        }
      }

      this.isLoading.set(false);
      this.myLockedSeats.set([]);
      this.myLockedOutboundSeats.set([]);
      this.myLockedReturnSeats.set([]);
      this.stopLockCountdown();

      if (lastOutboundResponse) {
        const combinedOutbound: BookingResponseDto = {
          ...lastOutboundResponse,
          seatNumber: outboundSeats.map((s) => s.seatNumber).join(', '),
          totalPaid: totalOutboundPaid,
        };
        this.lastBooking.set(combinedOutbound);

        if (lastReturnResponse && returnFlight) {
          const combinedReturn: BookingResponseDto = {
            ...lastReturnResponse,
            seatNumber: returnSeats.map((s) => s.seatNumber).join(', '),
            totalPaid: totalReturnPaid,
          };
          this.lastReturnBooking.set(combinedReturn);
        }

        const msg = isRound
          ? `¡Compra Exitosa de Ida y Vuelta! PNR Ida: ${lastOutboundResponse.bookingReference} | PNR Regreso: ${lastReturnResponse?.bookingReference || 'N/A'}`
          : `¡Compra Exitosa para ${outboundSeats.length} pasajero(s)! PNR: ${lastOutboundResponse.bookingReference}`;
        this.addNotification(msg, 'success');

        return combinedOutbound;
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
