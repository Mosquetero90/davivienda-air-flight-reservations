import {
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface PassengerBreakdown {
  adults: number;
  children: number;
  infants: number;
}

@Component({
  selector: 'app-passenger-selector',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PassengerSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative w-full text-slate-800" [ngClass]="{ 'z-50': isOpen }">
      
      <!-- Trigger Card matching reference UI -->
      <div
        (click)="toggleOpen($event)"
        class="w-full flex items-center justify-between bg-white hover:bg-slate-50/80 border rounded-2xl px-4 py-2.5 min-h-[58px] transition-all cursor-pointer select-none shadow-xs"
        [ngClass]="{
          'border-davivienda ring-2 ring-davivienda/20': isOpen,
          'border-slate-300': !isOpen
        }"
      >
        <div class="flex items-center gap-3 overflow-hidden">
          <!-- Person + Plus Icon -->
          <div class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 bg-slate-100 transition-colors shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>

          <!-- Label & Count -->
          <div class="truncate text-left">
            <span class="block text-[11px] font-medium text-slate-500 leading-tight">
              Pasajeros
            </span>
            <span class="block text-sm font-extrabold text-slate-900 leading-tight">
              {{ totalCount }} {{ totalCount === 1 ? 'Pasajero' : 'Pasajeros' }}
            </span>
          </div>
        </div>

        <!-- Chevron Down -->
        <div class="flex items-center ml-2 shrink-0">
          <svg
            class="w-4 h-4 text-slate-500 transition-transform duration-200"
            [ngClass]="{ 'rotate-180 text-davivienda': isOpen }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Floating Popover Dropdown -->
      <div
        *ngIf="isOpen"
        class="absolute right-0 sm:left-0 mt-2 z-50 w-[300px] sm:w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 transition-all duration-150 animate-in fade-in zoom-in-95"
      >
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <span class="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Seleccionar Pasajeros
          </span>
          <span class="text-[11px] font-semibold text-slate-400">
            Máximo 9
          </span>
        </div>

        <!-- Category: Adultos -->
        <div class="flex items-center justify-between py-2 border-b border-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-800">Adultos</p>
            <p class="text-[11px] text-slate-400">Mayores de 12 años</p>
          </div>
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              (click)="changeAdults(-1, $event)"
              [disabled]="breakdown.adults <= 1"
              class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              -
            </button>
            <span class="w-5 text-center font-bold text-xs text-slate-900">{{ breakdown.adults }}</span>
            <button
              type="button"
              (click)="changeAdults(1, $event)"
              [disabled]="totalCount >= maxPassengers"
              class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <!-- Category: Niños -->
        <div class="flex items-center justify-between py-2 border-b border-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-800">Niños</p>
            <p class="text-[11px] text-slate-400">De 2 a 11 años</p>
          </div>
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              (click)="changeChildren(-1, $event)"
              [disabled]="breakdown.children <= 0"
              class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              -
            </button>
            <span class="w-5 text-center font-bold text-xs text-slate-900">{{ breakdown.children }}</span>
            <button
              type="button"
              (click)="changeChildren(1, $event)"
              [disabled]="totalCount >= maxPassengers"
              class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <!-- Category: Bebés -->
        <div class="flex items-center justify-between py-2 border-b border-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-800">Bebés</p>
            <p class="text-[11px] text-slate-400">Menores de 2 años</p>
          </div>
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              (click)="changeInfants(-1, $event)"
              [disabled]="breakdown.infants <= 0"
              class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              -
            </button>
            <span class="w-5 text-center font-bold text-xs text-slate-900">{{ breakdown.infants }}</span>
            <button
              type="button"
              (click)="changeInfants(1, $event)"
              [disabled]="totalCount >= maxPassengers || breakdown.infants >= breakdown.adults"
              class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <!-- Footer / Apply -->
        <div class="pt-3 mt-1 flex items-center justify-end">
          <button
            type="button"
            (click)="closeDropdown($event)"
            class="px-4 py-1.5 bg-davivienda hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Listo
          </button>
        </div>
      </div>

    </div>
  `,
})
export class PassengerSelectorComponent implements ControlValueAccessor {
  @Input() maxPassengers = 9;

  public isOpen = false;

  public breakdown: PassengerBreakdown = {
    adults: 1,
    children: 0,
    infants: 0,
  };

  public get totalCount(): number {
    return this.breakdown.adults + this.breakdown.children + this.breakdown.infants;
  }

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  public toggleOpen(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
    }
  }

  public closeDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = false;
  }

  public changeAdults(delta: number, event: MouseEvent): void {
    event.stopPropagation();
    const next = this.breakdown.adults + delta;
    if (next >= 1 && this.totalCount + delta <= this.maxPassengers) {
      this.breakdown.adults = next;
      // If infants exceed adults, reduce infants
      if (this.breakdown.infants > this.breakdown.adults) {
        this.breakdown.infants = this.breakdown.adults;
      }
      this.emitChange();
    }
  }

  public changeChildren(delta: number, event: MouseEvent): void {
    event.stopPropagation();
    const next = this.breakdown.children + delta;
    if (next >= 0 && this.totalCount + delta <= this.maxPassengers) {
      this.breakdown.children = next;
      this.emitChange();
    }
  }

  public changeInfants(delta: number, event: MouseEvent): void {
    event.stopPropagation();
    const next = this.breakdown.infants + delta;
    if (next >= 0 && next <= this.breakdown.adults && this.totalCount + delta <= this.maxPassengers) {
      this.breakdown.infants = next;
      this.emitChange();
    }
  }

  private emitChange(): void {
    this.onChange(this.totalCount);
  }

  // --- ControlValueAccessor Implementation ---
  writeValue(value: number): void {
    if (typeof value === 'number' && value >= 1) {
      // Set adults to the total value, reset children & infants
      this.breakdown.adults = value;
      this.breakdown.children = 0;
      this.breakdown.infants = 0;
    }
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
