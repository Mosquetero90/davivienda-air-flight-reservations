import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { Flight, FlightStatus, City } from '@davivienda/shared';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-flight-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePickerComponent],
  template: `
    <div class="min-h-screen bg-slate-50 pb-16">
      
      <!-- Davivienda Hero Banner & Quick Search -->
      <section class="bg-gradient-to-r from-red-600 via-davivienda to-red-700 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 shadow-lg relative z-20">
        <!-- Background subtle geometric accents isolated in overflow-hidden container -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/5 blur-2xl"></div>
          <div class="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-white/10 blur-2xl"></div>
        </div>

        <div class="max-w-6xl mx-auto relative z-10">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-sm border border-white/20 mb-3">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Inventario Sincronizado en Tiempo Real
              </span>
              <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Vuela con Beneficios Davivienda
              </h1>
              <p class="text-red-100 text-sm sm:text-base mt-1.5 max-w-xl">
                Selecciona tu vuelo nacional, visualiza la disponibilidad de cabina en vivo y asegura tu asiento sin riesgo de sobreventa.
              </p>
            </div>

            <!-- DaviPuntos / DaviPlata Promotion Badge -->
            <div class="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-lg shadow-sm">
                ⭐
              </div>
              <div class="text-xs">
                <p class="font-bold text-white">Acumula DaviPuntos</p>
                <p class="text-red-100">O paga al instante desde tu DaviPlata</p>
              </div>
            </div>
          </div>

          <!-- Search Filter Bar -->
          <div class="bg-white text-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 relative z-30">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Origen</label>
              <div class="relative">
                <select
                  [(ngModel)]="origin"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
                >
                  <option value="">Todos los orígenes</option>
                  @for (city of cities(); track city.id) {
                    <option [value]="city.airports?.[0]?.iataCode || city.name">
                      {{ city.name }} ({{ city.airports?.[0]?.iataCode || city.id.toUpperCase() }})
                    </option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Destino</label>
              <select
                [(ngModel)]="destination"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
              >
                <option value="">Todos los destinos</option>
                @for (city of cities(); track city.id) {
                  <option [value]="city.airports?.[0]?.iataCode || city.name">
                    {{ city.name }} ({{ city.airports?.[0]?.iataCode || city.id.toUpperCase() }})
                  </option>
                }
              </select>
            </div>

            <div>
              <app-date-picker
                label="Fecha"
                placeholder="Seleccionar fecha"
                [(ngModel)]="date"
              ></app-date-picker>
            </div>

            <div class="flex items-end">
              <button
                (click)="applyFilter()"
                class="w-full bg-davivienda hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Buscar Vuelos</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      <!-- Main Flight Cards Grid -->
      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
        
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-slate-900">Vuelos Disponibles</h2>
            <span class="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {{ flights().length }} encontrados
            </span>
          </div>

          <!-- Live Refresh Status -->
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Actualización en tiempo real vía WebSockets</span>
          </div>
        </div>

        <!-- Skeleton / Empty State -->
        <div *ngIf="isLoading()" class="space-y-4">
          <div *ngFor="let i of [1,2,3]" class="h-36 bg-white rounded-2xl border border-slate-100 animate-pulse"></div>
        </div>

        <div *ngIf="!isLoading() && flights().length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p class="text-slate-400 text-4xl mb-3">✈️</p>
          <h3 class="text-base font-bold text-slate-700">No encontramos vuelos para los filtros seleccionados</h3>
          <p class="text-xs text-slate-500 mt-1">Prueba seleccionando otro destino o limpiando los filtros.</p>
          <button (click)="resetFilters()" class="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">
            Restablecer Filtros
          </button>
        </div>

        <!-- Cards List -->
        <div *ngIf="!isLoading()" class="space-y-4">
          <div
            *ngFor="let flight of flights()"
            class="bg-white rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-lg transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <!-- Left: Airline, Flight Number, Aircraft -->
            <div class="flex items-center gap-4 min-w-[200px]">
              <div class="w-12 h-12 rounded-xl bg-red-50 text-davivienda border border-red-100 flex items-center justify-center font-black text-sm">
                DV
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-base">{{ flight.flightNumber }}</span>
                  <!-- Operational Status Badge -->
                  <span
                    class="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase"
                    [ngClass]="{
                      'bg-emerald-100 text-emerald-800 border border-emerald-200': flight.status === 'ON_TIME',
                      'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse': flight.status === 'DELAYED',
                      'bg-rose-100 text-rose-800 border border-rose-200': flight.status === 'CANCELLED',
                      'bg-slate-100 text-slate-800': flight.status === 'BOARDING' || flight.status === 'SCHEDULED',
                      'bg-gray-800 text-white': flight.status === 'SOLD_OUT'
                    }"
                  >
                    {{ formatStatus(flight.status) }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 font-medium mt-0.5">{{ flight.airline }} &bull; {{ flight.aircraftModel }}</p>
                
                <!-- Live inventory counter -->
                <p class="text-xs mt-1.5 flex items-center gap-1.5 font-semibold"
                   [ngClass]="flight.availableSeatsCount && flight.availableSeatsCount > 10 ? 'text-emerald-600' : 'text-amber-600'">
                  <span class="w-1.5 h-1.5 rounded-full" [ngClass]="flight.availableSeatsCount && flight.availableSeatsCount > 10 ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                  <span>{{ flight.availableSeatsCount }} asientos disponibles</span>
                </p>
              </div>
            </div>

            <!-- Middle: Times, Origin & Destination Route -->
            <div class="flex-1 flex items-center justify-center gap-4 sm:gap-8 border-y md:border-y-0 md:border-x border-slate-100 py-4 md:py-0 md:px-8">
              <!-- Origin -->
              <div class="text-left">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ flight.originCode }}</span>
                <p class="text-lg sm:text-xl font-black text-slate-800">{{ flight.departureTime | date:'shortTime' }}</p>
                <p class="text-xs text-slate-500 truncate max-w-[120px]">{{ flight.originCity }}</p>
              </div>

              <!-- Flight Path Visual -->
              <div class="flex flex-col items-center min-w-[100px]">
                <span class="text-[10px] font-bold text-slate-400 mb-1">{{ flight.durationMinutes }} min &bull; Directo</span>
                <div class="w-full flex items-center">
                  <div class="w-2 h-2 rounded-full border-2 border-slate-300"></div>
                  <div class="flex-1 h-0.5 bg-slate-200 border-t border-dashed border-slate-300 relative">
                    <span class="absolute left-1/2 -top-2.5 -translate-x-1/2 text-xs text-slate-400">✈</span>
                  </div>
                  <div class="w-2 h-2 rounded-full bg-davivienda"></div>
                </div>
              </div>

              <!-- Destination -->
              <div class="text-right">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ flight.destinationCode }}</span>
                <p class="text-lg sm:text-xl font-black text-slate-800">{{ flight.arrivalTime | date:'shortTime' }}</p>
                <p class="text-xs text-slate-500 truncate max-w-[120px]">{{ flight.destinationCity }}</p>
              </div>
            </div>

            <!-- Right: Price & CTA Action -->
            <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 min-w-[180px]">
              <div class="text-left sm:text-right">
                <span class="text-[11px] text-slate-400 font-medium">Desde</span>
                <p class="text-xl font-black text-davivienda tracking-tight">
                  $ {{ flight.basePrice | number }}
                  <span class="text-xs font-bold text-slate-500">COP</span>
                </p>
              </div>

              <div class="flex items-center gap-2">
                <!-- Simulación Interactiva de Estado para la Demo Técnica -->
                <div class="relative group/status">
                  <button
                    title="Simular cambio de estado operativo (WebSocket demo)"
                    class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs border border-slate-200"
                  >
                    ⚡
                  </button>
                  <div class="absolute right-0 bottom-full mb-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 hidden group-hover/status:block z-30">
                    <p class="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Simular en Vivo:</p>
                    <button
                      (click)="changeFlightStatus(flight.id, 'ON_TIME')"
                      class="w-full text-left px-2 py-1 text-xs hover:bg-emerald-50 text-emerald-700 rounded font-medium"
                    >
                      A Tiempo (ON_TIME)
                    </button>
                    <button
                      (click)="changeFlightStatus(flight.id, 'DELAYED')"
                      class="w-full text-left px-2 py-1 text-xs hover:bg-amber-50 text-amber-700 rounded font-medium"
                    >
                      Retrasado (DELAYED)
                    </button>
                    <button
                      (click)="changeFlightStatus(flight.id, 'CANCELLED')"
                      class="w-full text-left px-2 py-1 text-xs hover:bg-rose-50 text-rose-700 rounded font-medium"
                    >
                      Cancelado (CANCELLED)
                    </button>
                  </div>
                </div>

                <!-- Select Seats Button -->
                <button
                  (click)="goToCabinMap(flight.id)"
                  [disabled]="flight.status === 'CANCELLED' || flight.status === 'SOLD_OUT'"
                  class="bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-red-100 transition-all flex items-center gap-1.5"
                >
                  <span>Seleccionar Asientos</span>
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

            </div>

          </div>
        </div>

      </main>

    </div>
  `,
})
export class FlightSearchComponent implements OnInit {
  private readonly state = inject(FlightStateService);
  private readonly flightApi = inject(FlightApiService);
  private readonly router = inject(Router);

  public readonly flights = this.state.flights;
  public readonly isLoading = this.state.isLoading;
  public readonly cities = signal<City[]>([]);

  public origin = '';
  public destination = '';
  public date = '';

  ngOnInit() {
    this.state.loadFlights();
    this.loadCities();
  }

  private loadCities() {
    this.flightApi.getCities().subscribe({
      next: (data) => this.cities.set(data),
      error: (err) => console.error('Error cargando catálogo de ciudades:', err),
    });
  }

  public applyFilter() {
    this.state.loadFlights({
      origin: this.origin || undefined,
      destination: this.destination || undefined,
      date: this.date || undefined,
    });
  }

  public resetFilters() {
    this.origin = '';
    this.destination = '';
    this.date = '';
    this.state.loadFlights();
  }

  public goToCabinMap(flightId: string) {
    this.state.selectFlight(flightId);
    this.router.navigate(['/flight', flightId, 'seats']);
  }

  public changeFlightStatus(flightId: string, status: string) {
    this.flightApi.updateFlightStatus(flightId, status as FlightStatus).subscribe({
      next: () => {
        this.state.addNotification(`Estado del vuelo ${flightId} actualizado a ${status}`, 'success');
      },
      error: () => {
        this.state.addNotification('Error al cambiar el estado del vuelo', 'error');
      },
    });
  }

  public formatStatus(status: FlightStatus): string {
    switch (status) {
      case FlightStatus.ON_TIME:
        return 'A Tiempo';
      case FlightStatus.DELAYED:
        return 'Atrasado';
      case FlightStatus.CANCELLED:
        return 'Cancelado';
      case FlightStatus.BOARDING:
        return 'Abordando';
      case FlightStatus.SOLD_OUT:
        return 'Agotado';
      default:
        return status;
    }
  }
}
