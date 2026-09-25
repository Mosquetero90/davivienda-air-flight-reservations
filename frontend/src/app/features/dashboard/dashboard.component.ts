import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { SocketService } from '../../core/services/socket.service';
import { FlightMetrics } from '@davivienda/shared';

interface LiveFeedEvent {
  id: string;
  time: string;
  type: 'lock' | 'unlock' | 'booked' | 'status';
  title: string;
  description: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto space-y-8">
        
        <!-- Header & Selector de Vuelo -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                WebSockets Feed Activo
              </span>
              <span class="text-xs text-slate-400">&bull; Actualizaciones O(1)</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Dashboard de Ocupación en Tiempo Real
            </h1>
            <p class="text-xs sm:text-sm text-slate-500">
              Monitoreo ejecutivo de inventario, bloqueos efímeros en Redis y transacciones completadas en PostgreSQL.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500">Vuelo Activo:</span>
            <select
              (change)="onFlightChange($event)"
              class="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda cursor-pointer"
            >
              @for (f of flights(); track f.id) {
                <option [value]="f.id" [selected]="f.id === selectedFlight()?.id">
                  {{ f.flightNumber }} ({{ f.originCode }} &rarr; {{ f.destinationCode }})
                </option>
              }
            </select>
          </div>
        </div>

        <!-- 4 Tarjetas KPI -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <!-- KPI 1: Gauge Radial SVG de Ocupación -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Ocupación</span>
              <p class="text-3xl font-black text-slate-900 mt-1 font-tabular">
                {{ currentOccupancy() }}%
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Capacidad: {{ currentMetrics()?.totalSeats ?? totalSeats() }} asientos
              </p>
            </div>
            <div class="relative w-16 h-16 flex items-center justify-center">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" class="stroke-slate-100" stroke-width="3"></circle>
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  class="stroke-davivienda transition-all duration-700 ease-out"
                  stroke-width="3.5"
                  stroke-dasharray="88"
                  [attr.stroke-dashoffset]="88 - (88 * currentOccupancy()) / 100"
                  stroke-linecap="round"
                ></circle>
              </svg>
              <span class="absolute text-[11px] font-black text-slate-800 font-tabular">{{ currentOccupancy() }}%</span>
            </div>
          </div>

          <!-- KPI 2: Asientos Disponibles -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Asientos Disponibles</span>
              <p class="text-3xl font-black text-emerald-600 mt-1 font-tabular">
                {{ currentMetrics()?.availableSeats ?? availableSeats() }}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">Listos para reserva</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100">
              🟢
            </div>
          </div>

          <!-- KPI 3: Bloqueos Efímeros Redis -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bloqueos Activos (Redis)</span>
              <p class="text-3xl font-black text-amber-500 mt-1 font-tabular">
                {{ currentMetrics()?.lockedSeats ?? lockedSeats() }}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">Locks en proceso de pago</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-100">
              ⏳
            </div>
          </div>

          <!-- KPI 4: Ventas Confirmadas -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ventas Confirmadas</span>
              <p class="text-3xl font-black text-slate-900 mt-1 font-tabular">
                {{ currentMetrics()?.bookedSeats ?? bookedSeats() }}
              </p>
              <p class="text-[11px] font-bold text-davivienda mt-0.5 font-tabular">
                $ {{ (currentMetrics()?.revenueEstimated ?? ((bookedSeats() || 4) * 280000)) | number }} COP
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-slate-50 text-slate-800 flex items-center justify-center font-black text-lg border border-slate-200">
              💳
            </div>
          </div>

        </div>

        <!-- Mini-Heatmap del Avión A320neo -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">Mapa de Calor Matricial de la Cabina (Airbus A320neo)</h3>
              <p class="text-xs text-slate-500">Distribución de los 180 asientos sincronizados en tiempo real por WebSocket</p>
            </div>
            <div class="flex items-center gap-3 text-xs font-semibold">
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-emerald-500"></span> Libre</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-400 animate-pulse"></span> Bloqueado Redis</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-slate-300"></span> Ocupado</span>
            </div>
          </div>

          <div class="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            @for (seat of seats(); track seat.seatNumber) {
              <div
                class="w-full aspect-square rounded text-[8px] font-mono font-bold flex items-center justify-center transition-all cursor-default select-none shadow-2xs"
                [ngClass]="{
                  'bg-emerald-500 text-white': seat.status === 'AVAILABLE',
                  'bg-amber-400 text-amber-950 animate-pulse': seat.status === 'LOCKED',
                  'bg-slate-300 text-slate-600': seat.status === 'BOOKED'
                }"
                [title]="'Asiento ' + seat.seatNumber + ' (' + seat.status + ')'"
              >
                {{ seat.seatNumber }}
              </div>
            }
          </div>
        </div>

        <!-- 2 Column Layout: Distribución por Clase vs Live Activity Feed -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Izquierda: Desglose por Clase -->
          <div class="lg:col-span-1 space-y-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 class="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                Distribución por Clase de Cabina
              </h3>

              <div class="space-y-4 text-xs font-semibold">
                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-slate-700 flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded bg-amber-400"></span>
                      Clase Ejecutiva (Filas 1-3)
                    </span>
                    <span class="text-slate-500">18 asientos</span>
                  </div>
                  <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-amber-400 rounded-full" style="width: 25%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-slate-700 flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded bg-blue-500"></span>
                      Salida de Emergencia (Filas 11-12)
                    </span>
                    <span class="text-slate-500">12 asientos</span>
                  </div>
                  <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500 rounded-full" style="width: 40%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-slate-700 flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                      Clase Turista (Filas 4-30)
                    </span>
                    <span class="text-slate-500">150 asientos</span>
                  </div>
                  <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" style="width: 15%"></div>
                  </div>
                </div>
              </div>

              @if (selectedFlight()) {
                <a
                  [routerLink]="['/flight', selectedFlight()?.id, 'seats']"
                  class="mt-6 w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ver Mapa Interactivo de Cabina</span>
                  <span class="text-davivienda">&rarr;</span>
                </a>
              }
            </div>
          </div>

          <!-- Derecha: Live Activity Feed (2 Columnas) -->
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-slate-900">
                    Feed de Eventos en Tiempo Real
                  </h3>
                  <span class="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                    Auditoría en Vivo
                  </span>
                </div>

                <span class="text-xs text-slate-400 font-medium">Socket Room: flight_{{ selectedFlight()?.id }}</span>
              </div>

              <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                @for (ev of liveFeed(); track ev.id) {
                  <div
                    class="p-3.5 rounded-xl border flex items-start gap-3 transition-all"
                    [ngClass]="{
                      'bg-amber-50/50 border-amber-200 text-amber-950': ev.type === 'lock',
                      'bg-slate-50 border-slate-200 text-slate-800': ev.type === 'unlock',
                      'bg-emerald-50/50 border-emerald-200 text-emerald-950': ev.type === 'booked',
                      'bg-blue-50/50 border-blue-200 text-blue-950': ev.type === 'status'
                    }"
                  >
                    <span class="text-base mt-0.5">
                      {{ ev.type === 'lock' ? '🔒' : ev.type === 'booked' ? '💳' : ev.type === 'unlock' ? '⏱️' : '✈️' }}
                    </span>

                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <p class="font-bold text-xs">{{ ev.title }}</p>
                        <span class="text-[10px] text-slate-400 font-mono font-tabular">{{ ev.time }}</span>
                      </div>
                      <p class="text-[11px] text-slate-600 mt-0.5">{{ ev.description }}</p>
                    </div>
                  </div>
                }

                @if (liveFeed().length === 0) {
                  <div class="text-center py-12 text-slate-400 text-xs">
                    Esperando eventos en vivo del gateway WebSockets...
                  </div>
                }
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly state = inject(FlightStateService);
  private readonly flightApi = inject(FlightApiService);
  private readonly socketService = inject(SocketService);

  public readonly flights = this.state.flights;
  public readonly selectedFlight = this.state.selectedFlight;
  public readonly seats = this.state.seats;
  public readonly currentMetrics = this.state.metrics;
  public readonly occupancyPercentage = this.state.occupancyPercentage;
  public readonly availableSeats = this.state.availableSeatsCount;
  public readonly lockedSeats = this.state.lockedSeatsCount;
  public readonly bookedSeats = this.state.bookedSeatsCount;
  public readonly totalSeats = this.state.totalSeatsCount;

  public readonly currentOccupancy = computed(() => {
    return this.currentMetrics()?.occupancyPercentage ?? this.occupancyPercentage();
  });

  public readonly liveFeed = signal<LiveFeedEvent[]>([
    {
      id: '1',
      time: 'Hace 1 min',
      type: 'booked',
      title: 'Reserva Confirmada PNR DV-79K2B',
      description: 'Pasajero Carlos Mendoza compró asiento 11C ($ 320.000 COP) vía DaviPlata.',
    },
    {
      id: '2',
      time: 'Hace 3 min',
      type: 'lock',
      title: 'Bloqueo Atómico Adquirido en Redis',
      description: 'Asiento 01A bloqueado con TTL de 300 segundos por usuario.',
    },
  ]);

  ngOnInit() {
    this.state.loadFlights();

    setTimeout(() => {
      const allFlights = this.flights();
      if (allFlights.length > 0 && !this.selectedFlight()) {
        this.state.selectFlight(allFlights[0].id);
      }
    }, 500);

    this.socketService.seatLocked$.subscribe((ev) => {
      this.addFeedItem({
        id: Math.random().toString(),
        time: 'Ahora',
        type: 'lock',
        title: `Asiento ${ev.seatNumber} Bloqueado`,
        description: `Usuario ${ev.lockedByUserId} reservó el asiento. TTL: ${ev.remainingSeconds}s.`,
      });
    });

    this.socketService.seatReleased$.subscribe((ev) => {
      this.addFeedItem({
        id: Math.random().toString(),
        time: 'Ahora',
        type: 'unlock',
        title: `Asiento ${ev.seatNumber} Liberado`,
        description: `Motivo: ${ev.reason}. El asiento vuelve a estar disponible para todos.`,
      });
    });

    this.socketService.seatBooked$.subscribe((ev) => {
      this.addFeedItem({
        id: Math.random().toString(),
        time: 'Ahora',
        type: 'booked',
        title: `Asiento ${ev.seatNumber} Comprado (PNR: ${ev.bookingReference})`,
        description: `Transacción ACID exitosa en PostgreSQL. Asiento marcado como BOOKED.`,
      });
    });

    this.socketService.flightStatus$.subscribe((ev) => {
      this.addFeedItem({
        id: Math.random().toString(),
        time: 'Ahora',
        type: 'status',
        title: `Estado de Vuelo Actualizado`,
        description: `Vuelo ${ev.flightId} cambió a estado ${ev.newStatus}.`,
      });
    });
  }

  public onFlightChange(event: Event) {
    const flightId = (event.target as HTMLSelectElement).value;
    if (flightId) {
      this.state.selectFlight(flightId);
    }
  }

  private addFeedItem(item: LiveFeedEvent) {
    this.liveFeed.update((list) => [item, ...list.slice(0, 15)]);
  }
}
