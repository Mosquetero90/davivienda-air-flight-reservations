import { Component, OnInit, inject, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { BookingPassengerDto, BookingResponseDto } from '@davivienda/shared';
import { FunnelStepperComponent } from '../../shared/components/funnel-stepper/funnel-stepper.component';
import { VirtualCardComponent } from '../../shared/components/virtual-card/virtual-card.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FunnelStepperComponent, VirtualCardComponent],
  template: `
    <div class="min-h-screen bg-slate-50 pb-20">
      <app-funnel-stepper [currentStep]="confirmedBooking() ? 'confirmation' : 'checkout'" />
      <div class="max-w-4xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        
        <!-- Case 1: Booking Confirmed Screen (Boarding Passes / Pasabordos Digitales) -->
        <div *ngIf="confirmedBooking()" class="animate-in fade-in zoom-in-95 duration-500 space-y-8">
          
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-inner mb-3">
              ✓
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ¡Tu Reserva {{ isRoundTrip() ? 'de Ida y Vuelta' : '' }} ha sido Confirmada!
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Hemos emitido tus tiquetes electrónicos y enviado la confirmación a tu correo registrado.
            </p>
          </div>

          <!-- Boarding Pass 1: Vuelo de Ida -->
          <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl mx-auto relative print:border-none print:shadow-none">
            <!-- Muescas troqueladas laterales -->
            <div class="absolute -left-3 top-44 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200 z-10 print:hidden"></div>
            <div class="absolute -right-3 top-44 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200 z-10 print:hidden"></div>
            
            <!-- Red Header -->
            <div class="bg-gradient-to-r from-red-600 to-davivienda text-white p-6 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white text-davivienda rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                  🏠
                </div>
                <div>
                  <span class="font-extrabold text-lg tracking-wider">DAVIVIENDA AIR</span>
                  <p class="text-[11px] text-red-100">
                    {{ isRoundTrip() ? 'Pasabordo 1 &bull; Vuelo de Ida' : 'Pasabordo Digital &bull; Vuelo Nacional' }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-red-100 font-bold uppercase tracking-widest block">Código PNR Ida</span>
                <span class="font-mono text-xl sm:text-2xl font-black tracking-widest text-amber-300">
                  {{ confirmedBooking()?.bookingReference }}
                </span>
              </div>
            </div>

            <!-- Ticket Body -->
            <div class="p-6 sm:p-8 space-y-6">
              
              <!-- Flight Route Grid -->
              <div class="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origen</span>
                  <h3 class="text-2xl font-black text-slate-900">{{ confirmedBooking()?.origin }}</h3>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span class="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">📅 {{ confirmedBooking()?.departureTime | date:'EEE, d MMM yyyy' }}</span>
                    <span class="text-xs font-semibold text-slate-500">🕒 {{ confirmedBooking()?.departureTime | date:'shortTime' }}</span>
                  </div>
                </div>
                
                <div class="flex flex-col items-center">
                  <span class="text-xs font-bold text-davivienda">Directo</span>
                  <span class="text-xl text-slate-300">✈</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ confirmedBooking()?.flightNumber }}</span>
                </div>

                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destino</span>
                  <h3 class="text-2xl font-black text-slate-900">{{ confirmedBooking()?.destination }}</h3>
                  <p class="text-xs font-semibold text-slate-500">Llegada estimada</p>
                </div>
              </div>

              <!-- Passenger & Seat Details Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5">{{ confirmedBooking()?.departureTime | date:'dd MMM yyyy' }}</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pasajero</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5 truncate">{{ confirmedBooking()?.passengerName }}</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asiento(s)</span>
                  <p class="text-base font-black text-davivienda mt-0.5">{{ confirmedBooking()?.seatNumber }}</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Puerta</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5">B-14</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Abordaje</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5">45 min antes</p>
                </div>
              </div>

              <!-- Barcode / Total Grid -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-1 h-10 bg-slate-100 px-3 rounded-xl border border-slate-200">
                    <span class="w-1 h-6 bg-slate-800"></span>
                    <span class="w-2 h-6 bg-slate-800"></span>
                    <span class="w-0.5 h-6 bg-slate-800"></span>
                    <span class="w-1.5 h-6 bg-slate-800"></span>
                    <span class="w-1 h-6 bg-slate-800"></span>
                    <span class="w-2 h-6 bg-slate-800"></span>
                  </div>
                  <span class="font-mono text-xs text-slate-500 font-bold">{{ confirmedBooking()?.bookingReference }}</span>
                </div>

                <div class="text-right">
                  <span class="text-[10px] text-slate-400 block font-medium">Pagado Ida:</span>
                  <span class="text-base font-black text-slate-900">
                    $ {{ confirmedBooking()?.totalPaid | number }} COP
                  </span>
                </div>
              </div>

            </div>

          </div>

          <!-- Boarding Pass 2: Vuelo de Regreso (si existe) -->
          <div
            *ngIf="confirmedReturnBooking()"
            class="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl mx-auto relative animate-in fade-in slide-in-from-bottom-2 duration-500 print:border-none print:shadow-none"
          >
            <!-- Muescas troqueladas laterales -->
            <div class="absolute -left-3 top-44 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200 z-10 print:hidden"></div>
            <div class="absolute -right-3 top-44 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200 z-10 print:hidden"></div>
            <!-- Blue/Davivienda Header -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-davivienda text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                  🔄
                </div>
                <div>
                  <span class="font-extrabold text-lg tracking-wider">DAVIVIENDA AIR</span>
                  <p class="text-[11px] text-slate-300">Pasabordo 2 &bull; Vuelo de Regreso</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-slate-300 font-bold uppercase tracking-widest block">Código PNR Regreso</span>
                <span class="font-mono text-xl sm:text-2xl font-black tracking-widest text-emerald-400">
                  {{ confirmedReturnBooking()?.bookingReference }}
                </span>
              </div>
            </div>

            <!-- Ticket Body -->
            <div class="p-6 sm:p-8 space-y-6">
              
              <!-- Flight Route Grid -->
              <div class="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origen (Regreso)</span>
                  <h3 class="text-2xl font-black text-slate-900">{{ confirmedReturnBooking()?.origin }}</h3>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span class="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">📅 {{ confirmedReturnBooking()?.departureTime | date:'EEE, d MMM yyyy' }}</span>
                    <span class="text-xs font-semibold text-slate-500">🕒 {{ confirmedReturnBooking()?.departureTime | date:'shortTime' }}</span>
                  </div>
                </div>
                
                <div class="flex flex-col items-center">
                  <span class="text-xs font-bold text-slate-800">Directo</span>
                  <span class="text-xl text-slate-300">✈</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ confirmedReturnBooking()?.flightNumber }}</span>
                </div>

                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destino (Regreso)</span>
                  <h3 class="text-2xl font-black text-slate-900">{{ confirmedReturnBooking()?.destination }}</h3>
                  <p class="text-xs font-semibold text-slate-500">Llegada estimada</p>
                </div>
              </div>

              <!-- Passenger & Seat Details Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5">{{ confirmedReturnBooking()?.departureTime | date:'dd MMM yyyy' }}</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pasajero</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5 truncate">{{ confirmedReturnBooking()?.passengerName }}</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asiento(s)</span>
                  <p class="text-base font-black text-slate-900 mt-0.5">{{ confirmedReturnBooking()?.seatNumber }}</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Puerta</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5">C-08</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Abordaje</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5">45 min antes</p>
                </div>
              </div>

              <!-- Barcode / Total Grid -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-1 h-10 bg-slate-100 px-3 rounded-xl border border-slate-200">
                    <span class="w-1 h-6 bg-slate-800"></span>
                    <span class="w-2 h-6 bg-slate-800"></span>
                    <span class="w-0.5 h-6 bg-slate-800"></span>
                    <span class="w-1.5 h-6 bg-slate-800"></span>
                    <span class="w-1 h-6 bg-slate-800"></span>
                    <span class="w-2 h-6 bg-slate-800"></span>
                  </div>
                  <span class="font-mono text-xs text-slate-500 font-bold">{{ confirmedReturnBooking()?.bookingReference }}</span>
                </div>

                <div class="text-right">
                  <span class="text-[10px] text-slate-400 block font-medium">Pagado Regreso:</span>
                  <span class="text-base font-black text-slate-900">
                    $ {{ confirmedReturnBooking()?.totalPaid | number }} COP
                  </span>
                </div>
              </div>

            </div>

          </div>

          <!-- Action buttons below tickets -->
          <div class="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <button
              onclick="window.print()"
              class="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️ Imprimir Pasabordos</span>
            </button>

            <a
              routerLink="/flights"
              (click)="finishBookingFlow()"
              class="px-6 py-2.5 rounded-xl bg-davivienda hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-200 transition-colors cursor-pointer"
            >
              Volver a Buscar Vuelos
            </a>
          </div>

        </div>

        <!-- Case 2: Checkout Form & Payment -->
        <div *ngIf="!confirmedBooking()">
          
          <!-- Back Link & Header -->
          <div class="flex items-center justify-between mb-6">
            <a
              [routerLink]="['/flight', flightId(), 'seats']"
              [queryParams]="isRoundTrip() ? { roundTrip: 'true', returnFlightId: returnFlight()?.id, passengers: passengers() } : { passengers: passengers() }"
              class="text-xs font-bold text-slate-600 hover:text-davivienda flex items-center gap-1.5 cursor-pointer"
            >
              &larr; Volver al Mapa de Cabina
            </a>

            <!-- Countdown Pill -->
            <div *ngIf="hasLockedSeats()" class="flex items-center gap-2 bg-red-50 text-davivienda border border-red-200 px-3.5 py-1.5 rounded-full text-xs font-bold">
              <span>Tiempo para completar tu compra:</span>
              <span class="font-mono text-sm tracking-wider">{{ formattedRemainingTime() }}</span>
            </div>
          </div>

          <!-- If no seat is locked, display warning and redirect -->
          <div *ngIf="!hasLockedSeats()" class="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center">
            <h2 class="text-lg font-bold text-amber-900">No tienes asientos bloqueados actualmente</h2>
            <p class="text-xs text-amber-700 mt-1 mb-4">
              {{ isRoundTrip() ? 'Selecciona los asientos para el vuelo de ida y de regreso en el mapa de cabina para proceder al pago.' : 'Selecciona primero los asientos en el mapa de cabina para proceder al pago.' }}
            </p>
            <a
              [routerLink]="['/flight', flightId(), 'seats']"
              [queryParams]="isRoundTrip() ? { roundTrip: 'true', returnFlightId: returnFlight()?.id, passengers: passengers() } : { passengers: passengers() }"
              class="inline-block px-5 py-2.5 bg-davivienda text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Ir a Seleccionar Asientos
            </a>
          </div>

          <!-- Checkout Layout: 2 Columns (Form on left, Order summary on right) -->
          <div *ngIf="hasLockedSeats()" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Left 2 Cols: Passenger and Payment Form -->
            <div class="lg:col-span-2 space-y-6">
              
              <!-- 1. Passenger Information Card -->
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-red-100 text-davivienda flex items-center justify-center text-xs font-black">1</span>
                    Información del Pasajero Principal y Contacto
                  </h2>
                  <span class="text-xs font-bold text-davivienda bg-red-50 px-2.5 py-1 rounded-full border border-red-100 self-start sm:self-auto">
                    {{ isRoundTrip() ? 'Ida: ' + outboundSeatsDisplay() + ' | Regreso: ' + returnSeatsDisplay() : 'Asiento(s): ' + outboundSeatsDisplay() }}
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Nombres</label>
                    <input
                      type="text"
                      [(ngModel)]="passenger.firstName"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Apellidos</label>
                    <input
                      type="text"
                      [(ngModel)]="passenger.lastName"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Tipo de Documento</label>
                    <select
                      [(ngModel)]="passenger.documentType"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda cursor-pointer"
                    >
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="PASSPORT">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Número de Documento</label>
                    <input
                      type="text"
                      [(ngModel)]="passenger.documentNumber"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      [(ngModel)]="passenger.email"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Teléfono Móvil</label>
                    <input
                      type="tel"
                      [(ngModel)]="passenger.phone"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
                    />
                  </div>
                </div>
              </div>

              <!-- 2. Payment Method Card -->
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-red-100 text-davivienda flex items-center justify-center text-xs font-black">2</span>
                    Método de Pago
                  </h2>
                  <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <span>🔒</span> Pago Seguro Davivienda
                  </span>
                </div>

                <!-- Payment Options -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <!-- Tarjeta Option -->
                  <div
                    (click)="selectedPaymentMethod = 'CARD'"
                    class="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                    [ngClass]="selectedPaymentMethod === 'CARD' ? 'border-teal-600 bg-teal-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-extrabold text-sm text-slate-800">Tarjeta</span>
                      <span *ngIf="selectedPaymentMethod === 'CARD'" class="text-teal-600 font-bold">✓</span>
                    </div>
                    <p class="text-[11px] text-slate-500">Crédito o Débito.</p>
                  </div>

                  <!-- DaviPlata Option -->
                  <div
                    (click)="selectedPaymentMethod = 'DAVIPLATA'"
                    class="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                    [ngClass]="selectedPaymentMethod === 'DAVIPLATA' ? 'border-daviplata bg-red-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-extrabold text-sm text-daviplata">DaviPlata</span>
                      <span *ngIf="selectedPaymentMethod === 'DAVIPLATA'" class="text-daviplata font-bold">✓</span>
                    </div>
                    <p class="text-[11px] text-slate-500">Paga desde tu celular al instante.</p>
                  </div>

                  <!-- PSE -->
                  <div
                    (click)="selectedPaymentMethod = 'PSE'"
                    class="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                    [ngClass]="selectedPaymentMethod === 'PSE' ? 'border-blue-500 bg-blue-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-extrabold text-sm text-blue-700">PSE</span>
                      <span *ngIf="selectedPaymentMethod === 'PSE'" class="text-blue-700 font-bold">✓</span>
                    </div>
                    <p class="text-[11px] text-slate-500">Débito desde cualquier banco.</p>
                  </div>
                </div>

                <!-- Tarjeta de Crédito y Débito Form (Matches Reference Screenshot) -->
                <div
                  *ngIf="selectedPaymentMethod === 'CARD'"
                  class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-teal-600 mb-2 transition-all"
                >
                  <!-- Card Header Bar -->
                  <div class="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white">
                    <div class="flex items-center gap-3">
                      <!-- Active Teal Radio Dot Indicator -->
                      <div class="w-5 h-5 rounded-full border-2 border-teal-600 flex items-center justify-center shrink-0">
                        <div class="w-2.5 h-2.5 rounded-full bg-teal-600"></div>
                      </div>
                      <span class="text-base font-semibold text-slate-800">Tarjeta de crédito y débito</span>
                    </div>

                    <!-- Payment Network Badges -->
                    <div class="flex items-center gap-2">
                      <!-- AMEX -->
                      <div
                        class="bg-[#006fcf] text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded shadow-xs transition-all select-none"
                        [ngClass]="detectedCardBrand === 'amex' ? 'ring-2 ring-teal-500 scale-105' : 'opacity-90'"
                      >
                        AMEX
                      </div>

                      <!-- Diners Club -->
                      <div
                        class="bg-black text-white text-[10px] font-bold px-2 py-1 rounded shadow-xs flex items-center gap-1 transition-all select-none"
                        [ngClass]="detectedCardBrand === 'diners' ? 'ring-2 ring-teal-500 scale-105' : 'opacity-90'"
                      >
                        <span class="w-3 h-3 rounded-full border border-white flex items-center justify-center text-[7px] font-bold">D</span>
                        <span>Diners</span>
                      </div>

                      <!-- Mastercard -->
                      <div
                        class="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs flex items-center transition-all select-none"
                        [ngClass]="detectedCardBrand === 'mastercard' ? 'ring-2 ring-teal-500 scale-105' : 'opacity-90'"
                      >
                        <div class="flex items-center -space-x-1.5">
                          <span class="w-3.5 h-3.5 rounded-full bg-[#eb001b] inline-block"></span>
                          <span class="w-3.5 h-3.5 rounded-full bg-[#ff5f00] opacity-90 inline-block"></span>
                        </div>
                      </div>

                      <!-- VISA -->
                      <div
                        class="bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-xs transition-all select-none"
                        [ngClass]="detectedCardBrand === 'visa' ? 'ring-2 ring-teal-500 scale-105' : 'opacity-90'"
                      >
                        <span class="text-[#1a1f71] font-black italic tracking-wider text-xs">VISA</span>
                      </div>
                    </div>
                  </div>

                  <!-- Tarjeta Virtual Interactiva 3D con Auto-Flip al CVV -->
                  <div class="p-6 bg-slate-50/70 border-b border-slate-200 flex justify-center">
                    <app-virtual-card
                      [cardNumber]="cardNumber"
                      [cardHolder]="((passenger.firstName || '') + ' ' + (passenger.lastName || '')).trim() || 'CARLOS MENDOZA'"
                      [cardExp]="cardExp"
                      [cardCvv]="cardCvv"
                      [isFlipped]="isCardFlipped()"
                    />
                  </div>

                  <!-- Card Body -->
                  <div class="p-6 space-y-6">
                    <!-- Split Payment Toggle -->
                    <div class="flex items-center gap-3">
                      <!-- Toggle switch -->
                      <button
                        type="button"
                        role="switch"
                        [attr.aria-checked]="splitPayment"
                        (click)="splitPayment = !splitPayment"
                        class="w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0"
                        [ngClass]="splitPayment ? 'bg-teal-600' : 'bg-slate-300'"
                      >
                        <span
                          class="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 left-0.5"
                          [ngClass]="splitPayment ? 'translate-x-5' : 'translate-x-0'"
                        ></span>
                      </button>

                      <div class="flex items-center gap-2 text-xs">
                        <span class="font-bold text-slate-800">Dividir el pago</span>
                        <span class="text-slate-600">de tus vuelos en dos tarjetas diferentes</span>
                        <span
                          class="w-4 h-4 rounded-full bg-[#20293a] text-white text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-slate-700 shrink-0"
                          title="Permite pagar una parte con una tarjeta y el saldo restante con otra tarjeta diferente."
                        >i</span>
                      </div>
                    </div>

                    <!-- Split Payment Notice (if enabled) -->
                    <div *ngIf="splitPayment" class="p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span>💳</span>
                        <span>
                          <strong>Monto Tarjeta 1:</strong> $ {{ (totalPrice() * 0.5) | number }} COP (50%) &bull;
                          <strong>Monto Tarjeta 2:</strong> $ {{ (totalPrice() * 0.5) | number }} COP (50%)
                        </span>
                      </div>
                      <span class="text-[10px] font-bold uppercase tracking-wider bg-teal-200 text-teal-900 px-2 py-0.5 rounded">Split 50/50</span>
                    </div>

                    <!-- Section Title -->
                    <div>
                      <h3 class="text-sm font-bold text-slate-900">Información de la tarjeta</h3>
                    </div>

                    <!-- Card Form Inputs -->
                    <div class="space-y-6">
                      <!-- Field 1: Card Number -->
                      <div class="relative">
                        <div class="flex items-center gap-2 border-b border-slate-300 focus-within:border-teal-600 pb-1.5 transition-colors">
                          <span class="text-slate-400 text-base">💳</span>
                          <input
                            type="text"
                            inputmode="numeric"
                            autocomplete="cc-number"
                            maxlength="19"
                            placeholder="Número de tarjeta"
                            [(ngModel)]="cardNumber"
                            (input)="onCardNumberInput($event)"
                            class="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none tracking-wider font-mono"
                          />
                        </div>
                        <p class="text-[11px] text-slate-500 mt-1">Ingresa tu tarjeta crédito, débito o Avianca UATP</p>
                      </div>

                      <!-- Field 2 & 3: Expiration Date & CVV -->
                      <div class="grid grid-cols-2 gap-6">
                        <!-- MM/AA -->
                        <div class="relative">
                          <div class="border-b border-slate-300 focus-within:border-teal-600 pb-1.5 transition-colors">
                            <input
                              type="text"
                              inputmode="numeric"
                              autocomplete="cc-exp"
                              maxlength="5"
                              placeholder="MM/AA"
                              [(ngModel)]="cardExp"
                              (input)="onCardExpInput($event)"
                              class="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none tracking-widest uppercase font-mono"
                            />
                          </div>
                          <p class="text-[11px] text-slate-500 mt-1">Fecha de expiración</p>
                        </div>

                        <!-- CVV -->
                        <div class="relative">
                          <div class="flex items-center justify-between border-b border-slate-300 focus-within:border-teal-600 pb-1.5 transition-colors">
                            <input
                              type="password"
                              inputmode="numeric"
                              autocomplete="cc-csc"
                              maxlength="4"
                              placeholder="CVV"
                              [(ngModel)]="cardCvv"
                              (input)="onCardCvvInput($event)"
                              class="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none tracking-widest font-mono"
                            />
                            <span
                              class="w-4 h-4 rounded-full bg-[#20293a] text-white text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-slate-700 shrink-0 ml-2"
                              title="Código de seguridad de 3 o 4 dígitos ubicado al reverso de tu tarjeta"
                            >i</span>
                          </div>
                          <p class="text-[11px] text-slate-500 mt-1">Código de seguridad</p>
                        </div>
                      </div>

                      <!-- Secondary Card for Split Payment (if toggled) -->
                      <div *ngIf="splitPayment" class="pt-4 border-t border-dashed border-slate-200 space-y-4">
                        <div class="flex items-center justify-between">
                          <h4 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>💳</span> Segunda Tarjeta (50% restante)
                          </h4>
                          <span class="text-[11px] text-teal-700 font-semibold">$ {{ (totalPrice() * 0.5) | number }} COP</span>
                        </div>
                        <div class="relative">
                          <div class="flex items-center gap-2 border-b border-slate-300 focus-within:border-teal-600 pb-1.5 transition-colors">
                            <span class="text-slate-400 text-base">💳</span>
                            <input
                              type="text"
                              inputmode="numeric"
                              maxlength="19"
                              placeholder="Número de la segunda tarjeta"
                              [(ngModel)]="card2Number"
                              (input)="onCard2NumberInput($event)"
                              class="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none tracking-wider font-mono"
                            />
                          </div>
                          <p class="text-[11px] text-slate-500 mt-1">Segunda tarjeta de crédito o débito para split</p>
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                          <div>
                            <div class="border-b border-slate-300 focus-within:border-teal-600 pb-1.5">
                              <input
                                type="text"
                                maxlength="5"
                                placeholder="MM/AA"
                                [(ngModel)]="card2Exp"
                                (input)="onCard2ExpInput($event)"
                                class="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none tracking-widest uppercase font-mono"
                              />
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">Fecha expiración tarjeta 2</p>
                          </div>
                          <div>
                            <div class="border-b border-slate-300 focus-within:border-teal-600 pb-1.5">
                              <input
                                type="password"
                                maxlength="4"
                                placeholder="CVV"
                                [(ngModel)]="card2Cvv"
                                (input)="onCard2CvvInput($event)"
                                class="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none tracking-widest font-mono"
                              />
                            </div>
                            <p class="text-[11px] text-slate-500 mt-1">CVV tarjeta 2</p>
                          </div>
                        </div>
                      </div>

                      <!-- Demo Quick Fill & Reset Buttons -->
                      <div class="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          (click)="fillDemoCard()"
                          class="text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>⚡ Cargar datos demo (Visa)</span>
                        </button>
                        <button
                          *ngIf="cardNumber || cardExp || cardCvv"
                          type="button"
                          (click)="clearCardForm()"
                          class="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                        >
                          Limpiar campos
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

                <!-- DaviPlata Extra Info -->
                <div *ngIf="selectedPaymentMethod === 'DAVIPLATA'" class="p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-200/80 space-y-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-daviplata text-white flex items-center justify-center font-black text-sm shadow-xs">
                      DP
                    </div>
                    <div>
                      <h4 class="font-extrabold text-sm text-slate-900">Débito Inmediato DaviPlata</h4>
                      <p class="text-xs text-slate-500">Autorización rápida desde tu app móvil sin costo ni comisiones</p>
                    </div>
                  </div>
                  <div class="bg-white p-4 rounded-xl border border-red-100 shadow-2xs space-y-2">
                    <p class="text-xs text-slate-600 font-medium">Recibirás una notificación push para autorizar la transacción:</p>
                    <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                      <span class="text-2xl">📲</span>
                      <div class="flex-1">
                        <span class="font-bold text-slate-900 block font-tabular">¿Autorizas pago por $ {{ totalPrice() | number }} COP?</span>
                        <p class="text-[11px] text-slate-500">Comercio: Davivienda Air &bull; Celular: {{ passenger.phone || '3108924411' }}</p>
                      </div>
                      <span class="text-xs font-bold text-daviplata bg-red-100 px-2.5 py-1 rounded-full">Listo</span>
                    </div>
                  </div>
                </div>

                <!-- PSE Extra Info -->
                <div *ngIf="selectedPaymentMethod === 'PSE'" class="bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    🏦
                  </div>
                  <div class="text-xs text-slate-700">
                    <p class="font-bold text-slate-900">Transferencia Segura PSE</p>
                    <p class="text-slate-500">Serás redirigido a la pasarela de pagos de tu entidad bancaria.</p>
                  </div>
                </div>

              </div>

            </div>

            <!-- Right Col: Order Summary & Confirm Button -->
            <div class="space-y-6">
              
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                <h3 class="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                  Resumen de tu Compra
                </h3>

                <!-- Outbound Flight Details -->
                <div class="space-y-2 pb-4 border-b border-slate-100 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="font-extrabold text-slate-900">
                      {{ isRoundTrip() ? '1. Vuelo de Ida:' : 'Vuelo:' }}
                    </span>
                    <span class="font-bold text-davivienda">{{ outboundFlight()?.flightNumber }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Ruta:</span>
                    <span class="font-semibold text-slate-800">{{ outboundFlight()?.originCode }} &rarr; {{ outboundFlight()?.destinationCode }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Fecha y Hora:</span>
                    <span class="font-bold text-slate-800">📅 {{ outboundFlight()?.departureTime | date:'EEE, d MMM yyyy' }} &bull; 🕒 {{ outboundFlight()?.departureTime | date:'shortTime' }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Asientos Ida:</span>
                    <span class="font-bold text-davivienda">{{ outboundSeatsDisplay() }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Subtotal Ida:</span>
                    <span class="font-semibold text-slate-800">$ {{ outboundTotalPrice() | number }} COP</span>
                  </div>
                </div>

                <!-- Return Flight Details (if round trip) -->
                <div *ngIf="isRoundTrip() && returnFlight()" class="space-y-2 py-4 border-b border-slate-100 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="font-extrabold text-slate-900">2. Vuelo de Regreso:</span>
                    <span class="font-bold text-slate-800">{{ returnFlight()?.flightNumber }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Ruta:</span>
                    <span class="font-semibold text-slate-800">{{ returnFlight()?.originCode }} &rarr; {{ returnFlight()?.destinationCode }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Fecha y Hora:</span>
                    <span class="font-bold text-slate-800">📅 {{ returnFlight()?.departureTime | date:'EEE, d MMM yyyy' }} &bull; 🕒 {{ returnFlight()?.departureTime | date:'shortTime' }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Asientos Regreso:</span>
                    <span class="font-bold text-slate-800">{{ returnSeatsDisplay() }}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Subtotal Regreso:</span>
                    <span class="font-semibold text-slate-800">$ {{ returnTotalPrice() | number }} COP</span>
                  </div>
                </div>

                <!-- Price Breakdown -->
                <div class="space-y-2 py-4 border-b border-slate-100 text-xs">
                  <div class="flex justify-between text-slate-500">
                    <span>Pasajeros:</span>
                    <span class="font-bold text-slate-800">{{ passengers() }} pasajero(s)</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Tarifa Base</span>
                    <span>$ {{ (totalPrice() * 0.81) | number:'1.0-0' }} COP</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>IVA y Tasas (19%)</span>
                    <span>$ {{ (totalPrice() * 0.19) | number:'1.0-0' }} COP</span>
                  </div>
                  <div class="flex justify-between text-base font-black text-slate-900 pt-2">
                    <span>Total a Pagar:</span>
                    <span class="text-davivienda">$ {{ totalPrice() | number }} COP</span>
                  </div>
                </div>

                <!-- Submit Button -->
                <button
                  (click)="submitBooking()"
                  [disabled]="isSubmitting() || !isFormValid()"
                  class="mt-6 w-full py-3.5 rounded-xl bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span *ngIf="isSubmitting()" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-r-transparent"></span>
                  <span>
                    {{ isSubmitting() ? 'Procesando Transacción ACID...' : (isRoundTrip() ? 'Pagar y Confirmar Ida y Vuelta' : 'Pagar y Confirmar Reserva (' + outboundSeats().length + ')') }}
                  </span>
                </button>

                <p class="text-[10px] text-center text-slate-400 mt-3">
                  Transacción protegida con estándar bancario Davivienda. {{ isRoundTrip() ? 'Se generarán PNRs independientes para cada trayecto.' : 'El código PNR será generado al instante.' }}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  public readonly flightId = input.required<string>();
  public readonly isCardFlipped = signal<boolean>(false);

  public printBoardingPass() {
    window.print();
  }
  public readonly roundTripParam = input<string | undefined>(undefined, { alias: 'roundTrip' });
  public readonly returnFlightIdParam = input<string | undefined>(undefined, { alias: 'returnFlightId' });
  public readonly passengersParam = input<string | number | undefined>(undefined, { alias: 'passengers' });

  private readonly state = inject(FlightStateService);
  private readonly flightApi = inject(FlightApiService);
  private readonly userSession = inject(UserSessionService);
  private readonly router = inject(Router);

  public readonly flight = this.state.selectedFlight;
  public readonly myLockedSeats = this.state.myLockedSeats;
  public readonly passengers = this.state.passengers;
  public readonly lockSeconds = this.state.lockSecondsRemaining;
  public readonly confirmedBooking = this.state.lastBooking;
  public readonly confirmedReturnBooking = this.state.lastReturnBooking;

  public readonly isRoundTrip = computed(
    () => this.roundTripParam() === 'true' || (this.state.tripType() === 'ROUND_TRIP' && !!this.returnFlight()),
  );

  public readonly outboundFlight = computed(
    () => this.state.selectedOutboundFlight() || this.flight(),
  );

  public readonly returnFlight = computed(
    () => this.state.selectedReturnFlight(),
  );

  public readonly outboundSeats = computed(() => {
    if (this.isRoundTrip() && this.state.myLockedOutboundSeats().length > 0) {
      return this.state.myLockedOutboundSeats();
    }
    return this.myLockedSeats();
  });

  public readonly returnSeats = computed(() => this.state.myLockedReturnSeats());

  public readonly hasLockedSeats = computed(() => {
    if (this.isRoundTrip()) {
      return this.outboundSeats().length > 0 && this.returnSeats().length > 0;
    }
    return this.myLockedSeats().length > 0;
  });

  public readonly outboundSeatsDisplay = computed(() =>
    this.outboundSeats()
      .map((s) => s.seatNumber)
      .join(', '),
  );

  public readonly returnSeatsDisplay = computed(() =>
    this.returnSeats()
      .map((s) => s.seatNumber)
      .join(', '),
  );

  public readonly selectedSeatsDisplay = computed(() => this.outboundSeatsDisplay());

  public readonly outboundTotalPrice = computed(() =>
    this.outboundSeats().reduce((sum, s) => sum + s.price, 0),
  );

  public readonly returnTotalPrice = computed(() =>
    this.isRoundTrip() ? this.returnSeats().reduce((sum, s) => sum + s.price, 0) : 0,
  );

  public readonly totalPrice = computed(() =>
    this.outboundTotalPrice() + this.returnTotalPrice(),
  );

  public selectedPaymentMethod: 'DAVIPLATA' | 'CARD' | 'PSE' = 'CARD';
  public isSubmitting = this.state.isLoading;

  // Credit / Debit Card fields (demonstration & booking flow)
  public cardNumber = '';
  public cardExp = '';
  public cardCvv = '';
  public splitPayment = false;
  public detectedCardBrand: 'visa' | 'mastercard' | 'amex' | 'diners' | null = null;

  // Split payment secondary card fields
  public card2Number = '';
  public card2Exp = '';
  public card2Cvv = '';

  public passenger: BookingPassengerDto = {
    firstName: '',
    lastName: '',
    documentType: 'CC',
    documentNumber: '',
    email: '',
    phone: '',
  };

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

    const retId = this.returnFlightIdParam();
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

    const currentUser = this.userSession.currentUser();
    const names = currentUser.name.split(' ');
    this.passenger = {
      firstName: names[0] || 'Carlos',
      lastName: names.slice(1).join(' ') || 'Mendoza',
      documentType: currentUser.documentType || 'CC',
      documentNumber: currentUser.documentNumber || '1020482910',
      email: currentUser.email || 'carlos.mendoza@davivienda.com',
      phone: currentUser.phone || '3108924411',
    };
  }

  public fillDemoCard() {
    this.cardNumber = '4557 8901 2345 6789';
    this.cardExp = '12/28';
    this.cardCvv = '789';
    this.detectedCardBrand = 'visa';
  }

  public clearCardForm() {
    this.cardNumber = '';
    this.cardExp = '';
    this.cardCvv = '';
    this.card2Number = '';
    this.card2Exp = '';
    this.card2Cvv = '';
    this.detectedCardBrand = null;
  }

  public onCardNumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '').substring(0, 16);
    const parts = raw.match(/.{1,4}/g);
    this.cardNumber = parts ? parts.join(' ') : raw;
    input.value = this.cardNumber;
    this.updateCardBrand(raw);
  }

  public updateCardBrand(rawDigits: string) {
    if (rawDigits.startsWith('4')) {
      this.detectedCardBrand = 'visa';
    } else if (/^(5[1-5]|2[2-7])/.test(rawDigits)) {
      this.detectedCardBrand = 'mastercard';
    } else if (/^3[47]/.test(rawDigits)) {
      this.detectedCardBrand = 'amex';
    } else if (/^3(?:0[0-5]|[68])/.test(rawDigits)) {
      this.detectedCardBrand = 'diners';
    } else {
      this.detectedCardBrand = null;
    }
  }

  public onCardExpInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let raw = input.value.replace(/\D/g, '').substring(0, 4);
    if (raw.length >= 3) {
      this.cardExp = `${raw.substring(0, 2)}/${raw.substring(2)}`;
    } else {
      this.cardExp = raw;
    }
    input.value = this.cardExp;
  }

  public onCardCvvInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.cardCvv = input.value.replace(/\D/g, '').substring(0, 4);
    input.value = this.cardCvv;
  }

  public onCard2NumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '').substring(0, 16);
    const parts = raw.match(/.{1,4}/g);
    this.card2Number = parts ? parts.join(' ') : raw;
    input.value = this.card2Number;
  }

  public onCard2ExpInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let raw = input.value.replace(/\D/g, '').substring(0, 4);
    if (raw.length >= 3) {
      this.card2Exp = `${raw.substring(0, 2)}/${raw.substring(2)}`;
    } else {
      this.card2Exp = raw;
    }
    input.value = this.card2Exp;
  }

  public onCard2CvvInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.card2Cvv = input.value.replace(/\D/g, '').substring(0, 4);
    input.value = this.card2Cvv;
  }

  public isFormValid(): boolean {
    return Boolean(
      this.passenger.firstName &&
      this.passenger.lastName &&
      this.passenger.documentNumber &&
      this.passenger.email,
    );
  }

  public finishBookingFlow() {
    this.state.lastBooking.set(null);
    this.state.lastReturnBooking.set(null);
    this.state.selectedOutboundFlight.set(null);
    this.state.selectedReturnFlight.set(null);
    this.state.myLockedOutboundSeats.set([]);
    this.state.myLockedReturnSeats.set([]);
  }

  public async submitBooking() {
    try {
      await this.state.confirmBooking(
        this.passenger,
        this.selectedPaymentMethod,
        this.selectedPaymentMethod === 'CARD'
          ? {
              cardNumber: this.cardNumber,
              expiryDate: this.cardExp,
              cvv: this.cardCvv,
            }
          : undefined,
      );
    } catch {
      // Error manejado en notificaciones de FlightStateService
    }
  }
}
