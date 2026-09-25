import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FunnelStepId = 'flights' | 'seats' | 'checkout' | 'confirmation';

interface StepItem {
  id: FunnelStepId;
  label: string;
  order: number;
}

@Component({
  selector: 'app-funnel-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav aria-label="Progreso de la Reserva" class="bg-white border-b border-slate-200 shadow-2xs py-2.5 px-4 sm:px-6 sticky top-16 z-30">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        @for (step of steps; track step.id; let idx = $index) {
          <div class="flex items-center gap-2" [attr.aria-current]="currentStep() === step.id ? 'step' : null">
            
            <div
              class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-black transition-all"
              [ngClass]="{
                'bg-emerald-600 text-white shadow-xs': isStepCompleted(step.id),
                'bg-davivienda text-white ring-4 ring-red-100 shadow-sm animate-pulse': currentStep() === step.id,
                'bg-slate-100 text-slate-400 border border-slate-200': !isStepCompleted(step.id) && currentStep() !== step.id
              }"
            >
              @if (isStepCompleted(step.id)) {
                <span>✓</span>
              } @else {
                <span>{{ step.order }}</span>
              }
            </div>

            <span
              class="text-xs font-bold transition-colors"
              [ngClass]="{
                'text-slate-900 font-extrabold': currentStep() === step.id,
                'text-emerald-700': isStepCompleted(step.id),
                'text-slate-400 hidden sm:inline': !isStepCompleted(step.id) && currentStep() !== step.id
              }"
            >
              {{ step.label }}
            </span>

            @if (idx < steps.length - 1) {
              <div
                class="w-6 sm:w-14 lg:w-20 h-0.5 mx-1 sm:mx-2 transition-colors"
                [ngClass]="isStepCompleted(steps[idx + 1].id) || currentStep() === steps[idx + 1].id ? 'bg-emerald-500' : 'bg-slate-200'"
              ></div>
            }
          </div>
        }
      </div>
    </nav>
  `
})
export class FunnelStepperComponent {
  public readonly currentStep = input.required<FunnelStepId>();

  public readonly steps: StepItem[] = [
    { id: 'flights', label: '1. Vuelos', order: 1 },
    { id: 'seats', label: '2. Asientos', order: 2 },
    { id: 'checkout', label: '3. Pasajeros y Pago', order: 3 },
    { id: 'confirmation', label: '4. Pasabordo', order: 4 },
  ];

  private readonly stepOrderMap: Record<FunnelStepId, number> = {
    flights: 1,
    seats: 2,
    checkout: 3,
    confirmation: 4,
  };

  public isStepCompleted(stepId: FunnelStepId): boolean {
    return this.stepOrderMap[stepId] < this.stepOrderMap[this.currentStep()];
  }
}
