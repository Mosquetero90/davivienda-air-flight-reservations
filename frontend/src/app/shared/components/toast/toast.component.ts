import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlightStateService, AppNotification } from '../../../core/state/flight-state.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      <div
        *ngFor="let n of notifications()"
        class="pointer-events-auto transform transition-all duration-300 ease-out flex items-start p-4 rounded-xl shadow-xl border backdrop-blur-md bg-white/95"
        [ngClass]="{
          'border-emerald-200 text-emerald-950': n.type === 'success',
          'border-amber-200 text-amber-950': n.type === 'warning',
          'border-red-200 text-red-950': n.type === 'error',
          'border-blue-200 text-blue-950': n.type === 'info'
        }"
      >
        <!-- Icon -->
        <div class="mr-3 flex-shrink-0 mt-0.5">
          <span *ngIf="n.type === 'success'" class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">✓</span>
          <span *ngIf="n.type === 'warning'" class="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">⚠️</span>
          <span *ngIf="n.type === 'error'" class="w-6 h-6 rounded-full bg-red-100 text-davivienda flex items-center justify-center font-bold text-xs">✕</span>
          <span *ngIf="n.type === 'info'" class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">ℹ</span>
        </div>

        <!-- Content -->
        <div class="flex-1 text-xs font-medium leading-relaxed">
          {{ n.message }}
        </div>

        <!-- Close button -->
        <button
          (click)="dismiss(n.id)"
          class="ml-2 text-slate-400 hover:text-slate-700 text-sm font-bold leading-none p-1"
        >
          &times;
        </button>
      </div>
    </div>
  `,
})
export class ToastComponent {
  private readonly state = inject(FlightStateService);
  public readonly notifications = this.state.notifications;

  public dismiss(id: string) {
    this.state.dismissNotification(id);
  }
}
