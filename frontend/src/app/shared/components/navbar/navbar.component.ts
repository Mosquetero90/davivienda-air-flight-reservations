import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FlightStateService } from '../../../core/state/flight-state.service';
import { UserSessionService, UserProfile } from '../../../core/services/user-session.service';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  host: {
    class: 'fixed top-0 inset-x-0 z-50 block w-full h-16 bg-white',
  },
  template: `
    <header class="bg-white border-b border-slate-200 shadow-sm w-full h-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-3">
            <a routerLink="/" class="flex items-center space-x-2.5 group">
              <!-- Davivienda Casita Red Icon -->
              <div class="w-10 h-10 bg-davivienda rounded-xl flex items-center justify-center text-white shadow-md shadow-red-200 group-hover:scale-105 transition-transform">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
                </svg>
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-lg leading-tight tracking-tight text-slate-900 flex items-center gap-1.5">
                  DAVIVIENDA <span class="text-xs font-semibold uppercase tracking-wider text-davivienda bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Air</span>
                </span>
                <span class="text-[11px] font-medium text-slate-500">Sistema de Reservas en Tiempo Real</span>
              </div>
            </a>

            <!-- Navigation Links -->
            <nav class="hidden md:flex ml-8 space-x-1">
              <a
                routerLink="/flights"
                routerLinkActive="bg-red-50 text-davivienda font-semibold"
                [routerLinkActiveOptions]="{ exact: false }"
                class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-davivienda hover:bg-slate-50 transition-colors"
              >
                Vuelos Disponibles
              </a>
              <a
                *ngIf="selectedFlight()"
                [routerLink]="['/flight', selectedFlight()?.id, 'seats']"
                routerLinkActive="bg-red-50 text-davivienda font-semibold"
                class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-davivienda hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <span>Cabina {{ selectedFlight()?.flightNumber }}</span>
                <span *ngIf="myLockedSeat()" class="w-2 h-2 rounded-full bg-davivienda animate-ping"></span>
              </a>
              <a
                routerLink="/dashboard"
                routerLinkActive="bg-red-50 text-davivienda font-semibold"
                class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-davivienda hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <span>Dashboard de Ocupación</span>
                <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">LIVE</span>
              </a>
            </nav>
          </div>

          <!-- Right: Timer, Socket Indicator & Persona Switcher -->
          <div class="flex items-center space-x-3 sm:space-x-4">
            
            <!-- Active 5-min TTL Countdown Timer -->
            <div
              *ngIf="myLockedSeat()"
              class="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full shadow-sm shadow-red-200 text-xs font-semibold animate-pulse"
            >
              <svg class="w-4 h-4 animate-spin" style="animation-duration: 4s;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="2" stroke="currentColor" stroke-dasharray="32" stroke-linecap="round"/>
              </svg>
              <span>Asiento {{ myLockedSeat()?.seatNumber }}:</span>
              <span class="font-mono text-sm tracking-wider font-bold">{{ formattedRemainingTime() }}</span>
            </div>

            <!-- Socket.io Live Status Badge -->
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                 [ngClass]="isConnected() ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'">
              <span class="w-2 h-2 rounded-full"
                    [ngClass]="isConnected() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
              <span class="hidden sm:inline">{{ isConnected() ? 'Gateway Conectado' : 'Reconectando...' }}</span>
            </div>

            <!-- Demo Persona Selector (Para evaluar concurrencia entre pestañas) -->
            <div class="relative group">
              <button class="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-200">
                <div class="w-5 h-5 rounded-full bg-davivienda text-white flex items-center justify-center font-bold text-[10px]">
                  {{ currentUser().name.charAt(0) }}
                </div>
                <span class="hidden sm:inline max-w-[120px] truncate">{{ currentUser().name }}</span>
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Persona Dropdown -->
              <div class="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover:block z-50">
                <div class="px-3 py-1.5 border-b border-slate-100 mb-1">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Modo Demo Multiusuario</p>
                  <p class="text-[11px] text-slate-500">Cambia de usuario para simular concurrencia en vivo:</p>
                </div>
                <div *ngFor="let user of availableUsers">
                  <button
                    (click)="switchUser(user)"
                    class="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-red-50 hover:text-davivienda transition-colors"
                    [ngClass]="currentUser().id === user.id ? 'font-bold text-davivienda bg-red-50/50' : 'text-slate-700'"
                  >
                    <div>
                      <p class="font-medium">{{ user.name }}</p>
                      <p class="text-[10px] text-slate-400">{{ user.id }}</p>
                    </div>
                    <span *ngIf="currentUser().id === user.id" class="text-xs text-davivienda">✓</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  private readonly state = inject(FlightStateService);
  private readonly userSession = inject(UserSessionService);
  private readonly socketService = inject(SocketService);

  public readonly selectedFlight = this.state.selectedFlight;
  public readonly myLockedSeat = this.state.myLockedSeat;
  public readonly lockSeconds = this.state.lockSecondsRemaining;
  public readonly currentUser = this.userSession.currentUser;
  public readonly availableUsers = this.userSession.availableUsers();
  public readonly isConnected = this.socketService.isConnected;

  public readonly formattedRemainingTime = computed(() => {
    const totalSecs = this.lockSeconds();
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  });

  public switchUser(user: UserProfile) {
    this.userSession.switchUser(user);
    this.state.addNotification(`Cambiado a perfil: ${user.name}`, 'info');
  }
}
