import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
      <app-navbar></app-navbar>
      <main class="flex-1 pt-16">
        <router-outlet></router-outlet>
      </main>
      <app-toast></app-toast>
    </div>
  `,
})
export class AppComponent {
  title = 'Davivienda Air';
}
