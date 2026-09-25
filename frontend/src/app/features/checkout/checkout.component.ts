import { Component, OnInit, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FlightStateService } from '../../core/state/flight-state.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { BookingPassengerDto, BookingResponseDto } from '@davivienda/shared';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        
        <!-- Case 1: Booking Confirmed Screen (Boarding Pass / Pasabordo Digital) -->
        <div *ngIf="confirmedBooking()" class="animate-in fade-in zoom-in-95 duration-500">
          
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-inner mb-3">
              ✓
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ¡Tu Reserva ha sido Confirmada!
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Hemos enviado la confirmación y el tiquete electrónico a tu correo registrado.
            </p>
          </div>

          <!-- Digital Boarding Pass Ticket Card -->
          <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl mx-auto relative">
            
            <!-- Red Header -->
            <div class="bg-gradient-to-r from-red-600 to-davivienda text-white p-6 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white text-davivienda rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                  🏠
                </div>
                <div>
                  <span class="font-extrabold text-lg tracking-wider">DAVIVIENDA AIR</span>
                  <p class="text-[11px] text-red-100">Pasabordo Digital &bull; Vuelo Nacional</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-red-100 font-bold uppercase tracking-widest block">Código PNR</span>
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
                  <p class="text-xs font-semibold text-slate-500">{{ confirmedBooking()?.departureTime | date:'shortTime' }}</p>
                </div>
                
                <div class="flex flex-col items-center">
                  <span class="text-xs font-bold text-davivienda">Directo</span>
                  <span class="text-xl text-slate-300">✈</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ confirmedBooking()?.flightNumber }}</span>
                </div>

                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destino</span>
                  <h3 class="text-2xl font-black text-slate-900">{{ confirmedBooking()?.destination }}</h3>
                  <p class="text-xs font-semibold text-slate-500">Hora estimada llegada</p>
                </div>
              </div>

              <!-- Passenger & Seat Details Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pasajero</span>
                  <p class="text-xs font-bold text-slate-800 mt-0.5 truncate">{{ confirmedBooking()?.passengerName }}</p>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asiento</span>
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

              <!-- Barcode / QR Simulation -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div class="flex items-center gap-2">
                  <!-- Barcode Visual Lines -->
                  <div class="flex items-center gap-1 h-12 bg-slate-100 px-4 rounded-xl border border-slate-200">
                    <span class="w-1 h-8 bg-slate-800"></span>
                    <span class="w-2 h-8 bg-slate-800"></span>
                    <span class="w-0.5 h-8 bg-slate-800"></span>
                    <span class="w-1.5 h-8 bg-slate-800"></span>
                    <span class="w-1 h-8 bg-slate-800"></span>
                    <span class="w-2.5 h-8 bg-slate-800"></span>
                    <span class="w-1 h-8 bg-slate-800"></span>
                    <span class="w-0.5 h-8 bg-slate-800"></span>
                    <span class="w-2 h-8 bg-slate-800"></span>
                    <span class="w-1 h-8 bg-slate-800"></span>
                  </div>
                  <span class="font-mono text-xs text-slate-500 font-bold">{{ confirmedBooking()?.bookingReference }}</span>
                </div>

                <div class="text-right">
                  <span class="text-[10px] text-slate-400 block font-medium">Total Pagado:</span>
                  <span class="text-lg font-black text-slate-900">
                    $ {{ confirmedBooking()?.totalPaid | number }} COP
                  </span>
                </div>
              </div>

            </div>

            <!-- Action buttons below ticket -->
            <div class="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onclick="window.print()"
                class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>🖨️ Imprimir Pasabordo</span>
              </button>

              <a
                routerLink="/flights"
                class="px-5 py-2.5 rounded-xl bg-davivienda hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-200 transition-colors"
              >
                Volver a Vuelos
              </a>
            </div>

          </div>

        </div>

        <!-- Case 2: Checkout Form & Payment -->
        <div *ngIf="!confirmedBooking()">
          
          <!-- Back Link & Header -->
          <div class="flex items-center justify-between mb-6">
            <a [routerLink]="['/flight', flightId(), 'seats']" class="text-xs font-bold text-slate-600 hover:text-davivienda flex items-center gap-1.5">
              &larr; Volver al Mapa de Cabina
            </a>

            <!-- Countdown Pill -->
            <div *ngIf="myLockedSeat()" class="flex items-center gap-2 bg-red-50 text-davivienda border border-red-200 px-3.5 py-1.5 rounded-full text-xs font-bold">
              <span>Tiempo para completar tu compra:</span>
              <span class="font-mono text-sm tracking-wider">{{ formattedRemainingTime() }}</span>
            </div>
          </div>

          <!-- If no seat is locked, display warning and redirect -->
          <div *ngIf="!myLockedSeat()" class="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center">
            <h2 class="text-lg font-bold text-amber-900">No tienes un asiento bloqueado actualmente</h2>
            <p class="text-xs text-amber-700 mt-1 mb-4">Selecciona primero un asiento en el mapa de cabina para proceder al pago.</p>
            <a [routerLink]="['/flight', flightId(), 'seats']" class="inline-block px-5 py-2.5 bg-davivienda text-white font-bold text-xs rounded-xl shadow-md">
              Ir a Seleccionar Asiento
            </a>
          </div>

          <!-- Checkout Layout: 2 Columns (Form on left, Order summary on right) -->
          <div *ngIf="myLockedSeat()" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Left 2 Cols: Passenger and Payment Form -->
            <div class="lg:col-span-2 space-y-6">
              
              <!-- 1. Passenger Information Card -->
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-red-100 text-davivienda flex items-center justify-center text-xs font-black">1</span>
                    Información del Pasajero
                  </h2>
                  <span class="text-xs text-slate-500 font-medium">Asiento {{ myLockedSeat()?.seatNumber }}</span>
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
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-davivienda/20 focus:border-davivienda"
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

                  <!-- Tarjeta Davivienda -->
                  <div
                    (click)="selectedPaymentMethod = 'CARD'"
                    class="p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                    [ngClass]="selectedPaymentMethod === 'CARD' ? 'border-davivienda bg-red-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-extrabold text-sm text-slate-800">Tarjeta</span>
                      <span *ngIf="selectedPaymentMethod === 'CARD'" class="text-davivienda font-bold">✓</span>
                    </div>
                    <p class="text-[11px] text-slate-500">Crédito o Débito Davivienda.</p>
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

                <!-- DaviPlata Extra Info -->
                <div *ngIf="selectedPaymentMethod === 'DAVIPLATA'" class="bg-red-50/60 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-daviplata text-white flex items-center justify-center font-bold text-sm">
                    📱
                  </div>
                  <div class="text-xs text-slate-700">
                    <p class="font-bold text-slate-900">Confirmación vía DaviPlata</p>
                    <p class="text-slate-500">Se debitarán $ {{ myLockedSeat()?.price | number }} COP del número {{ passenger.phone }}</p>
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

                <!-- Flight details -->
                <div class="space-y-3 pb-4 border-b border-slate-100 text-xs">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Vuelo:</span>
                    <span class="font-bold text-slate-800">{{ flight()?.flightNumber }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Ruta:</span>
                    <span class="font-bold text-slate-800">{{ flight()?.originCode }} &rarr; {{ flight()?.destinationCode }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Asiento Seleccionado:</span>
                    <span class="font-bold text-davivienda">{{ myLockedSeat()?.seatNumber }} ({{ myLockedSeat()?.seatClass }})</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Estado del Lock:</span>
                    <span class="font-semibold text-emerald-600">Activo (Redis)</span>
                  </div>
                </div>

                <!-- Price Breakdown -->
                <div class="space-y-2 py-4 border-b border-slate-100 text-xs">
                  <div class="flex justify-between text-slate-500">
                    <span>Tarifa Base</span>
                    <span>$ {{ (myLockedSeat()?.price || 0) * 0.81 | number:'1.0-0' }} COP</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>IVA y Tasas (19%)</span>
                    <span>$ {{ (myLockedSeat()?.price || 0) * 0.19 | number:'1.0-0' }} COP</span>
                  </div>
                  <div class="flex justify-between text-base font-black text-slate-900 pt-2">
                    <span>Total a Pagar:</span>
                    <span class="text-davivienda">$ {{ myLockedSeat()?.price | number }} COP</span>
                  </div>
                </div>

                <!-- Submit Button -->
                <button
                  (click)="submitBooking()"
                  [disabled]="isSubmitting() || !isFormValid()"
                  class="mt-6 w-full py-3.5 rounded-xl bg-davivienda hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <span *ngIf="isSubmitting()" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-r-transparent"></span>
                  <span>{{ isSubmitting() ? 'Procesando Transacción ACID...' : 'Pagar y Confirmar Reserva' }}</span>
                </button>

                <p class="text-[10px] text-center text-slate-400 mt-3">
                  Transacción protegida con estándar bancario Davivienda. El código PNR será generado al instante.
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

  private readonly state = inject(FlightStateService);
  private readonly userSession = inject(UserSessionService);
  private readonly router = inject(Router);

  public readonly flight = this.state.selectedFlight;
  public readonly myLockedSeat = this.state.myLockedSeat;
  public readonly lockSeconds = this.state.lockSecondsRemaining;
  public readonly confirmedBooking = this.state.lastBooking;

  public selectedPaymentMethod: 'DAVIPLATA' | 'CARD' | 'PSE' = 'DAVIPLATA';
  public isSubmitting = this.state.isLoading;

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
    const currentUser = this.userSession.currentUser();
    // Autocompletar con los datos del perfil activo
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

  public isFormValid(): boolean {
    return Boolean(
      this.passenger.firstName &&
      this.passenger.lastName &&
      this.passenger.documentNumber &&
      this.passenger.email,
    );
  }

  public async submitBooking() {
    try {
      await this.state.confirmBooking(this.passenger, this.selectedPaymentMethod);
    } catch {
      // Error manejado en notificaciones de FlightStateService
    }
  }
}
