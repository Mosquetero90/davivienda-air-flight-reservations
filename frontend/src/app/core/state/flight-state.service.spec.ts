import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { FlightStateService } from './flight-state.service';
import { SeatClass, SeatStatus } from '@davivienda/shared';

describe('FlightStateService (Reactive Signals Store)', () => {
  let service: FlightStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), FlightStateService],
    });
    service = TestBed.inject(FlightStateService);
  });

  it('debe inicializar con señales vacías y reactividad fina', () => {
    expect(service.flights().length).toBe(0);
    expect(service.selectedFlight()).toBeNull();
    expect(service.myLockedSeat()).toBeNull();
    expect(service.totalSeatsCount()).toBe(0);
    expect(service.occupancyPercentage()).toBe(0);
  });

  it('debe calcular correctamente los asientos disponibles, bloqueados y porcentaje de ocupación', () => {
    // Simular 4 asientos en cabina
    service.seats.set([
      {
        id: '01A',
        flightId: 'DV-204',
        row: 1,
        column: 'A',
        seatNumber: '01A',
        seatClass: SeatClass.BUSINESS,
        price: 450000,
        isExitRow: false,
        status: SeatStatus.BOOKED,
      },
      {
        id: '01B',
        flightId: 'DV-204',
        row: 1,
        column: 'B',
        seatNumber: '01B',
        seatClass: SeatClass.BUSINESS,
        price: 450000,
        isExitRow: false,
        status: SeatStatus.LOCKED,
        lockedByUserId: 'user_other',
      },
      {
        id: '01C',
        flightId: 'DV-204',
        row: 1,
        column: 'C',
        seatNumber: '01C',
        seatClass: SeatClass.BUSINESS,
        price: 450000,
        isExitRow: false,
        status: SeatStatus.AVAILABLE,
      },
      {
        id: '01D',
        flightId: 'DV-204',
        row: 1,
        column: 'D',
        seatNumber: '01D',
        seatClass: SeatClass.BUSINESS,
        price: 450000,
        isExitRow: false,
        status: SeatStatus.AVAILABLE,
      },
    ]);

    expect(service.totalSeatsCount()).toBe(4);
    expect(service.bookedSeatsCount()).toBe(1);
    expect(service.lockedSeatsCount()).toBe(1);
    expect(service.availableSeatsCount()).toBe(2);
    // 1 de 4 ocupado = 25%
    expect(service.occupancyPercentage()).toBe(25);
  });

  it('debe gestionar múltiples pasajeros y asientos bloqueados', () => {
    service.passengers.set(3);
    expect(service.passengers()).toBe(3);
    expect(service.myLockedSeats()).toEqual([]);

    const seat1 = {
      id: '01A',
      flightId: 'DV-204',
      row: 1,
      column: 'A',
      seatNumber: '01A',
      seatClass: SeatClass.BUSINESS,
      price: 450000,
      isExitRow: false,
      status: SeatStatus.LOCKED,
      lockedByUserId: 'user_1',
    };
    const seat2 = {
      id: '01B',
      flightId: 'DV-204',
      row: 1,
      column: 'B',
      seatNumber: '01B',
      seatClass: SeatClass.BUSINESS,
      price: 450000,
      isExitRow: false,
      status: SeatStatus.LOCKED,
      lockedByUserId: 'user_1',
    };

    service.myLockedSeats.set([seat1, seat2]);
    expect(service.myLockedSeats().length).toBe(2);
    expect(service.myLockedSeat()).toEqual(seat1);
  });
});
