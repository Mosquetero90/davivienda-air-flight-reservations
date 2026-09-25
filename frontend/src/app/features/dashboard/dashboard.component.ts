import { Component, OnInit, inject, signal } from '@angular/core';
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
        
        <!-- Header & Flight Selector -->
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

          <!-- Flight Dropdown Switcher -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500">Vuelo Activo:</span>
            <select
              (change)="onFlightChange($event)"
              class="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
            >
              <option *ngFor="let f of flights()" [value]="f.id" [selected]="f.id === selectedFlight()?.id">
                {{ f.flightNumber }} ({{ f.originCode }} &rarr; {{ f.destinationCode }})
              </option>
            </select>
          </div>
        </div>

        <!-- 4 Key Executive KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <!-- KPI 1: Occupancy Rate -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Ocupación</span>
              <p class="text-3xl font-black text-slate-900 mt-1">
                {{ currentMetrics()?.occupancyPercentage ?? occupancyPercentage() }}%
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Capacidad: {{ currentMetrics()?.totalSeats ?? totalSeats() }} asientos
              </p>
            </div>
            <div class="w-14 h-14 rounded-2xl bg-red-50 text-davivienda flex items-center justify-center font-black text-xl border border-red-100">
              📊
            </div>
          </div>

          <!-- KPI 2: Available Seats (Verde) -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Asientos Disponibles</span>
              <p class="text-3xl font-black text-emerald-600 mt-1">
                {{ currentMetrics()?.availableSeats ?? availableSeats() }}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">Listos para reserva</p>
            </div>
            <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl border border-emerald-100">
              🟢
            </div>
          </div>

          <!-- KPI 3: Ephemeral Redis Locks (Amarillo) -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bloqueos Activos (Redis)</span>
              <p class="text-3xl font-black text-amber-500 mt-1">
                {{ currentMetrics()?.lockedSeats ?? lockedSeats() }}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">Locks en proceso de pago</p>
            </div>
            <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl border border-amber-100">
              ⏳
            </div>
          </div>

          <!-- KPI 4: Confirmed Revenue -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ventas Confirmadas</span>
              <p class="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {{ currentMetrics()?.bookedSeats ?? bookedSeats() }}
              </p>
              <p class="text-[11px] font-bold text-davivienda mt-0.5">
                $ {{ (currentMetrics()?.revenueEstimated ?? ((bookedSeats() || 4) * 280000)) | number }} COP
              </p>
            </div>
            <div class="w-14 h-14 rounded-2xl bg-slate-50 text-slate-800 flex items-center justify-center font-black text-xl border border-slate-200">
              💳
            </div>
          </div>

        </div>

        <!-- 2 Column Layout: Class Breakdown vs Live Activity Feed -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left: Cabin Class Breakdown & Occupancy Gauge -->
          <div class="lg:col-span-1 space-y-6">
            
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 class="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                Distribución por Clase de Cabina
              </h3>

              <!-- Business Class Bar -->
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

                <!-- Premium Economy / Exit Rows -->
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

                <!-- Economy Class -->
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

              <!-- Quick Link to Cabin Map -->
              <a
                *ngIf="selectedFlight()"
                [routerLink]="['/flight', selectedFlight()?.id, 'seats']"
                class="mt-6 w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>Ver Mapa Interactivo de Cabina</span>
                <span class="text-davivienda">&rarr;</span>
              </a>
            </div>

          </div>

          <!-- Right 2 Cols: Real-Time Event Stream Log -->
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

              <!-- Activity Feed List -->
              <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                <div
                  *ngFor="let ev of liveFeed()"
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
                      <span class="text-[10px] text-slate-400 font-mono">{{ ev.time }}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 mt-0.5">{{ ev.description }}</p>
                  </div>
                </div>

                <div *ngIf="liveFeed().length === 0" class="text-center py-12 text-slate-400 text-xs">
                  Esperando eventos en vivo del gateway WebSockets...
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly state = inject(FlightStateService);
  private readonly flightApi = inject(FlightApiService);
  private readonly socketService = inject(SocketService);

  public readonly flights = this.state.flights;
  public readonly selectedFlight = this.state.selectedFlight;
  public readonly currentMetrics = this.state.metrics;
  public readonly totalSeats = this.state.totalSeatsCount;
  public readonly availableSeats = this.state.availableSeatsCount;
  public readonly lockedSeats = this.state.lockedSeatsCount;
  public readonly bookedSeats = this.state.bookedSeatsCount;
  public readonly occupancyPercentage = this.state.occupancyPercentage;

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

    // Si no hay vuelo seleccionado, tomar el primero (DV-204)
    setTimeout(() => {
      const allFlights = this.flights();
      if (allFlights.length > 0 && !this.selectedFlight()) {
        this.state.selectFlight(allFlights[0].id);
      }
    }, 500);

    // Escuchar eventos en vivo y alimentar el Live Feed
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

  public onFlightChange(event: any) {
    const flightId = event.target.value;
    if (flightId) {
      this.state.selectFlight(flightId);
    }
  }

  private addFeedItem(item: LiveFeedEvent) {
    this.liveFeed.update((list) => [item, ...list.slice(0, 15)]);
  }
}
