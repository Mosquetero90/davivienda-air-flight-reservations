import { Component, OnInit, OnDestroy, inject, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { Seat, SeatClass, SeatStatus } from '@davivienda/shared';

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule, RouterModule],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="min-h-screen bg-slate-100 pb-32">
      
      <!-- Top Flight Header Bar -->
      <section class="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-sm py-3 px-4 sm:px-6 lg:px-8 w-full">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div class="flex items-center gap-3">
            <a routerLink="/flights" class="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <div class="flex items-center gap-2">
                <span *ngIf="isRoundTrip()" class="text-xs bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded-md uppercase">
                  {{ currentStep() === 'outbound' ? '1. Vuelo de Ida' : '2. Vuelo de Regreso' }}
                </span>
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
                <span class="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                  📅 {{ flight()?.departureTime | date:'EEEE, d MMM yyyy' }}
                </span>
                <span class="text-slate-300">&bull;</span>
                <span class="text-slate-700 font-bold inline-flex items-center gap-1">
                  🕒 {{ flight()?.departureTime | date:'shortTime' }}
                </span>
              </p>
            </div>
          </div>

          <!-- Real-Time Legend, Concurrency Status & Passenger Stepper -->
          <div class="flex items-center flex-wrap gap-2.5 sm:gap-4 text-xs font-semibold py-1">
            <!-- Interactive Passenger Stepper -->
            <div class="flex items-center gap-2 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-xs">
              <span class="text-slate-500">Pasajeros:</span>
              <button
                type="button"
                (click)="decreasePassengers()"
                [disabled]="passengers() <= 1"
                title="Disminuir pasajeros"
                class="w-5 h-5 rounded-full bg-white border border-slate-300 hover:bg-slate-200 flex items-center justify-center font-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
              >
                -
              </button>
              <span class="font-extrabold text-sm w-4 text-center text-slate-900">{{ passengers() }}</span>
              <button
                type="button"
                (click)="increasePassengers()"
                [disabled]="passengers() >= 9"
                title="Aumentar pasajeros"
                class="w-5 h-5 rounded-full bg-white border border-slate-300 hover:bg-slate-200 flex items-center justify-center font-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
              >
                +
              </button>
              <span class="text-davivienda font-black ml-1">({{ myLockedSeats().length }}/{{ passengers() }} seleccionados)</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-emerald-500 border border-emerald-600"></span>
              <span class="text-slate-600">Disponible</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-davivienda border border-red-700 animate-pulse"></span>
              <span class="text-slate-900 font-bold">Tu Selección</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-amber-400 border border-amber-500"></span>
              <span class="text-slate-600">Reservado temporalmente</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded bg-slate-300 border border-slate-400"></span>
              <span class="text-slate-400">Ocupado / Vendido</span>
            </div>
          </div>

        </div>
      </section>

      <!-- Round Trip Step Navigator Bar (when in round-trip mode) -->
      <section *ngIf="isRoundTrip()" class="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-2 sticky top-[73px] z-30 shadow-xs">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              (click)="switchToOutbound()"
              class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              [ngClass]="currentStep() === 'outbound' ? 'bg-davivienda text-white' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" [ngClass]="currentStep() === 'outbound' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'">1</span>
              <span>1. Asientos Ida ({{ outboundFlight()?.flightNumber || flightId() }} &bull; {{ outboundFlight()?.departureTime | date:'d MMM' }})</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold" [ngClass]="currentStep() === 'outbound' ? 'bg-white/20 text-white' : (outboundSeatsCount() === passengers() ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700')">
                {{ outboundSeatsCount() }}/{{ passengers() }}
              </span>
            </button>

            <span class="text-slate-400 font-bold">➔</span>

            <button
              type="button"
              (click)="switchToReturn()"
              [disabled]="outboundSeatsCount() < passengers()"
              class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              [ngClass]="currentStep() === 'return' ? 'bg-davivienda text-white' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" [ngClass]="currentStep() === 'return' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'">2</span>
              <span>2. Asientos Regreso ({{ returnFlight()?.flightNumber || returnFlightId() }} &bull; {{ returnFlight()?.departureTime | date:'d MMM' }})</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold" [ngClass]="currentStep() === 'return' ? 'bg-white/20 text-white' : (returnSeatsCount() === passengers() ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700')">
                {{ returnSeatsCount() }}/{{ passengers() }}
              </span>
            </button>
          </div>

          <div class="text-xs font-semibold">
            <span *ngIf="currentStep() === 'outbound'" class="text-davivienda font-bold">
              👉 Paso 1: Selecciona {{ passengers() }} asiento(s) para la ida ({{ flight()?.originCode }} ➔ {{ flight()?.destinationCode }} &bull; {{ flight()?.departureTime | date:'EEE, d MMM' }})
            </span>
            <span *ngIf="currentStep() === 'return'" class="text-davivienda font-bold">
              👉 Paso 2: Selecciona {{ passengers() }} asiento(s) para el regreso ({{ flight()?.originCode }} ➔ {{ flight()?.destinationCode }} &bull; {{ flight()?.departureTime | date:'EEE, d MMM' }})
            </span>
          </div>
        </div>
      </section>

      <!-- Main Cabin Plane View -->
      <main class="max-w-3xl mx-auto px-4 mt-8">
        
        <!-- Airplane Nose Curve -->
        <div class="relative mx-auto w-72 sm:w-80 h-28 bg-white border-t-8 border-x-4 border-slate-300 rounded-t-[100px] flex flex-col items-center justify-center shadow-inner">
          <div class="w-16 h-4 bg-slate-200 rounded-full mb-1"></div>
          <div class="flex gap-2">
            <div class="w-6 h-3 bg-sky-200 border border-sky-400 rounded-sm"></div>
            <div class="w-6 h-3 bg-sky-200 border border-sky-400 rounded-sm"></div>
          </div>
          <span class="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-2">Cabina de Mando</span>
        </div>

        <!-- Cabin Fuselage Body -->
        <div class="bg-white border-x-4 border-b-8 border-slate-300 rounded-b-[40px] p-4 sm:p-8 shadow-xl">
          
          <!-- Column Headers: A B C | Pasillo | D E F -->
          <div class="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-400 mb-4 pb-2 border-b border-slate-100">
            <div>A</div>
            <div>B</div>
            <div>C</div>
            <div class="text-[10px] uppercase tracking-wider text-slate-300">Pasillo</div>
            <div>D</div>
            <div>E</div>
            <div>F</div>
          </div>

          <!-- Loading state -->
          <div *ngIf="isLoading()" class="py-24 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-davivienda border-r-transparent"></div>
            <p class="text-xs font-semibold text-slate-500 mt-3">Sincronizando mapa de asientos con Redis y PostgreSQL...</p>
          </div>

          <!-- Cabin Rows Container (1 to 30) -->
          <div *ngIf="!isLoading()" class="space-y-2">
            
            <div
              *ngFor="let row of rows()"
              class="grid grid-cols-7 gap-1.5 sm:gap-2 items-center relative"
              [ngClass]="{
                'py-2 bg-amber-50/50 rounded-xl px-1 border border-amber-200/50 my-3': isExitRow(row),
                'pb-2 border-b border-dashed border-slate-200': row === 3
              }"
            >
              <!-- Row Badge (Exit Row Indicator) -->
              <span *ngIf="isExitRow(row)" class="absolute -left-2 sm:-left-6 text-[9px] font-black text-amber-700 uppercase -rotate-90">
                Salida
              </span>

              <!-- Column A -->
              <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'A') }"></ng-container>
              <!-- Column B -->
              <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'B') }"></ng-container>
              <!-- Column C -->
              <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'C') }"></ng-container>

              <!-- Aisle (Fila Number) -->
              <div class="flex items-center justify-center font-mono text-[11px] font-bold text-slate-400 select-none">
                {{ row < 10 ? '0' + row : row }}
              </div>

              <!-- Column D -->
              <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'D') }"></ng-container>
              <!-- Column E -->
              <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'E') }"></ng-container>
              <!-- Column F -->
              <ng-container *ngTemplateOutlet="seatBtn; context: { seat: getSeat(row, 'F') }"></ng-container>
            </div>

          </div>

          <!-- Airplane Wings Wingtips visual accents -->
          <div class="mt-8 pt-4 border-t border-slate-100 flex justify-between text-[11px] text-slate-400 font-semibold px-2">
            <span>Airbus A320neo &bull; 180 Asientos</span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Sincronizado atómicamente con Redis
            </span>
          </div>

        </div>

      </main>

      <!-- Seat Button Reusable Template -->
      <ng-template #seatBtn let-seat="seat">
        <div class="relative group">
          <button
            *ngIf="seat"
            (click)="onSeatClick(seat)"
            [disabled]="isSeatDisabled(seat)"
            [title]="getSeatTooltip(seat)"
            class="w-full aspect-square rounded-lg sm:rounded-xl font-mono text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center justify-center relative border shadow-xs"
            [ngClass]="getSeatClasses(seat)"
          >
            <span>{{ seat.column }}</span>

            <!-- Business Crown / Icon -->
            <span *ngIf="seat.seatClass === 'BUSINESS'" class="text-[8px] -mt-1 leading-none text-amber-900">👑</span>
            
            <!-- Lock indicator icon for seats locked by other users -->
            <span *ngIf="isLockedByOther(seat)" class="text-[8px] -mt-1 leading-none text-amber-900">🔒</span>
          </button>

          <!-- Hover Tooltip -->
          <div *ngIf="seat" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
            <div class="bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
              <p class="font-bold">Asiento {{ seat.seatNumber }} &bull; {{ seat.seatClass }}</p>
              <p class="text-slate-300">$ {{ seat.price | number }} COP</p>
              <p *ngIf="isSeatMine(seat)" class="text-emerald-400 font-bold">¡Tu asiento reservado!</p>
              <p *ngIf="isLockedByOther(seat)" class="text-amber-400 font-bold">Asiento reservado temporalmente</p>
              <p *ngIf="seat.status === 'BOOKED'" class="text-slate-400 font-bold">Ocupado / Vendido</p>
            </div>
          </div>
        </div>
      </ng-template>

      <!-- Bottom Sticky Checkout Action Bar -->
      <footer
        *ngIf="myLockedSeats().length > 0"
        class="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-40 shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        <div class="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <!-- Seat Details & Countdown -->
          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <!-- Seat Badges -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <div
                *ngFor="let s of myLockedSeats()"
                class="flex items-center gap-1.5 bg-davivienda text-white pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold shadow-sm"
              >
                <span>{{ s.seatNumber }}</span>
                <span class="text-[9px] bg-red-800/80 px-1 py-0.2 rounded font-normal uppercase">{{ s.seatClass }}</span>
                <button
                  type="button"
                  (click)="onSeatClick(s)"
                  title="Deseleccionar asiento"
                  class="ml-0.5 hover:bg-white/20 rounded p-0.5 text-white/80 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="pl-2 border-l border-slate-200">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-900">
                  {{ myLockedSeats().length }} de {{ passengers() }} pasajeros asignados
                </span>
                <span
                  *ngIf="myLockedSeats().length === passengers()"
                  class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full"
                >
                  ¡Completo!
                </span>
              </div>
              <p class="text-xs font-semibold text-slate-500">
                Total: <span class="text-slate-900 font-black text-sm">$ {{ totalSelectedPrice() | number }} COP</span>
              </p>
            </div>

            <!-- 5-min TTL Countdown indicator -->
            <div class="flex flex-col items-start pl-3 border-l border-slate-200">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tiempo Restante:</span>
              <span class="font-mono text-sm font-black text-davivienda animate-pulse">
                {{ formattedRemainingTime() }}
              </span>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              (click)="releaseAllSeats()"
              class="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Liberar Todo
            </button>

            <!-- Case 1: Round-Trip & Step 1 (Outbound) -->
            <button
              *ngIf="isRoundTrip() && currentStep() === 'outbound'"
              (click)="switchToReturn()"
              [disabled]="myLockedSeats().length < passengers()"
              class="px-5 py-2.5 rounded-xl bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{{ myLockedSeats().length < passengers() ? 'Faltan ' + (passengers() - myLockedSeats().length) + ' Asiento(s) de Ida' : 'Continuar a Asientos de Regreso' }}</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <!-- Case 2: Round-Trip & Step 2 (Return) -->
            <button
              *ngIf="isRoundTrip() && currentStep() === 'return'"
              (click)="proceedToCheckout()"
              [disabled]="myLockedSeats().length < passengers()"
              class="px-5 py-2.5 rounded-xl bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{{ myLockedSeats().length < passengers() ? 'Faltan ' + (passengers() - myLockedSeats().length) + ' Asiento(s) de Regreso' : 'Continuar al Pago (Ida y Regreso)' }}</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <!-- Case 3: One-Way -->
            <button
              *ngIf="!isRoundTrip()"
              (click)="proceedToCheckout()"
              [disabled]="myLockedSeats().length < passengers()"
              class="px-5 py-2.5 rounded-xl bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{{ myLockedSeats().length < passengers() ? 'Faltan ' + (passengers() - myLockedSeats().length) + ' Asiento(s)' : 'Continuar al Pago' }}</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

        </div>
      </footer>

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
  public readonly returnFlight = computed(() => this.state.selectedReturnFlight());

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

  public readonly flight = this.state.selectedFlight;
  public readonly seats = this.state.seats;
  public readonly myLockedSeats = this.state.myLockedSeats;
  public readonly passengers = this.state.passengers;
  public readonly lockSeconds = this.state.lockSecondsRemaining;
  public readonly isLoading = this.state.isLoading;

  public readonly totalSelectedPrice = computed(() =>
    this.myLockedSeats().reduce((sum, s) => sum + s.price, 0),
  );

  // Filas del Airbus A320 (1 a 30)
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

  ngOnDestroy() {
    // Al salir de la vista, no liberamos automáticamente el lock si el usuario va a checkout
  }

  public switchToReturn() {
    if (this.myLockedSeats().length < this.passengers()) {
      this.state.addNotification(
        `Debes seleccionar ${this.passengers()} asiento(s) de ida antes de continuar.`,
        'warning',
      );
      return;
    }

    // 1. Guardar los asientos de ida
    this.state.myLockedOutboundSeats.set([...this.myLockedSeats()]);

    const retId = this.returnFlightId();
    if (!retId) {
      this.state.addNotification('No se ha especificado un vuelo de regreso.', 'error');
      return;
    }

    // Validar coherencia temporal entre vuelo de ida y de regreso
    const outboundFlight = this.state.selectedOutboundFlight() || this.flight();
    const returnFlight = this.state.selectedReturnFlight();
    if (outboundFlight && returnFlight) {
      const outTime = new Date(outboundFlight.arrivalTime || outboundFlight.departureTime).getTime();
      const retTime = new Date(returnFlight.departureTime).getTime();
      if (retTime <= outTime) {
        this.state.addNotification(
          'El vuelo de regreso seleccionado no puede despegar antes de la llegada del vuelo de ida.',
          'error',
        );
        this.router.navigate(['/flights']);
        return;
      }
    }

    // 2. Cambiar al paso de regreso
    this.currentStep.set('return');
    this.state.currentSeatStep.set('return');

    // 3. Conectarse al vuelo de regreso
    this.state.selectFlight(retId);
    this.state.addNotification(
      '✓ Asientos de ida guardados. Ahora selecciona los asientos para tu vuelo de regreso.',
      'info',
    );
  }

  public switchToOutbound() {
    // Guardar asientos de regreso si tiene alguno
    if (this.currentStep() === 'return' && this.myLockedSeats().length > 0) {
      this.state.myLockedReturnSeats.set([...this.myLockedSeats()]);
    }

    const outId = this.flightId();
    this.currentStep.set('outbound');
    this.state.currentSeatStep.set('outbound');
    this.state.selectFlight(outId);
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
      this.state.addNotification(
        `Capacidad aumentada a ${next} pasajeros. Ya puedes seleccionar más asientos.`,
        'info',
      );
    }
  }

  public decreasePassengers() {
    if (this.passengers() > 1) {
      if (this.myLockedSeats().length >= this.passengers()) {
        this.state.addNotification(
          'Deselecciona un asiento primero antes de reducir el número de pasajeros.',
          'warning',
        );
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
    const targetNumber = `${rowStr}${col}`;
    return this.seats().find((s) => s.seatNumber === targetNumber);
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

    // Disponible
    if (seat.seatClass === SeatClass.BUSINESS) {
      return 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:scale-105';
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
          `Ya has seleccionado los ${this.passengers()} asientos para tus pasajeros. Puedes aumentar los pasajeros con el botón (+) superior o deseleccionar uno para cambiarlo.`,
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
      const outboundFlight = this.state.selectedOutboundFlight() || this.flight();
      const returnFlight = this.state.selectedReturnFlight();
      if (outboundFlight && returnFlight) {
        const outTime = new Date(outboundFlight.arrivalTime || outboundFlight.departureTime).getTime();
        const retTime = new Date(returnFlight.departureTime).getTime();
        if (retTime <= outTime) {
          this.state.addNotification(
            'El vuelo de regreso no puede despegar antes de la llegada del vuelo de ida.',
            'error',
          );
          this.router.navigate(['/flights']);
          return;
        }
      }
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
