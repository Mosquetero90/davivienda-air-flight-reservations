import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-virtual-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="perspective-1000 w-full max-w-[380px] h-[215px] mx-auto select-none cursor-pointer"
      (click)="toggleFlip()"
      title="Clic para voltear tarjeta"
    >
      <div
        class="relative w-full h-full duration-500 preserve-3d transition-transform rounded-2xl shadow-xl"
        [ngClass]="{ 'rotate-y-180': isFlipped() }"
      >
        <!-- FRENTE DE LA TARJETA -->
        <div class="absolute inset-0 w-full h-full rounded-2xl backface-hidden p-6 bg-gradient-to-tr from-slate-900 via-slate-800 to-red-950 text-white flex flex-col justify-between border border-white/20 shadow-2xl overflow-hidden">
          <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-davivienda/20 blur-2xl pointer-events-none"></div>

          <!-- Encabezado Tarjeta: Logo Davivienda y Badge de Red -->
          <div class="flex items-center justify-between relative z-10">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-davivienda flex items-center justify-center text-white font-bold text-xs shadow-sm">
                🏠
              </div>
              <span class="font-extrabold text-sm tracking-wider text-slate-100">DAVIVIENDA</span>
            </div>
            <div
              class="font-black text-xs px-2.5 py-1 rounded transition-all duration-300"
              [ngClass]="cardBrand() !== 'generic' ? 'bg-white/20 text-white border border-white/30 shadow-xs scale-105' : 'bg-white/10 text-white/40 border border-white/10'"
            >
              {{ cardBrandLabel() }}
            </div>
          </div>

          <!-- Chip & Contactless -->
          <div class="flex items-center gap-3 relative z-10">
            <div class="w-10 h-7 rounded-md bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 border border-amber-500 shadow-inner flex items-center justify-center">
              <div class="w-8 h-5 border border-amber-700/40 rounded-xs opacity-60"></div>
            </div>
            <svg class="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.393 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>

          <!-- Número de Tarjeta: Sin datos iniciales, los dígitos se iluminan a medida que se teclean -->
          <div class="relative z-10">
            <div class="font-mono text-lg sm:text-xl font-bold tracking-widest text-slate-100 drop-shadow-sm flex items-center gap-2.5 sm:gap-3">
              @for (block of cardBlocks(); track $index) {
                <span class="flex items-center gap-0.5">
                  @for (char of block; track $index) {
                    <span
                      class="transition-all duration-150 inline-block text-center w-[10px] sm:w-[11px]"
                      [ngClass]="char.isTyped ? 'text-white font-extrabold scale-100' : 'text-white/20 font-light scale-90'"
                    >
                      {{ char.val }}
                    </span>
                  }
                </span>
              }
            </div>
          </div>

          <!-- Titular y Fecha de Expiración -->
          <div class="flex items-center justify-between text-xs relative z-10">
            <div class="min-w-0 flex-1 mr-3">
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Titular</span>
              <p
                class="font-semibold uppercase tracking-wider truncate transition-colors duration-200"
                [ngClass]="cardHolder() ? 'text-slate-100 font-extrabold' : 'text-white/25 italic font-normal'"
              >
                {{ cardHolder() || 'NOMBRE DEL TITULAR' }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Vence</span>
              <p
                class="font-mono font-bold tracking-widest transition-colors duration-200"
                [ngClass]="cardExp() ? 'text-slate-100 font-black' : 'text-white/25 font-normal'"
              >
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
              <span
                class="font-mono text-sm tracking-widest transition-colors"
                [ngClass]="cardCvv() ? 'text-slate-900 font-black' : 'text-slate-400 font-normal'"
              >
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
  `,
})
export class VirtualCardComponent {
  public readonly cardNumber = input<string>('');
  public readonly cardHolder = input<string>('');
  public readonly cardExp = input<string>('');
  public readonly cardCvv = input<string>('');
  public readonly isFlipped = input<boolean>(false);
  public readonly flipToggle = output<void>();

  public toggleFlip() {
    this.flipToggle.emit();
  }

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
      default: return 'Tarjeta';
    }
  });

  public readonly cardBlocks = computed<{ val: string; isTyped: boolean }[][]>(() => {
    const raw = this.cardNumber().replace(/\D/g, '');
    const blocks: { val: string; isTyped: boolean }[][] = [];

    for (let b = 0; b < 4; b++) {
      const block: { val: string; isTyped: boolean }[] = [];
      for (let i = 0; i < 4; i++) {
        const charIndex = b * 4 + i;
        if (charIndex < raw.length) {
          block.push({ val: raw[charIndex], isTyped: true });
        } else {
          block.push({ val: '•', isTyped: false });
        }
      }
      blocks.push(block);
    }
    return blocks;
  });
}
