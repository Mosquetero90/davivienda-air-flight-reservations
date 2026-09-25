import { Component, OnInit, OnDestroy, inject, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { Seat, SeatClass, SeatStatus } from '@davivienda/shared';
import { FunnelStepperComponent } from '../../shared/components/funnel-stepper/funnel-stepper.component';

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule, RouterModule, FunnelStepperComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="min-h-screen bg-slate-100 pb-32">
      
      <!-- Stepper Global del Embudo de Reserva -->
      <app-funnel-stepper currentStep="seats" />

      <!-- Barra de Vuelo Sticky -->
      <section class="bg-white border-b border-slate-200 sticky top-28 z-20 shadow-xs py-3 px-4 sm:px-6 w-full">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div class="flex items-center gap-3">
            <a routerLink="/flights" class="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <div class="flex items-center gap-2">
                @if (isRoundTrip()) {
                  <span class="text-xs bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded-md uppercase">
                    {{ currentStep() === 'outbound' ? '1. Vuelo de Ida' : '2. Vuelo de Regreso' }}
                  </span>
                }
                <h1 class="text-lg sm:text-xl font-extrabold text-slate-900">
                  {{ flight()?.flightNumber ?? ('Vuelo ' + flightId()) }}
                </h1>
                <span class="text-xs bg-red-50 text-davivienda border border-red-100 font-bold px-2 py-0.5 rounded-full">
                  {{ flight()?.aircraftModel ?? 'Airbus A320neo' }}
                </span>
              </div>
              <p class="text-xs text-slate-500 font-medium flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5">
                <span class="font-bold text-slate-800">{{ formatCityRoute(flight()?.originCity, flight()?.originCode) }} &rarr; {{ formatCityRoute(flight()?.destinationCity, flight()?.destinationCode) }}</span>
                <span class="text-slate-300">&bull;</span>
                <span class="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                  📅 {{ flight()?.departureTime | date:'EEEE, d MMM yyyy' }}
                </span>
                <span class="text-slate-300">&bull;</span>
                <span class="text-slate-700 font-bold">
                  🕒 {{ flight()?.departureTime | date:'shortTime' }}
                </span>
              </p>
            </div>
          </div>

          <!-- Contador de Pasajeros y Leyenda -->
          <div class="flex items-center flex-wrap gap-2.5 sm:gap-4 text-xs font-semibold py-1">
            <div class="flex items-center gap-2 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-xs">
              <span class="text-slate-500">Pasajeros:</span>
              <button
                type="button"
                (click)="decreasePassengers()"
                [disabled]="passengers() <= 1"
                class="w-5 h-5 rounded-full bg-white border border-slate-300 hover:bg-slate-200 flex items-center justify-center font-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
              >
                -
              </button>
              <span class="font-extrabold text-sm w-4 text-center text-slate-900">{{ passengers() }}</span>
              <button
                type="button"
                (click)="increasePassengers()"
                [disabled]="passengers() >= 9"
                class="w-5 h-5 rounded-full bg-white border border-slate-300 hover:bg-slate-200 flex items-center justify-center font-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
              >
                +
              </button>
              <span class="text-davivienda font-black ml-1">({{ myLockedSeats().length }}/{{ passengers() }} seleccionados)</span>
            </div>

            <!-- Leyenda Visual -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-emerald-500 border border-emerald-600"></span>
              <span class="text-slate-600">Disponible</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-davivienda border border-red-700 animate-pulse"></span>
              <span class="text-slate-900 font-bold">Tu Asiento</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-amber-400 border border-amber-500"></span>
              <span class="text-slate-600">Bloqueado</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-slate-300 border border-slate-400"></span>
              <span class="text-slate-400">Ocupado</span>
            </div>
          </div>

        </div>
      </section>

      <!-- Fuselaje del Airbus A320neo -->
      <main class="max-w-3xl mx-auto px-4 mt-6">
        
        <!-- Trompa Aerodinámica -->
        <div class="relative mx-auto w-64 sm:w-80 h-24 bg-white border-t-8 border-x-4 border-slate-300 rounded-t-[100px] flex flex-col items-center justify-center shadow-inner">
          <div class="w-16 h-3 bg-slate-200 rounded-full mb-1"></div>
          <span class="text-[9px] font-black text-slate-400 tracking-widest uppercase">Cabina de Mando</span>
        </div>

        <!-- Contenedor del Cuerpo con Soporte Táctil Horizontal -->
        <div class="bg-white border-x-4 border-b-8 border-slate-300 rounded-b-[40px] p-4 sm:p-6 shadow-xl overflow-x-auto cabin-scrollbar">
          
          <!-- Banner de Cabina Ejecutiva (Filas 1-3) -->
          <div class="mb-4 bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between text-xs border border-amber-500/30 shadow-md min-w-[340px]">
            <div class="flex items-center gap-2">
              <span class="text-base">👑</span>
              <div>
                <p class="font-extrabold text-amber-400">Clase Ejecutiva Davivienda (Filas 01 - 03)</p>
                <p class="text-[10px] text-slate-300">Mayor reclinación, espacio adicional para piernas y catering incluido</p>
              </div>
            </div>
            <span class="text-[10px] uppercase font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">Premium</span>
          </div>

          <!-- Cabecera de Columnas: A B C | Pasillo | D E F -->
          <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-3 pb-2 border-b border-slate-100 min-w-[340px]">
            <div>A</div>
            <div>B</div>
            <div>C</div>
            <div class="text-[10px] uppercase text-slate-300">Pasillo</div>
            <div>D</div>
            <div>E</div>
            <div>F</div>
          </div>

          @if (isLoading()) {
            <div class="py-24 text-center">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-davivienda border-r-transparent"></div>
              <p class="text-xs font-semibold text-slate-500 mt-3">Sincronizando mapa de asientos con Redis y WebSockets...</p>
            </div>
          } @else {
            <div class="space-y-2 min-w-[340px]" role="region" aria-live="polite">
              @for (row of rows(); track row) {
                <div
                  class="grid grid-cols-7 gap-2 items-center relative py-1 px-1 rounded-xl transition-colors"
                  [ngClass]="{
                    'bg-slate-900/5 border border-slate-900/10': row <= 3,
                    'bg-amber-50 border border-amber-200': isExitRow(row),
                    'pb-3 border-b-2 border-dashed border-slate-200 mb-2': row === 3
                  }"
                >
                  <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'A') }"></ng-container>
                  <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'B') }"></ng-container>
                  <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'C') }"></ng-container>

                  <div class="flex items-center justify-center font-mono text-xs font-extrabold text-slate-400 select-none">
                    {{ row < 10 ? '0' + row : row }}
                  </div>

                  <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'D') }"></ng-container>
                  <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'E') }"></ng-container>
                  <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'F') }"></ng-container>
                </div>
              }
            </div>
          }

        </div>
      </main>

      <ng-template #seatBtn let-seat="seat">
        <div class="relative group">
          @if (seat) {
            <button
              type="button"
              (click)="onSeatClick(seat)"
              [disabled]="isSeatDisabled(seat)"
              [title]="getSeatTooltip(seat)"
              class="w-full aspect-square min-w-[38px] min-h-[38px] rounded-lg sm:rounded-xl font-mono text-[11px] sm:text-xs font-bold transition-all flex flex-col items-center justify-center relative border shadow-xs cursor-pointer"
              [ngClass]="getSeatClasses(seat)"
            >
              <span>{{ seat.column }}</span>
              @if (seat.seatClass === 'BUSINESS') {
                <span class="text-[8px] -mt-1 leading-none text-amber-900">👑</span>
              }
              @if (isLockedByOther(seat)) {
                <span class="text-[8px] -mt-1 leading-none text-amber-900">🔒</span>
              }
            </button>
          }
        </div>
      </ng-template>

      @if (myLockedSeats().length > 0) {
        <footer class="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-40 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div class="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div class="flex items-center gap-1.5 flex-wrap">
                @for (s of myLockedSeats(); track s.seatNumber) {
                  <div class="flex items-center gap-1.5 bg-davivienda text-white pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                    <span>{{ s.seatNumber }}</span>
                    <span class="text-[9px] bg-red-800/80 px-1 py-0.2 rounded font-normal uppercase">{{ s.seatClass }}</span>
                    <button
                      type="button"
                      (click)="onSeatClick(s)"
                      class="ml-0.5 hover:bg-white/20 rounded p-0.5 text-white/80 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                }
              </div>

              <div class="pl-2 border-l border-slate-200">
                <p class="text-xs font-bold text-slate-900">
                  {{ myLockedSeats().length }} de {{ passengers() }} pasajeros asignados
                </p>
                <p class="text-xs font-semibold text-slate-500">
                  Total: <span class="text-slate-900 font-black text-sm font-tabular">$ {{ totalSelectedPrice() | number }} COP</span>
                </p>
              </div>

              <div class="flex flex-col items-start pl-3 border-l border-slate-200">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tiempo Restante:</span>
                <span class="font-mono text-sm font-black text-davivienda animate-pulse font-tabular">
                  {{ formattedRemainingTime() }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                type="button"
                (click)="releaseAllSeats()"
                class="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Liberar Todo
              </button>

              @if (isRoundTrip() && currentStep() === 'outbound') {
                <button
                  type="button"
                  (click)="switchToReturn()"
                  [disabled]="myLockedSeats().length < passengers()"
                  class="px-5 py-2.5 rounded-xl bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{{ myLockedSeats().length < passengers() ? 'Faltan ' + (passengers() - myLockedSeats().length) + ' Asiento(s)' : 'Continuar a Asientos de Regreso' }}</span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              } @else {
                <button
                  type="button"
                  (click)="proceedToCheckout()"
                  [disabled]="myLockedSeats().length < passengers()"
                  class="px-5 py-2.5 rounded-xl bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{{ myLockedSeats().length < passengers() ? 'Faltan ' + (passengers() - myLockedSeats().length) + ' Asiento(s)' : 'Continuar al Pago' }}</span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              }
            </div>

          </div>
        </footer>
      }

    </div>
  `,
})
export class SeatMapComponent implements OnInit, OnDestroy {
  public readonly flightId = input.required<string>();
  public readonly passengersParam = input<string | number | undefined>(undefined, { alias: 'passengers' });
  public readonly roundTripParam = input<string | undefined>(undefined, { alias: 'roundTrip' });
  public readonly returnFlightIdParam = input<string | undefined>(undefined, { alias: 'returnFlightId' });

  public readonly state = inject(FlightStateService);
  private readonly flightApi = inject(FlightApiService);
  private readonly userSession = inject(UserSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public readonly isRoundTrip = computed(
    () => this.roundTripParam() === 'true' || this.state.tripType() === 'ROUND_TRIP',
  );
  public readonly returnFlightId = computed(
    () => this.returnFlightIdParam() || this.state.selectedReturnFlight()?.id || '',
  );
  public readonly currentStep = signal<'outbound' | 'return'>('outbound');
  public readonly outboundFlight = computed(() => this.state.selectedOutboundFlight());
  public readonly outboundSeatsCount = computed(() =>
    this.currentStep() === 'outbound'
      ? this.myLockedSeats().length
      : this.state.myLockedOutboundSeats().length,
  );
  public readonly returnSeatsCount = computed(() =>
    this.currentStep() === 'return'
      ? this.myLockedSeats().length
      : this.state.myLockedReturnSeats().length,
  );

  public readonly returnFlight = computed(() => this.state.selectedReturnFlight());

  public readonly flight = this.state.selectedFlight;
  public readonly seats = this.state.seats;
  public readonly myLockedSeats = this.state.myLockedSeats;
  public readonly passengers = this.state.passengers;
  public readonly lockSeconds = this.state.lockSecondsRemaining;
  public readonly isLoading = this.state.isLoading;

  public readonly totalSelectedPrice = computed(() =>
    this.myLockedSeats().reduce((sum, s) => sum + s.price, 0),
  );

  public readonly rows = computed(() => {
    const list: number[] = [];
    for (let r = 1; r <= 30; r++) list.push(r);
    return list;
  });

  public readonly formattedRemainingTime = computed(() => {
    const totalSecs = this.lockSeconds();
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  });

  ngOnInit() {
    const p = this.passengersParam();
    if (p !== undefined && p !== null) {
      const parsed = typeof p === 'string' ? parseInt(p, 10) : p;
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 9) {
        this.state.setPassengers(parsed);
      }
    }

    if (this.isRoundTrip()) {
      this.state.tripType.set('ROUND_TRIP');
      const retId = this.returnFlightId();
      if (retId && !this.state.selectedReturnFlight()) {
        this.flightApi.getFlightById(retId).subscribe({
          next: (fl) => this.state.selectedReturnFlight.set(fl),
        });
      }
      const outId = this.flightId();
      if (outId && !this.state.selectedOutboundFlight()) {
        this.flightApi.getFlightById(outId).subscribe({
          next: (fl) => this.state.selectedOutboundFlight.set(fl),
        });
      }
    }

    const id = this.flightId();
    if (id) {
      this.state.selectFlight(id);
    }
  }

  ngOnDestroy() {}

    public switchToOutbound() {
    if (this.currentStep() === 'return' && this.myLockedSeats().length > 0) {
      this.state.myLockedReturnSeats.set([...this.myLockedSeats()]);
    }
    const outId = this.flightId();
    this.currentStep.set('outbound');
    this.state.currentSeatStep.set('outbound');
    this.state.selectFlight(outId);
  }

  public switchToReturn() {
    if (this.myLockedSeats().length < this.passengers()) {
      this.state.addNotification(
        `Debes seleccionar ${this.passengers()} asiento(s) de ida antes de continuar.`,
        'warning',
      );
      return;
    }

    this.state.myLockedOutboundSeats.set([...this.myLockedSeats()]);
    const retId = this.returnFlightId();
    if (!retId) {
      this.state.addNotification('No se ha especificado un vuelo de regreso.', 'error');
      return;
    }

    this.currentStep.set('return');
    this.state.currentSeatStep.set('return');
    this.state.selectFlight(retId);
    this.state.addNotification(
      '✓ Asientos de ida guardados. Ahora selecciona los asientos para tu vuelo de regreso.',
      'info',
    );
  }

  public increasePassengers() {
    if (this.passengers() < 9) {
      const next = this.passengers() + 1;
      this.state.setPassengers(next);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { passengers: next },
        queryParamsHandling: 'merge',
      });
    }
  }

  public decreasePassengers() {
    if (this.passengers() > 1) {
      if (this.myLockedSeats().length >= this.passengers()) {
        this.state.addNotification('Deselecciona un asiento primero antes de reducir el número de pasajeros.', 'warning');
        return;
      }
      const next = this.passengers() - 1;
      this.state.setPassengers(next);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { passengers: next },
        queryParamsHandling: 'merge',
      });
    }
  }

  public formatCityRoute(city?: string, code?: string): string {
    if (!city) return code ?? '';
    if (code && city.includes(`(${code})`)) return city;
    return code ? `${city} (${code})` : city;
  }

  public getSeat(row: number, col: string): Seat | undefined {
    const rowStr = row < 10 ? `0${row}` : `${row}`;
    return this.seats().find((s) => s.seatNumber === `${rowStr}${col}`);
  }

  public isExitRow(row: number): boolean {
    return row === 11 || row === 12;
  }

  public isSeatMine(seat: Seat): boolean {
    const currentUserId = this.userSession.currentUser().id;
    return (
      (seat.status === SeatStatus.LOCKED && seat.lockedByUserId === currentUserId) ||
      this.myLockedSeats().some((s) => s.seatNumber === seat.seatNumber)
    );
  }

  public isLockedByOther(seat: Seat): boolean {
    return seat.status === SeatStatus.LOCKED && !this.isSeatMine(seat);
  }

  public isSeatDisabled(seat: Seat): boolean {
    return seat.status === SeatStatus.BOOKED || this.isLockedByOther(seat);
  }

  public getSeatClasses(seat: Seat): string {
    if (this.isSeatMine(seat)) {
      return 'bg-davivienda text-white border-red-700 shadow-md shadow-red-200 scale-105 z-10';
    }
    if (this.isLockedByOther(seat)) {
      return 'bg-amber-100 text-amber-900 border-amber-300 cursor-not-allowed opacity-90';
    }
    if (seat.status === SeatStatus.BOOKED) {
      return 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed';
    }
    if (seat.seatClass === SeatClass.BUSINESS) {
      return 'bg-slate-900 text-amber-400 border-amber-500/50 hover:bg-slate-800 hover:border-amber-400 hover:scale-105';
    }
    return 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 hover:scale-105';
  }

  public getSeatTooltip(seat: Seat): string {
    if (this.isSeatMine(seat)) return `Tu asiento: ${seat.seatNumber}`;
    if (this.isLockedByOther(seat)) return `Asiento ${seat.seatNumber} reservado temporalmente`;
    if (seat.status === SeatStatus.BOOKED) return `Asiento ${seat.seatNumber} ocupado / vendido`;
    return `Asiento ${seat.seatNumber} - $ ${seat.price} COP`;
  }

  public onSeatClick(seat: Seat) {
    if (this.isSeatDisabled(seat)) return;
    if (this.isSeatMine(seat)) {
      this.state.releaseSeatLock(seat.seatNumber);
      return;
    }
    if (seat.status === SeatStatus.AVAILABLE) {
      if (this.myLockedSeats().length >= this.passengers()) {
        this.state.addNotification(
          `Ya has seleccionado los ${this.passengers()} asientos para tus pasajeros. Puedes aumentar los pasajeros con el botón (+) superior.`,
          'warning',
        );
        return;
      }
      this.state.requestSeatLock(seat.seatNumber);
    }
  }

  public releaseAllSeats() {
    this.state.releaseMySeatLock();
  }

  public proceedToCheckout() {
    const flightId = this.flightId();
    if (this.isRoundTrip()) {
      this.state.myLockedReturnSeats.set([...this.myLockedSeats()]);
      this.router.navigate(['/flight', flightId, 'checkout'], {
        queryParams: {
          roundTrip: 'true',
          returnFlightId: this.returnFlightId(),
          passengers: this.passengers(),
        },
      });
    } else {
      this.router.navigate(['/flight', flightId, 'checkout'], {
        queryParams: { passengers: this.passengers() },
      });
    }
  }
}
