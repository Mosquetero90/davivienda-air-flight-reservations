import {
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface CalendarDay {
  dayNumber: number;
  dateString: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative w-full text-slate-800" [ngClass]="{ 'z-50': isOpen }">
      <!-- Label Superior Opcional si se especifica -->
      <label *ngIf="label" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        {{ label }}
      </label>

      <!-- Trigger Input Button -->
      <div
        (click)="toggleOpen($event)"
        class="w-full flex items-center justify-between text-sm font-semibold transition-all select-none"
        [ngClass]="{
          'opacity-50 cursor-not-allowed bg-slate-50/50': disabled,
          'cursor-pointer': !disabled,
          'px-2 py-1.5 border-0 bg-transparent': seamless,
          'px-3.5 py-2.5 border rounded-2xl min-h-[58px] bg-white hover:bg-slate-50/80 shadow-xs': !seamless,
          'border-davivienda ring-2 ring-davivienda/20': !seamless && isOpen,
          'border-slate-300': !seamless && !isOpen
        }"
      >
        <div class="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <!-- Calendario Icono con badge sutil Davivienda -->
          <div
            *ngIf="showIcon"
            class="flex items-center justify-center transition-colors shrink-0"
            [ngClass]="[
              seamless ? 'w-7 h-7 rounded-lg' : 'w-8 h-8 rounded-xl',
              value ? 'bg-red-50 text-davivienda' : 'bg-slate-100 text-slate-500'
            ]"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <!-- Texto de Selección o Placeholder -->
          <div class="truncate text-left flex-1 min-w-0">
            <span *ngIf="compactLabel" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight truncate">
              {{ compactLabel }}
            </span>
            <span *ngIf="!value" class="block text-xs sm:text-sm font-extrabold text-slate-400 truncate whitespace-nowrap">
              {{ placeholder }}
            </span>
            <span *ngIf="value" class="block text-xs sm:text-sm font-extrabold text-slate-900 truncate whitespace-nowrap">
              {{ formattedDisplayDate }}
            </span>
          </div>
        </div>

        <!-- Acciones a la derecha: Limpiar rápido o Chevron -->
        <div class="flex items-center gap-1 ml-2 shrink-0">
          <button
            *ngIf="value && !disabled"
            type="button"
            (click)="clearSelection($event)"
            title="Limpiar fecha"
            class="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <svg
            *ngIf="!disabled"
            class="w-4 h-4 text-slate-400 transition-transform duration-200"
            [ngClass]="{ 'rotate-180 text-davivienda': isOpen }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Floating Popover Dropdown -->
      <div
        *ngIf="isOpen"
        class="absolute left-0 mt-2 z-50 w-[310px] sm:w-[330px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 transition-all duration-150"
      >
        <!-- Quick Preset Chips -->
        <div class="flex items-center gap-1.5 pb-3 border-b border-slate-100 overflow-x-auto cabin-scrollbar">
          <button
            type="button"
            (click)="selectPreset('today')"
            [disabled]="isPresetDisabled('today')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border disabled:opacity-30 disabled:cursor-not-allowed"
            [ngClass]="value === todayIso ? 'bg-red-50 border-davivienda text-davivienda' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'"
          >
            ⚡ Hoy
          </button>
          <button
            type="button"
            (click)="selectPreset('tomorrow')"
            [disabled]="isPresetDisabled('tomorrow')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border disabled:opacity-30 disabled:cursor-not-allowed"
            [ngClass]="value === tomorrowIso ? 'bg-red-50 border-davivienda text-davivienda' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'"
          >
            ✈️ Mañana
          </button>
          <button
            type="button"
            (click)="selectPreset('weekend')"
            [disabled]="isPresetDisabled('weekend')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border disabled:opacity-30 disabled:cursor-not-allowed"
            [ngClass]="value === weekendIso ? 'bg-red-50 border-davivienda text-davivienda' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'"
          >
            🌴 Fin de semana
          </button>
        </div>

        <!-- Month Navigation Header -->
        <div class="flex items-center justify-between py-2.5">
          <button
            type="button"
            (click)="prevMonth()"
            [disabled]="isPrevMonthDisabled"
            class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mes anterior"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span class="text-sm font-bold text-slate-800 capitalize">
            {{ currentMonthName }} {{ currentYear }}
          </span>

          <button
            type="button"
            (click)="nextMonth()"
            class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            title="Mes siguiente"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Day Names Header -->
        <div class="grid grid-cols-7 gap-1 text-center mb-1">
          <span
            *ngFor="let name of weekDayNames"
            class="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1"
          >
            {{ name }}
          </span>
        </div>

        <!-- Calendar Days Matrix -->
        <div class="grid grid-cols-7 gap-1 text-center">
          <!-- Empty Slots (Padding for first day of month) -->
          <div *ngFor="let empty of emptyOffsetDays" class="h-8 w-8"></div>

          <!-- Active Day Cells -->
          <button
            *ngFor="let day of calendarDays"
            type="button"
            [disabled]="day.isPast"
            (click)="selectDate(day.dateString)"
            class="h-8 w-8 mx-auto flex items-center justify-center text-xs font-semibold rounded-xl transition-all relative"
            [ngClass]="{
              'bg-gradient-to-br from-red-600 to-davivienda text-white font-black shadow-md shadow-red-200 scale-105 z-10': day.isSelected,
              'text-slate-700 hover:bg-red-50 hover:text-davivienda': !day.isSelected && !day.isPast,
              'text-slate-300 line-through decoration-slate-200 cursor-not-allowed opacity-50': day.isPast,
              'ring-1 ring-davivienda text-davivienda': day.isToday && !day.isSelected
            }"
          >
            {{ day.dayNumber }}
          </button>
        </div>

        <!-- Footer Actions -->
        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            (click)="clearSelection($event)"
            class="text-slate-400 hover:text-slate-600 font-semibold px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            Limpiar
          </button>

          <button
            type="button"
            (click)="close()"
            class="bg-davivienda hover:bg-red-700 text-white font-bold px-3 py-1 rounded-lg shadow-sm shadow-red-200 transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() compactLabel = '';
  @Input() placeholder = 'Seleccionar fecha de salida';
  @Input() minDate?: string;
  @Input() disabled = false;
  @Input() seamless = false;
  @Input() showIcon = true;

  public isOpen = false;
  public value = ''; // YYYY-MM-DD
  public onChange: (val: string) => void = () => {};
  public onTouched: () => void = () => {};

  public viewYear = new Date().getFullYear();
  public viewMonth = new Date().getMonth(); // 0-indexed

  public readonly weekDayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  public readonly monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  constructor(private readonly elementRef: ElementRef) {}

  // ControlValueAccessor methods
  writeValue(val: string): void {
    this.value = val || '';
    if (this.value) {
      const parsed = this.parseDate(this.value);
      if (parsed) {
        this.viewYear = parsed.getFullYear();
        this.viewMonth = parsed.getMonth();
      }
    }
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Getters for display
  get currentMonthName(): string {
    return this.monthNames[this.viewMonth];
  }

  get currentYear(): number {
    return this.viewYear;
  }

  get todayIso(): string {
    return this.formatIso(new Date());
  }

  get tomorrowIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return this.formatIso(d);
  }

  get weekendIso(): string {
    const d = new Date();
    const dayOfWeek = d.getDay();
    // Próximo sábado (day 6)
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSaturday);
    return this.formatIso(d);
  }

  public isPresetDisabled(preset: 'today' | 'tomorrow' | 'weekend'): boolean {
    const todayStr = this.todayIso;
    const effectiveMinStr = this.minDate && this.minDate > todayStr ? this.minDate : todayStr;
    let target = this.todayIso;
    if (preset === 'tomorrow') target = this.tomorrowIso;
    if (preset === 'weekend') target = this.weekendIso;
    return target < effectiveMinStr;
  }

  get isPrevMonthDisabled(): boolean {
    const today = new Date();
    const effectiveMin = this.minDate && this.minDate > this.todayIso ? this.parseDate(this.minDate) || today : today;
    return (
      this.viewYear < effectiveMin.getFullYear() ||
      (this.viewYear === effectiveMin.getFullYear() && this.viewMonth <= effectiveMin.getMonth())
    );
  }

  get formattedDisplayDate(): string {
    if (!this.value) return '';
    const parsed = this.parseDate(this.value);
    if (!parsed) return this.value;

    const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthsShort = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    const dayName = daysShort[parsed.getDay()];
    const dayNum = parsed.getDate();
    const monthName = monthsShort[parsed.getMonth()];
    const year = parsed.getFullYear();

    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  }

  get emptyOffsetDays(): number[] {
    const firstDayOfWeek = new Date(this.viewYear, this.viewMonth, 1).getDay();
    return Array.from({ length: firstDayOfWeek });
  }

  get calendarDays(): CalendarDay[] {
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const todayStr = this.todayIso;
    const effectiveMinStr = this.minDate && this.minDate > todayStr ? this.minDate : todayStr;
    const days: CalendarDay[] = [];

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const date = new Date(this.viewYear, this.viewMonth, dayNum);
      const dateString = this.formatIso(date);

      days.push({
        dayNumber: dayNum,
        dateString,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        isSelected: dateString === this.value,
        isPast: dateString < effectiveMinStr,
      });
    }

    return days;
  }

  // User interactions
  toggleOpen(event: MouseEvent): void {
    if (this.disabled) return;
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.value) {
      const parsed = this.parseDate(this.value);
      if (parsed) {
        this.viewYear = parsed.getFullYear();
        this.viewMonth = parsed.getMonth();
      }
    }
  }

  close(): void {
    this.isOpen = false;
    this.onTouched();
  }

  prevMonth(): void {
    if (this.isPrevMonthDisabled) return;
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else {
      this.viewMonth--;
    }
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else {
      this.viewMonth++;
    }
  }

  selectDate(dateStr: string): void {
    const todayStr = this.todayIso;
    const effectiveMinStr = this.minDate && this.minDate > todayStr ? this.minDate : todayStr;
    if (dateStr < effectiveMinStr) return;

    this.value = dateStr;
    this.onChange(this.value);
    this.close();
  }

  selectPreset(preset: 'today' | 'tomorrow' | 'weekend'): void {
    if (this.isPresetDisabled(preset)) return;
    let target = this.todayIso;
    if (preset === 'tomorrow') target = this.tomorrowIso;
    if (preset === 'weekend') target = this.weekendIso;

    this.selectDate(target);
  }

  clearSelection(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.value = '';
    this.onChange('');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close();
  }

  // Helpers
  private formatIso(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDate(iso: string): Date | null {
    if (!iso) return null;
    const parts = iso.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
}
