import { Component, computed, inject, signal, HostListener, ElementRef } from '@angular/core';
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
          
          <!-- Logo & Marca -->
          <div class="flex items-center space-x-3">
            <a routerLink="/" class="flex items-center space-x-2.5 group">
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

            <!-- Enlaces Desktop -->
            <nav class="hidden md:flex ml-8 space-x-1">
              <a
                routerLink="/flights"
                routerLinkActive="bg-red-50 text-davivienda font-semibold"
                [routerLinkActiveOptions]="{ exact: false }"
                class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-davivienda hover:bg-slate-50 transition-colors"
              >
                Vuelos Disponibles
              </a>
              @if (selectedFlight()) {
                <a
                  [routerLink]="['/flight', selectedFlight()?.id, 'seats']"
                  routerLinkActive="bg-red-50 text-davivienda font-semibold"
                  class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-davivienda hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <span>Cabina {{ selectedFlight()?.flightNumber }}</span>
                  @if (myLockedSeats().length > 0) {
                    <span class="w-2 h-2 rounded-full bg-davivienda animate-ping"></span>
                  }
                </a>
              }
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

          <!-- Controles de la Derecha -->
          <div class="flex items-center space-x-2 sm:space-x-3">
            
            @if (myLockedSeats().length > 0) {
              <div class="flex items-center gap-2 bg-gradient-to-r from-red-600 to-davivienda text-white px-3 py-1.5 rounded-full shadow-sm shadow-red-200 text-xs font-semibold animate-pulse">
                <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span class="hidden sm:inline">{{ myLockedSeats().length === 1 ? 'Asiento ' + myLockedSeats()[0].seatNumber : myLockedSeats().length + ' Asientos' }}:</span>
                <span class="font-mono text-sm tracking-wider font-bold font-tabular">{{ formattedRemainingTime() }}</span>
              </div>
            }

            <div
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              [ngClass]="isConnected() ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
              [title]="isConnected() ? 'Conectado al Gateway de WebSockets' : 'Intentando reconectar...'"
            >
              <span
                class="w-2 h-2 rounded-full"
                [ngClass]="isConnected() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"
              ></span>
              <span class="hidden lg:inline">{{ isConnected() ? 'Gateway Conectado' : 'Reconectando...' }}</span>
            </div>

            <!-- Selector Persona Accesible -->
            <div class="relative user-dropdown-container">
              <button
                type="button"
                (click)="toggleUserDropdown($event)"
                [attr.aria-expanded]="isUserMenuOpen()"
                aria-haspopup="true"
                class="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
              >
                <div class="w-5 h-5 rounded-full bg-davivienda text-white flex items-center justify-center font-bold text-[10px]">
                  {{ currentUser().name.charAt(0) }}
                </div>
                <span class="hidden md:inline max-w-[110px] truncate font-semibold">{{ currentUser().name }}</span>
                <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" [ngClass]="{ 'rotate-180': isUserMenuOpen() }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              @if (isUserMenuOpen()) {
                <div class="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div class="px-3.5 py-2 border-b border-slate-100 mb-1">
                    <p class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Modo Demo Concurrente</p>
                    <p class="text-xs text-slate-600">Cambia de perfil para simular colisiones en vivo:</p>
                  </div>
                  @for (user of availableUsers; track user.id) {
                    <button
                      type="button"
                      (click)="switchUser(user)"
                      class="w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-red-50 hover:text-davivienda transition-colors cursor-pointer"
                      [ngClass]="currentUser().id === user.id ? 'font-bold text-davivienda bg-red-50/60' : 'text-slate-700'"
                    >
                      <div>
                        <p class="font-bold">{{ user.name }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">{{ user.id }}</p>
                      </div>
                      @if (currentUser().id === user.id) {
                        <span class="text-sm font-black text-davivienda">✓</span>
                      }
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Botón Hamburguesa Móvil -->
            <button
              type="button"
              (click)="isMobileDrawerOpen.set(!isMobileDrawerOpen())"
              aria-label="Abrir navegación móvil"
              class="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>

          </div>

        </div>
      </div>
    </header>

    <!-- Drawer Móvil con Backdrop Blur -->
    @if (isMobileDrawerOpen()) {
      <div class="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
        <div (click)="isMobileDrawerOpen.set(false)" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"></div>

        <div class="fixed top-0 right-0 w-72 h-full bg-white shadow-2xl p-6 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
          <div>
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <span class="font-extrabold text-slate-900 flex items-center gap-1.5">
                DAVIVIENDA <span class="text-xs text-davivienda font-black">Air</span>
              </span>
              <button
                type="button"
                (click)="isMobileDrawerOpen.set(false)"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <nav class="space-y-2">
              <a
                routerLink="/flights"
                (click)="isMobileDrawerOpen.set(false)"
                class="block px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-davivienda transition-colors"
              >
                ✈️ Vuelos Disponibles
              </a>
              @if (selectedFlight()) {
                <a
                  [routerLink]="['/flight', selectedFlight()?.id, 'seats']"
                  (click)="isMobileDrawerOpen.set(false)"
                  class="block px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-davivienda transition-colors"
                >
                  💺 Cabina {{ selectedFlight()?.flightNumber }}
                </a>
              }
              <a
                routerLink="/dashboard"
                (click)="isMobileDrawerOpen.set(false)"
                class="block px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-davivienda transition-colors"
              >
                📊 Dashboard en Tiempo Real
              </a>
            </nav>
          </div>

          <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span class="text-[10px] uppercase font-bold text-slate-400">Usuario activo:</span>
            <p class="font-bold text-xs text-slate-800">{{ currentUser().name }}</p>
          </div>
        </div>
      </div>
    }
  `,
})
export class NavbarComponent {
  private readonly state = inject(FlightStateService);
  private readonly userSession = inject(UserSessionService);
  private readonly socketService = inject(SocketService);
  private readonly elementRef = inject(ElementRef);

  public readonly selectedFlight = this.state.selectedFlight;
  public readonly myLockedSeats = this.state.myLockedSeats;
  public readonly myLockedSeat = this.state.myLockedSeat;
  public readonly lockSeconds = this.state.lockSecondsRemaining;
  public readonly currentUser = this.userSession.currentUser;
  public readonly availableUsers = this.userSession.availableUsers();
  public readonly isConnected = this.socketService.isConnected;

  public readonly isUserMenuOpen = signal<boolean>(false);
  public readonly isMobileDrawerOpen = signal<boolean>(false);

  public readonly formattedRemainingTime = computed(() => {
    const totalSecs = this.lockSeconds();
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  });

  public toggleUserDropdown(event: Event) {
    event.stopPropagation();
    this.isUserMenuOpen.update((v) => !v);
  }

  public switchUser(user: UserProfile) {
    this.userSession.switchUser(user);
    this.isUserMenuOpen.set(false);
    this.state.addNotification(`Cambiado a perfil: ${user.name}`, 'info');
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.querySelector('.user-dropdown-container')?.contains(event.target as Node)) {
      this.isUserMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  public onEscapeKey() {
    this.isUserMenuOpen.set(false);
    this.isMobileDrawerOpen.set(false);
  }
}
