import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-virtual-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="perspective-1000 w-full max-w-[380px] h-[215px] mx-auto select-none">
      <div
        class="relative w-full h-full duration-500 preserve-3d transition-transform rounded-2xl shadow-xl"
        [ngClass]="{ 'rotate-y-180': isFlipped() }"
      >
        <!-- FRENTE DE LA TARJETA -->
        <div class="absolute inset-0 w-full h-full rounded-2xl backface-hidden p-6 bg-gradient-to-tr from-slate-900 via-slate-800 to-red-950 text-white flex flex-col justify-between border border-white/20 shadow-2xl overflow-hidden">
          <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-davivienda/20 blur-2xl pointer-events-none"></div>

          <div class="flex items-center justify-between relative z-10">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-davivienda flex items-center justify-center text-white font-bold text-xs shadow-sm">
                🏠
              </div>
              <span class="font-extrabold text-sm tracking-wider text-slate-100">DAVIVIENDA</span>
            </div>
            <div class="font-black text-xs px-2.5 py-1 rounded bg-white/10 backdrop-blur-xs border border-white/15">
              {{ cardBrandLabel() }}
            </div>
          </div>

          <div class="flex items-center gap-3 relative z-10">
            <div class="w-10 h-7 rounded-md bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 border border-amber-500 shadow-inner flex items-center justify-center">
              <div class="w-8 h-5 border border-amber-700/40 rounded-xs opacity-60"></div>
            </div>
            <svg class="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.393 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>

          <div class="relative z-10">
            <p class="font-mono text-lg sm:text-xl font-bold tracking-widest text-slate-100 drop-shadow-sm font-tabular">
              {{ formattedCardNumber() }}
            </p>
          </div>

          <div class="flex items-center justify-between text-xs relative z-10">
            <div>
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Titular</span>
              <p class="font-semibold uppercase tracking-wider text-slate-100 truncate max-w-[190px]">
                {{ cardHolder() || 'NOMBRE DEL TITULAR' }}
              </p>
            </div>
            <div class="text-right">
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Vence</span>
              <p class="font-mono font-bold tracking-widest text-slate-100">
                {{ cardExp() || 'MM/AA' }}
              </p>
            </div>
          </div>
        </div>

        <!-- REVERSO DE LA TARJETA (CVV) -->
        <div class="absolute inset-0 w-full h-full rounded-2xl backface-hidden rotate-y-180 bg-slate-900 text-white flex flex-col justify-between py-6 border border-white/20 shadow-2xl overflow-hidden">
          <div class="w-full h-10 bg-black mt-2"></div>

          <div class="px-6">
            <div class="w-full h-8 bg-slate-200 rounded flex items-center justify-end px-3">
              <span class="font-mono text-slate-900 font-black text-sm tracking-widest">
                {{ cardCvv() || '•••' }}
              </span>
            </div>
            <p class="text-[9px] text-slate-400 mt-1 text-right">Código de Seguridad (CVV)</p>
          </div>

          <div class="px-6 text-[9px] text-slate-400 leading-tight">
            <p>Tarjeta emitida por Banco Davivienda S.A. Uso personal e intransferible.</p>
          </div>
        </div>

      </div>
    </div>
  `
})
export class VirtualCardComponent {
  public readonly cardNumber = input<string>('');
  public readonly cardHolder = input<string>('');
  public readonly cardExp = input<string>('');
  public readonly cardCvv = input<string>('');
  public readonly isFlipped = input<boolean>(false);

  public readonly cardBrand = computed<'visa' | 'mastercard' | 'amex' | 'diners' | 'generic'>(() => {
    const raw = this.cardNumber().replace(/\D/g, '');
    if (raw.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(raw) || /^2[2-7]/.test(raw)) return 'mastercard';
    if (/^3[47]/.test(raw)) return 'amex';
    if (/^3(?:0[0-5]|[68])/.test(raw)) return 'diners';
    return 'generic';
  });

  public readonly cardBrandLabel = computed<string>(() => {
    switch (this.cardBrand()) {
      case 'visa': return 'VISA';
      case 'mastercard': return 'Mastercard';
      case 'amex': return 'AMEX';
      case 'diners': return 'Diners Club';
      default: return 'Crédito / Débito';
    }
  });

  public readonly formattedCardNumber = computed<string>(() => {
    const raw = this.cardNumber().replace(/\D/g, '').padEnd(16, '•').slice(0, 16);
    return `${raw.slice(0, 4)}  ${raw.slice(4, 8)}  ${raw.slice(8, 12)}  ${raw.slice(12, 16)}`;
  });
}
