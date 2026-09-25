import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'flights',
    pathMatch: 'full',
  },
  {
    path: 'flights',
    loadComponent: () =>
      import('./features/flight-search/flight-search.component').then(
        (m) => m.FlightSearchComponent,
      ),
  },
  {
    path: 'flight/:flightId/seats',
    loadComponent: () =>
      import('./features/seat-map/seat-map.component').then(
        (m) => m.SeatMapComponent,
      ),
  },
  {
    path: 'flight/:flightId/checkout',
    loadComponent: () =>
      import('./features/checkout/checkout.component').then(
        (m) => m.CheckoutComponent,
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'flights',
  },
];
