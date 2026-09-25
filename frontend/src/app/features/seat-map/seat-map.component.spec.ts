import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ComponentRef } from '@angular/core';
import { SeatMapComponent } from './seat-map.component';
import { FlightStateService } from '../../core/state/flight-state.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { Seat, SeatClass, SeatStatus } from '@davivienda/shared';

describe('SeatMapComponent (Multi-Passenger Seat Selection)', () => {
  let component: SeatMapComponent;
  let fixture: ComponentFixture<SeatMapComponent>;
  let componentRef: ComponentRef<SeatMapComponent>;
  let state: FlightStateService;
  let userSession: UserSessionService;

  const mockAvailableSeat: Seat = {
    id: '01A',
    flightId: 'DV-204',
    row: 1,
    column: 'A',
    seatNumber: '01A',
    seatClass: SeatClass.BUSINESS,
    price: 450000,
    isExitRow: false,
    status: SeatStatus.AVAILABLE,
  };

  const mockOtherLockedSeat: Seat = {
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
  };

  const mockBookedSeat: Seat = {
    id: '01C',
    flightId: 'DV-204',
    row: 1,
    column: 'C',
    seatNumber: '01C',
    seatClass: SeatClass.BUSINESS,
    price: 450000,
    isExitRow: false,
    status: SeatStatus.BOOKED,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeatMapComponent],
      providers: [provideHttpClient(), provideRouter([]), FlightStateService, UserSessionService],
    }).compileComponents();

    fixture = TestBed.createComponent(SeatMapComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('flightId', 'DV-204');
    state = TestBed.inject(FlightStateService);
    userSession = TestBed.inject(UserSessionService);
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe reflejar el número de pasajeros y calcular el total acumulado', () => {
    state.passengers.set(2);
    expect(component.passengers()).toBe(2);

    const seat1: Seat = { ...mockAvailableSeat, seatNumber: '01A', price: 400000 };
    const seat2: Seat = { ...mockAvailableSeat, seatNumber: '01B', price: 400000 };

    state.myLockedSeats.set([seat1, seat2]);
    expect(component.myLockedSeats().length).toBe(2);
    expect(component.totalSelectedPrice()).toBe(800000);
  });

  it('debe identificar asientos propios, bloqueados por otros y ocupados', () => {
    const currentUserId = userSession.currentUser().id;
    const mySeat: Seat = {
      ...mockAvailableSeat,
      seatNumber: '02A',
      status: SeatStatus.LOCKED,
      lockedByUserId: currentUserId,
    };

    state.myLockedSeats.set([mySeat]);

    expect(component.isSeatMine(mySeat)).toBe(true);
    expect(component.isLockedByOther(mockOtherLockedSeat)).toBe(true);
    expect(component.isSeatDisabled(mockBookedSeat)).toBe(true);
    expect(component.isSeatDisabled(mockOtherLockedSeat)).toBe(true);
    expect(component.isSeatDisabled(mockAvailableSeat)).toBe(false);
  });

  it('debe liberar el asiento al hacer clic sobre un asiento propio', () => {
    const releaseSpy = spyOn(state, 'releaseSeatLock');
    const currentUserId = userSession.currentUser().id;
    const mySeat: Seat = {
      ...mockAvailableSeat,
      seatNumber: '02A',
      status: SeatStatus.LOCKED,
      lockedByUserId: currentUserId,
    };

    state.myLockedSeats.set([mySeat]);
    component.onSeatClick(mySeat);

    expect(releaseSpy).toHaveBeenCalledWith('02A');
  });

  it('no debe solicitar bloqueo si se alcanzó el límite de pasajeros', () => {
    state.passengers.set(1);
    state.myLockedSeats.set([mockAvailableSeat]);
    const lockSpy = spyOn(state, 'requestSeatLock');
    const notifSpy = spyOn(state, 'addNotification');

    const nextSeat: Seat = { ...mockAvailableSeat, seatNumber: '03B' };
    component.onSeatClick(nextSeat);

    expect(lockSpy).not.toHaveBeenCalled();
    expect(notifSpy).toHaveBeenCalled();
  });

  it('debe incrementar y disminuir pasajeros desde la cabina', () => {
    state.passengers.set(2);
    expect(component.passengers()).toBe(2);

    component.increasePassengers();
    expect(state.passengers()).toBe(3);

    component.decreasePassengers();
    expect(state.passengers()).toBe(2);
  });
});
