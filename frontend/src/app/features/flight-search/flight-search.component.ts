import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { Flight, FlightStatus, City, TripType } from '@davivienda/shared';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
import { PassengerSelectorComponent } from '../../shared/components/passenger-selector/passenger-selector.component';

@Component({
  selector: 'app-flight-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePickerComponent,
    PassengerSelectorComponent,
  ],
  template: `
    <div class="min-h-screen bg-slate-50 pb-20">
      
      <!-- Davivienda Hero Banner & Modern Airline Search Controls -->
      <section class="bg-gradient-to-r from-red-600 via-davivienda to-red-700 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-lg relative z-20">
        <!-- Background subtle geometric accents isolated in overflow-hidden container -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/5 blur-2xl"></div>
          <div class="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-white/10 blur-2xl"></div>
        </div>

        <div class="max-w-6xl mx-auto relative z-10">
          
          <!-- Hero Title & Promo Row -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-sm border border-white/20 mb-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Inventario Sincronizado en Tiempo Real
              </span>
              <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Vuela con Beneficios Davivienda
              </h1>
              <p class="text-red-100 text-xs sm:text-sm mt-1 max-w-xl">
                Selecciona tu vuelo nacional, visualiza la cabina interactiva en vivo y asegura tu asiento sin riesgo de sobreventa.
              </p>
            </div>

            <!-- DaviPuntos Badge -->
            <div class="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center gap-3 self-start md:self-auto">
              <div class="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-base shadow-sm">
                ⭐
              </div>
              <div class="text-xs">
                <p class="font-bold text-white">Acumula DaviPuntos</p>
                <p class="text-red-100">O paga desde tu DaviPlata</p>
              </div>
            </div>
          </div>

          <!-- Modern Search Box Wrapper (Card UI) -->
          <div class="bg-white text-slate-800 p-4 sm:p-6 rounded-3xl shadow-2xl border border-slate-100 relative z-30 space-y-4">
            
            <!-- Top Controls: Trip Type Pill Toggle + Secondary Actions -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100/80">
              
              <!-- Segmented Control: Ida y vuelta / Solo ida -->
              <div class="inline-flex bg-slate-100 p-1 rounded-full shadow-inner self-start">
                <button
                  type="button"
                  (click)="setTripType('ROUND_TRIP')"
                  class="px-5 py-1.5 rounded-full text-xs sm:text-sm transition-all"
                  [ngClass]="tripType === 'ROUND_TRIP' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'"
                >
                  Ida y vuelta
                </button>
                <button
                  type="button"
                  (click)="setTripType('ONE_WAY')"
                  class="px-5 py-1.5 rounded-full text-xs sm:text-sm transition-all"
                  [ngClass]="tripType === 'ONE_WAY' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800 font-semibold'"
                >
                  Solo ida
                </button>
              </div>

              <!-- Secondary link / DaviPuntos Miles -->
              <a
                href="#davipuntos"
                (click)="$event.preventDefault()"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-davivienda transition-colors self-start sm:self-auto py-1"
              >
                <span>Reservar con millas / DaviPuntos</span>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <!-- Bottom Row: Origin & Destination | Dates | Passengers | Search Button -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              
              <!-- 1. Origin & Destination Combined Card (5 cols on lg) -->
              <div class="lg:col-span-5 bg-white border border-slate-300 rounded-2xl min-h-[58px] p-2 flex items-center justify-between shadow-xs relative">
                
                <!-- Origen -->
                <div class="flex-1 flex items-center gap-2.5 px-2 overflow-hidden">
                  <!-- Airplane Takeoff Icon -->
                  <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <svg class="w-4 h-4 -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                      Origen
                    </span>
                    <select
                      [(ngModel)]="origin"
                      (ngModelChange)="onOriginChange($event)"
                      class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-0 cursor-pointer truncate"
                    >
                      <option value="">Todos los orígenes</option>
                      @for (city of cities(); track city.id) {
                        <option
                          [value]="getCityCode(city)"
                          [disabled]="isSameCity(getCityCode(city), destination)"
                        >
                          {{ city.name }} ({{ city.airports?.[0]?.iataCode || city.id.toUpperCase() }}) {{ isSameCity(getCityCode(city), destination) ? '— (Destino)' : '' }}
                        </option>
                      }
                    </select>
                  </div>
                </div>

                <!-- Swap Button (⇄) with central vertical divider -->
                <div class="relative flex items-center justify-center px-1">
                  <div class="w-px h-8 bg-slate-200 absolute"></div>
                  <button
                    type="button"
                    (click)="swapCities()"
                    title="Invertir origen y destino"
                    class="relative z-10 w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-davivienda transition-transform hover:rotate-180 duration-300 shadow-xs cursor-pointer"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>

                <!-- Destino -->
                <div class="flex-1 flex items-center gap-2.5 px-2 overflow-hidden">
                  <!-- Airplane Landing Icon -->
                  <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <svg class="w-4 h-4 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                      Destino
                    </span>
                    <select
                      [(ngModel)]="destination"
                      (ngModelChange)="onDestinationChange($event)"
                      class="w-full bg-transparent border-0 p-0 text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-0 cursor-pointer truncate"
                    >
                      <option value="">Todos los destinos</option>
                      @for (city of cities(); track city.id) {
                        <option
                          [value]="getCityCode(city)"
                          [disabled]="isSameCity(getCityCode(city), origin)"
                        >
                          {{ city.name }} ({{ city.airports?.[0]?.iataCode || city.id.toUpperCase() }}) {{ isSameCity(getCityCode(city), origin) ? '— (Origen)' : '' }}
                        </option>
                      }
                    </select>
                  </div>
                </div>

              </div>

              <!-- 2. Dates Combined Card (Salida + Regreso) (3 cols on lg) -->
              <div class="lg:col-span-3 bg-white border border-slate-300 rounded-2xl min-h-[58px] px-2 py-1 flex items-center justify-between shadow-xs relative">
                <!-- Salida Date Picker -->
                <div class="flex-1 min-w-0">
                  <app-date-picker
                    [seamless]="true"
                    compactLabel="Salida"
                    placeholder="Salida"
                    [(ngModel)]="date"
                    (ngModelChange)="onDateChange($event)"
                  ></app-date-picker>
                </div>

                <!-- Vertical Divider -->
                <div class="w-px h-8 bg-slate-200 mx-1 shrink-0"></div>

                <!-- Regreso Date Picker -->
                <div class="flex-1 min-w-0">
                  <app-date-picker
                    [seamless]="true"
                    compactLabel="Regreso"
                    [placeholder]="tripType === 'ONE_WAY' ? 'Sin regreso' : 'Regreso'"
                    [(ngModel)]="returnDate"
                    (ngModelChange)="onReturnDateChange($event)"
                    [disabled]="tripType === 'ONE_WAY'"
                    [minDate]="date"
                  ></app-date-picker>
                </div>
              </div>

              <!-- 3. Passengers Card (2 cols on lg) -->
              <div class="lg:col-span-2">
                <app-passenger-selector
                  [(ngModel)]="passengers"
                  (ngModelChange)="onPassengerChange($event)"
                ></app-passenger-selector>
              </div>

              <!-- 4. Search CTA Button (2 cols on lg) -->
              <div class="lg:col-span-2">
                <button
                  type="button"
                  (click)="applyFilter()"
                  class="w-full min-h-[58px] bg-slate-900 hover:bg-black text-white font-extrabold px-6 rounded-2xl text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Buscar</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      <!-- Main Flight Cards Grid -->
      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
        
        <!-- Header & Tabs for Round Trip -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-200">
          
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-extrabold text-slate-900">
              Vuelos Disponibles
            </h2>
            <span class="text-xs bg-slate-200 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
              {{ currentDisplayFlights.length }} {{ currentDisplayFlights.length === 1 ? 'vuelo' : 'vuelos' }}
            </span>
            <span *ngIf="passengers > 1" class="text-xs bg-red-50 text-davivienda font-bold px-2.5 py-0.5 rounded-full border border-red-100">
              Tarifas para {{ passengers }} pasajeros
            </span>
          </div>

          <!-- Live Refresh Status -->
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Actualización en tiempo real vía WebSockets</span>
          </div>
        </div>

        <!-- Round-Trip Navigation Tabs (when in round-trip mode) -->
        <div
          *ngIf="tripType === 'ROUND_TRIP'"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs"
        >
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              (click)="activeTab = 'outbound'"
              class="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              [ngClass]="activeTab === 'outbound' ? 'bg-davivienda text-white ring-2 ring-red-300' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'"
            >
              <span>1. Vuelo de Ida</span>
              <span class="text-xs px-2 py-0.5 rounded-full" [ngClass]="activeTab === 'outbound' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'">
                {{ flights().length }}
              </span>
              <span *ngIf="selectedOutboundFlight()" class="text-emerald-300 font-bold ml-1 text-xs">✓ {{ selectedOutboundFlight()?.flightNumber }}</span>
            </button>

            <button
              type="button"
              (click)="activeTab = 'return'"
              class="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              [ngClass]="activeTab === 'return' ? 'bg-davivienda text-white ring-2 ring-red-300' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'"
            >
              <span>2. Vuelo de Regreso</span>
              <span class="text-xs px-2 py-0.5 rounded-full" [ngClass]="activeTab === 'return' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'">
                {{ returnFlights().length }}
              </span>
              <span *ngIf="selectedReturnFlight()" class="text-emerald-300 font-bold ml-1 text-xs">✓ {{ selectedReturnFlight()?.flightNumber }}</span>
            </button>
          </div>

          <div class="text-xs font-semibold text-slate-600 px-2">
            <span *ngIf="!selectedOutboundFlight()" class="text-amber-600 font-bold">👉 Paso 1: Elige tu vuelo de ida</span>
            <span *ngIf="selectedOutboundFlight() && !selectedReturnFlight()" class="text-davivienda font-bold">👉 Paso 2: Ahora elige tu vuelo de regreso</span>
            <span *ngIf="selectedOutboundFlight() && selectedReturnFlight()" class="text-emerald-600 font-bold">✓ Vuelos de ida y regreso seleccionados</span>
          </div>
        </div>

        <!-- Round-Trip Guidance Banners for Return Step -->
        <div
          *ngIf="tripType === 'ROUND_TRIP' && activeTab === 'return' && !selectedOutboundFlight()"
          class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <p class="font-extrabold text-sm">Debes seleccionar primero tu vuelo de ida</p>
              <p class="text-xs text-amber-800">
                Para validar los horarios y garantizar que tu vuelo de regreso no despegue antes de tu llegada, elige primero el vuelo de ida en el Paso 1.
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="activeTab = 'outbound'"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors self-start sm:self-auto cursor-pointer shrink-0 shadow-sm"
          >
            Ir al Paso 1: Vuelo de Ida
          </button>
        </div>

        <div
          *ngIf="tripType === 'ROUND_TRIP' && activeTab === 'return' && selectedOutboundFlight()"
          class="mb-6 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-blue-900 text-xs shadow-xs"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-lg">ℹ️</span>
            <span>
              Tu vuelo de ida <strong>{{ selectedOutboundFlight()?.flightNumber }}</strong> llega a las <strong>{{ selectedOutboundFlight()?.arrivalTime | date:'shortTime' }}</strong> ({{ selectedOutboundFlight()?.arrivalTime | date:'dd/MM/yyyy' }}). Los vuelos de regreso anteriores a esa hora quedan bloqueados automáticamente para proteger tu itinerario.
            </span>
          </div>
        </div>

        <!-- Skeleton Loading State -->
        <div *ngIf="isLoading()" class="space-y-4">
          <div *ngFor="let i of [1, 2, 3]" class="h-36 bg-white rounded-2xl border border-slate-100 animate-pulse"></div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && currentDisplayFlights.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <p class="text-slate-400 text-4xl mb-3">✈️</p>
          <h3 class="text-base font-bold text-slate-700">
            No encontramos vuelos para los filtros seleccionados
          </h3>
          <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Prueba invirtiendo las ciudades con el botón (⇄), cambiando la fecha o restableciendo los filtros para ver todos los vuelos.
          </p>
          <button
            (click)="resetFilters()"
            class="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Restablecer Filtros
          </button>
        </div>

        <!-- Cards List -->
        <div *ngIf="!isLoading()" class="space-y-4">
          <div
            *ngFor="let flight of currentDisplayFlights"
            class="rounded-2xl border transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
            [ngClass]="{
              'bg-slate-50/70 border-slate-200 opacity-75': tripType === 'ROUND_TRIP' && activeTab === 'return' && isReturnFlightBeforeOutbound(flight),
              'bg-white border-slate-200 hover:border-red-200 hover:shadow-lg': !(tripType === 'ROUND_TRIP' && activeTab === 'return' && isReturnFlightBeforeOutbound(flight))
            }"
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
                <p
                  class="text-xs mt-1.5 flex items-center gap-1.5 font-semibold"
                  [ngClass]="flight.availableSeatsCount && flight.availableSeatsCount > 10 ? 'text-emerald-600' : 'text-amber-600'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    [ngClass]="flight.availableSeatsCount && flight.availableSeatsCount > 10 ? 'bg-emerald-500' : 'bg-amber-500'"
                  ></span>
                  <span>{{ flight.availableSeatsCount }} asientos disponibles</span>
                </p>
              </div>
            </div>

            <!-- Middle: Times, Origin & Destination Route -->
            <div class="flex-1 flex flex-col items-center justify-center border-y md:border-y-0 md:border-x border-slate-100 py-4 md:py-0 md:px-8">
              <!-- Flight Date Badge -->
              <div class="mb-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100/90 border border-slate-200/80 px-3 py-0.5 rounded-full shadow-2xs">
                <svg class="w-3.5 h-3.5 text-davivienda" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{{ flight.departureTime | date:'EEEE, d MMM yyyy' }}</span>
              </div>

              <div class="w-full flex items-center justify-center gap-4 sm:gap-8">
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

              <!-- Alert badge for invalid return flight timing -->
              <div
                *ngIf="tripType === 'ROUND_TRIP' && activeTab === 'return' && isReturnFlightBeforeOutbound(flight)"
                class="mt-2.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full flex items-center gap-1.5"
              >
                <span>⚠️ No disponible: Despega antes de la llegada de tu vuelo de ida ({{ selectedOutboundFlight()?.arrivalTime | date:'d MMM, shortTime' }})</span>
              </div>
            </div>

            <!-- Right: Price & CTA Action -->
            <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 min-w-[180px]">
              <div class="text-left sm:text-right">
                <span *ngIf="passengers > 1" class="block text-[10px] text-slate-400 font-medium">
                  $ {{ flight.basePrice | number }} COP / pers.
                </span>
                <span *ngIf="passengers === 1" class="text-[11px] text-slate-400 font-medium">Desde</span>
                <p class="text-xl font-black text-davivienda tracking-tight">
                  $ {{ (flight.basePrice * passengers) | number }}
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

                <!-- Action Button -->
                <!-- Case 1: Round-Trip Mode -->
                <ng-container *ngIf="tripType === 'ROUND_TRIP'">
                  <!-- Tab 1: Outbound selection -->
                  <ng-container *ngIf="activeTab === 'outbound'">
                    <button
                      *ngIf="selectedOutboundFlight()?.id === flight.id"
                      type="button"
                      class="bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                    >
                      <span>✓ Ida Elegida</span>
                    </button>
                    <button
                      *ngIf="selectedOutboundFlight()?.id !== flight.id"
                      type="button"
                      (click)="selectOutbound(flight)"
                      [disabled]="flight.status === 'CANCELLED' || flight.status === 'SOLD_OUT'"
                      class="bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-red-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Elegir Vuelo de Ida</span>
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </ng-container>

                  <!-- Tab 2: Return selection -->
                  <ng-container *ngIf="activeTab === 'return'">
                    <button
                      *ngIf="selectedReturnFlight()?.id === flight.id"
                      type="button"
                      class="bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1.5"
                    >
                      <span>✓ Regreso Elegido</span>
                    </button>

                    <button
                      *ngIf="selectedReturnFlight()?.id !== flight.id && isReturnFlightBeforeOutbound(flight)"
                      type="button"
                      disabled
                      title="No puedes seleccionar este vuelo de regreso porque despega antes de la llegada de tu vuelo de ida"
                      class="bg-slate-100 text-slate-400 border border-slate-300 font-bold py-2.5 px-3.5 rounded-xl text-xs cursor-not-allowed flex items-center gap-1.5 shadow-none"
                    >
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>Anterior a la Ida</span>
                    </button>

                    <button
                      *ngIf="selectedReturnFlight()?.id !== flight.id && !isReturnFlightBeforeOutbound(flight)"
                      type="button"
                      (click)="selectReturn(flight)"
                      [disabled]="flight.status === 'CANCELLED' || flight.status === 'SOLD_OUT' || !selectedOutboundFlight()"
                      class="bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-red-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Elegir Vuelo de Regreso</span>
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </ng-container>
                </ng-container>

                <!-- Case 2: One-Way Mode -->
                <button
                  *ngIf="tripType === 'ONE_WAY'"
                  type="button"
                  (click)="goToCabinMap(flight.id)"
                  [disabled]="flight.status === 'CANCELLED' || flight.status === 'SOLD_OUT'"
                  class="bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-red-100 transition-all flex items-center gap-1.5 cursor-pointer"
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

      <!-- Sticky Round-Trip Selection Summary Bar -->
      <div
        *ngIf="tripType === 'ROUND_TRIP' && (selectedOutboundFlight() || selectedReturnFlight())"
        class="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl p-4 z-40 animate-in slide-in-from-bottom-4 duration-300"
      >
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <!-- Selected Flights Summary Pills -->
          <div class="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
            <!-- Outbound pill -->
            <div
              (click)="activeTab = 'outbound'"
              class="px-3.5 py-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all"
              [ngClass]="selectedOutboundFlight() ? 'bg-red-50 border-red-200 text-davivienda font-bold hover:bg-red-100' : 'bg-slate-100 border-slate-200 text-slate-400'"
            >
              <span class="w-5 h-5 rounded-full bg-davivienda text-white flex items-center justify-center font-bold text-[10px]">1</span>
              <div>
                <p class="font-extrabold text-[11px] leading-tight">Ida: {{ selectedOutboundFlight()?.flightNumber || 'Por seleccionar' }}</p>
                <p class="text-[10px] text-slate-500 font-medium" *ngIf="selectedOutboundFlight()">
                  {{ selectedOutboundFlight()?.originCode }} ➔ {{ selectedOutboundFlight()?.destinationCode }} &bull; 📅 {{ selectedOutboundFlight()?.departureTime | date:'EEE, d MMM' }} &bull; 🕒 {{ selectedOutboundFlight()?.departureTime | date:'shortTime' }}
                </p>
              </div>
            </div>

            <!-- Return pill -->
            <div
              (click)="activeTab = 'return'"
              class="px-3.5 py-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all"
              [ngClass]="selectedReturnFlight() ? 'bg-red-50 border-red-200 text-davivienda font-bold hover:bg-red-100' : 'bg-slate-100 border-slate-200 text-slate-400'"
            >
              <span class="w-5 h-5 rounded-full bg-davivienda text-white flex items-center justify-center font-bold text-[10px]">2</span>
              <div>
                <p class="font-extrabold text-[11px] leading-tight">Regreso: {{ selectedReturnFlight()?.flightNumber || 'Por seleccionar' }}</p>
                <p class="text-[10px] text-slate-500 font-medium" *ngIf="selectedReturnFlight()">
                  {{ selectedReturnFlight()?.originCode }} ➔ {{ selectedReturnFlight()?.destinationCode }} &bull; 📅 {{ selectedReturnFlight()?.departureTime | date:'EEE, d MMM' }} &bull; 🕒 {{ selectedReturnFlight()?.departureTime | date:'shortTime' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Pricing & Proceed Action -->
          <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div class="text-left sm:text-right" *ngIf="selectedOutboundFlight() || selectedReturnFlight()">
              <span class="text-[10px] text-slate-400 font-semibold block uppercase">Total Estimado ({{ passengers }} pas.)</span>
              <p class="text-base sm:text-lg font-black text-davivienda leading-none">
                $ {{ roundTripEstimatedTotal | number }} <span class="text-xs font-bold text-slate-500">COP</span>
              </p>
            </div>

            <button
              type="button"
              (click)="proceedToSeatsFromSearch()"
              [disabled]="!selectedOutboundFlight() || !selectedReturnFlight()"
              class="bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm shadow-lg shadow-red-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{{ getProceedButtonText() }}</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

        </div>
      </div>

    </div>
  `,
})
export class FlightSearchComponent implements OnInit {
  private readonly state = inject(FlightStateService);
  private readonly flightApi = inject(FlightApiService);
  private readonly router = inject(Router);

  public readonly flights = this.state.flights;
  public readonly returnFlights = this.state.returnFlights;
  public readonly isLoading = this.state.isLoading;
  public readonly cities = signal<City[]>([]);
  public readonly selectedOutboundFlight = this.state.selectedOutboundFlight;
  public readonly selectedReturnFlight = this.state.selectedReturnFlight;

  public tripType: TripType = 'ROUND_TRIP';
  public origin = '';
  public destination = '';
  public date = '';
  public returnDate = '';
  public passengers = this.state.passengers();
  public activeTab: 'outbound' | 'return' = 'outbound';

  public get currentDisplayFlights(): Flight[] {
    if (this.tripType === 'ROUND_TRIP' && this.activeTab === 'return') {
      return this.returnFlights();
    }
    return this.flights();
  }

  public get roundTripEstimatedTotal(): number {
    const outbound = this.selectedOutboundFlight();
    const returnFl = this.selectedReturnFlight();
    const outPrice = outbound ? outbound.basePrice : 0;
    const retPrice = returnFl ? returnFl.basePrice : 0;
    return (outPrice + retPrice) * this.passengers;
  }

  ngOnInit() {
    this.passengers = this.state.passengers();
    this.loadCities();
    this.applyFilter();
  }

  public onPassengerChange(count: number) {
    this.passengers = count;
    this.state.setPassengers(count);
  }

  private loadCities() {
    this.flightApi.getCities().subscribe({
      next: (data) => this.cities.set(data),
      error: (err) => console.error('Error cargando catálogo de ciudades:', err),
    });
  }

  public setTripType(type: TripType) {
    this.tripType = type;
    this.state.tripType.set(type);
    if (type === 'ONE_WAY') {
      this.returnDate = '';
      this.activeTab = 'outbound';
      this.state.selectedReturnFlight.set(null);
    }
    this.applyFilter();
  }

  public getCityCode(city: City): string {
    return city.airports?.[0]?.iataCode || city.name;
  }

  public isSameCity(codeA?: string, codeB?: string): boolean {
    if (!codeA || !codeB) return false;
    return codeA.trim().toUpperCase() === codeB.trim().toUpperCase();
  }

  public onOriginChange(newOrigin: string) {
    if (newOrigin && this.isSameCity(newOrigin, this.destination)) {
      this.destination = '';
      this.state.addNotification(
        'La ciudad de origen y destino no pueden ser iguales. El destino fue restablecido.',
        'warning',
      );
    }
    this.applyFilter();
  }

  public onDestinationChange(newDest: string) {
    if (newDest && this.isSameCity(newDest, this.origin)) {
      this.origin = '';
      this.state.addNotification(
        'La ciudad de destino y origen no pueden ser iguales. El origen fue restablecido.',
        'warning',
      );
    }
    this.applyFilter();
  }

  public swapCities() {
    if (!this.origin && !this.destination) return;
    const temp = this.origin;
    this.origin = this.destination;
    this.destination = temp;
    this.applyFilter();
  }

  public onDateChange(newDate: string) {
    this.date = newDate;
    if (this.returnDate && newDate && this.returnDate < newDate) {
      this.returnDate = newDate;
      this.state.addNotification(
        'La fecha de regreso no puede ser anterior a la fecha de salida. Se ajustó automáticamente.',
        'warning',
      );
    }
    this.validateOutboundAndReturnConsistency();
    this.applyFilter();
  }

  public onReturnDateChange(newReturnDate: string) {
    if (this.date && newReturnDate && newReturnDate < this.date) {
      this.returnDate = this.date;
      this.state.addNotification(
        'La fecha de regreso no puede ser anterior a la fecha de salida.',
        'warning',
      );
    } else {
      this.returnDate = newReturnDate;
    }
    this.validateOutboundAndReturnConsistency();
    this.applyFilter();
  }

  public isReturnFlightBeforeOutbound(returnFlight: Flight): boolean {
    const outbound = this.selectedOutboundFlight();
    if (!outbound || !returnFlight) return false;
    const outboundTime = new Date(outbound.arrivalTime || outbound.departureTime).getTime();
    const returnTime = new Date(returnFlight.departureTime).getTime();
    return returnTime <= outboundTime;
  }

  public validateOutboundAndReturnConsistency() {
    const outbound = this.selectedOutboundFlight();
    const returnFl = this.selectedReturnFlight();
    if (outbound && returnFl && this.isReturnFlightBeforeOutbound(returnFl)) {
      this.state.selectedReturnFlight.set(null);
      this.state.addNotification(
        'El vuelo de regreso previo fue deseleccionado porque su horario es anterior al vuelo de ida.',
        'warning',
      );
    }
  }

  public applyFilter() {
    if (this.origin && this.destination && this.isSameCity(this.origin, this.destination)) {
      this.state.addNotification(
        'La ciudad de origen y destino no pueden ser iguales. Por favor selecciona destinos diferentes.',
        'warning',
      );
      return;
    }

    if (this.tripType === 'ROUND_TRIP' && this.date && this.returnDate && this.returnDate < this.date) {
      this.returnDate = this.date;
      this.state.addNotification(
        'La fecha de regreso no puede ser anterior a la fecha de salida.',
        'warning',
      );
    }

    this.state.loadFlights({
      origin: this.origin || undefined,
      destination: this.destination || undefined,
      date: this.date || undefined,
      returnDate: this.returnDate || undefined,
      passengers: this.passengers,
      tripType: this.tripType,
    });
  }

  public resetFilters() {
    this.origin = '';
    this.destination = '';
    this.date = '';
    this.returnDate = '';
    this.passengers = 1;
    this.state.setPassengers(1);
    this.state.selectedOutboundFlight.set(null);
    this.state.selectedReturnFlight.set(null);
    this.tripType = 'ROUND_TRIP';
    this.activeTab = 'outbound';
    this.applyFilter();
  }

  public selectOutbound(flight: Flight) {
    this.state.selectedOutboundFlight.set(flight);

    // Si es ida y vuelta, asegurar que los vuelos de regreso correspondan a la ruta inversa (destino -> origen)
    if (this.tripType === 'ROUND_TRIP') {
      this.flightApi
        .getFlights({
          origin: flight.destinationCode,
          destination: flight.originCode,
          date: this.returnDate || undefined,
          passengers: this.passengers,
        })
        .subscribe({
          next: (returnList) => {
            this.state.returnFlights.set(returnList);
          },
          error: (err) => console.error('Error al actualizar vuelos de regreso:', err),
        });
    }

    // Si ya se había elegido un vuelo de regreso y resulta anterior a la llegada de este nuevo vuelo de ida, invalidarlo
    const currentReturn = this.selectedReturnFlight();
    if (currentReturn) {
      const outboundTime = new Date(flight.arrivalTime || flight.departureTime).getTime();
      const returnTime = new Date(currentReturn.departureTime).getTime();
      if (returnTime <= outboundTime) {
        this.state.selectedReturnFlight.set(null);
        this.state.addNotification(
          `El vuelo de regreso previo (${currentReturn.flightNumber}) fue deseleccionado porque despega antes de la llegada de tu vuelo de ida (${flight.flightNumber}). Por favor selecciona un nuevo vuelo de regreso.`,
          'warning',
        );
      } else {
        this.state.addNotification(
          `✓ Vuelo de Ida ${flight.flightNumber} seleccionado. Ahora selecciona tu vuelo de regreso.`,
          'info',
        );
      }
    } else {
      this.state.addNotification(
        `✓ Vuelo de Ida ${flight.flightNumber} (${flight.originCode} ➔ ${flight.destinationCode}) seleccionado. Ahora selecciona tu vuelo de regreso.`,
        'info',
      );
    }
    this.activeTab = 'return';
  }

  public selectReturn(flight: Flight) {
    if (!this.selectedOutboundFlight()) {
      this.state.addNotification(
        'Debes seleccionar primero el vuelo de ida antes de elegir el vuelo de regreso.',
        'warning',
      );
      this.activeTab = 'outbound';
      return;
    }

    if (this.isReturnFlightBeforeOutbound(flight)) {
      this.state.addNotification(
        `No puedes seleccionar el vuelo de regreso ${flight.flightNumber}: despega antes de la llegada de tu vuelo de ida (${this.selectedOutboundFlight()?.flightNumber}). Por favor elige un vuelo posterior.`,
        'error',
      );
      return;
    }

    this.state.selectedReturnFlight.set(flight);
    this.state.addNotification(
      `✓ Vuelo de Regreso ${flight.flightNumber} (${flight.originCode} ➔ ${flight.destinationCode}) seleccionado. Ya puedes continuar a elegir tus asientos.`,
      'success',
    );
  }

  public getProceedButtonText(): string {
    if (!this.selectedOutboundFlight()) {
      return '1. Selecciona Vuelo de Ida';
    }
    if (!this.selectedReturnFlight()) {
      return '2. Selecciona Vuelo de Regreso';
    }
    return `Elegir Asientos (${this.passengers} pas.)`;
  }

  public proceedToSeatsFromSearch() {
    const outbound = this.selectedOutboundFlight();
    const returnFl = this.selectedReturnFlight();

    if (!outbound || !returnFl) {
      this.state.addNotification(
        'Por favor selecciona tanto el vuelo de ida como el de regreso para continuar.',
        'warning',
      );
      return;
    }

    if (this.isReturnFlightBeforeOutbound(returnFl)) {
      this.state.selectedReturnFlight.set(null);
      this.state.addNotification(
        'El vuelo de regreso no puede ser anterior a la llegada del vuelo de ida. Por favor selecciona otro vuelo de regreso.',
        'error',
      );
      this.activeTab = 'return';
      return;
    }

    this.state.setPassengers(this.passengers);
    this.state.currentSeatStep.set('outbound');
    this.state.selectFlight(outbound.id);
    this.router.navigate(['/flight', outbound.id, 'seats'], {
      queryParams: {
        passengers: this.passengers,
        roundTrip: 'true',
        returnFlightId: returnFl.id,
      },
    });
  }

  public goToCabinMap(flightId: string) {
    this.state.setPassengers(this.passengers);
    this.state.tripType.set('ONE_WAY');
    this.state.selectFlight(flightId);
    this.router.navigate(['/flight', flightId, 'seats'], {
      queryParams: { passengers: this.passengers },
    });
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
