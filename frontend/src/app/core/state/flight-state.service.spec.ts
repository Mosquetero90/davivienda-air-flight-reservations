import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { FlightStateService } from './flight-state.service';
import { FlightApiService } from '../services/flight-api.service';
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

  describe('Paginación en FlightStateService', () => {
    it('debe inicializar las señales de paginación con valores por defecto', () => {
      expect(service.outboundPage()).toBe(1);
      expect(service.outboundTotal()).toBe(0);
      expect(service.outboundTotalPages()).toBe(1);
      expect(service.returnPage()).toBe(1);
      expect(service.returnTotal()).toBe(0);
      expect(service.returnTotalPages()).toBe(1);
      expect(service.pageSize()).toBe(5);
    });

    it('debe actualizar las señales de paginación al recibir respuesta paginada', () => {
      const flightApi = TestBed.inject(FlightApiService);
      const mockResult = {
        data: [
          {
            id: 'DV-101',
            flightNumber: 'DV-101',
            originCity: 'Bogotá',
            originCode: 'BOG',
            destinationCity: 'Medellín',
            destinationCode: 'MDE',
            departureTime: new Date().toISOString(),
            arrivalTime: new Date().toISOString(),
            basePrice: 150000,
            status: 'ON_TIME' as any,
            airline: 'Davivienda Air',
            aircraftModel: 'A320',
            availableSeatsCount: 20,
            durationMinutes: 50,
          },
        ],
        total: 12,
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      };

      spyOn(flightApi, 'getFlights').and.returnValue(of(mockResult as any));

      service.loadFlights({ page: 2 });

      expect(service.flights().length).toBe(1);
      expect(service.outboundTotal()).toBe(12);
      expect(service.outboundTotalPages()).toBe(3);
      expect(service.outboundPage()).toBe(2);
    });

    it('debe permitir cambiar de página con setOutboundPage', () => {
      const flightApi = TestBed.inject(FlightApiService);
      const spy = spyOn(flightApi, 'getFlights').and.returnValue(
        of({
          data: [],
          total: 15,
          page: 2,
          limit: 5,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        } as any),
      );

      service.outboundTotalPages.set(3);
      service.setOutboundPage(2);

      expect(spy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 2,
          limit: 5,
        }),
      );
    });

    it('debe actualizar el tamaño de página y reiniciar a la página 1 con setPageSize', () => {
      const flightApi = TestBed.inject(FlightApiService);
      const spy = spyOn(flightApi, 'getFlights').and.returnValue(
        of({
          data: [],
          total: 10,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        } as any),
      );

      service.outboundPage.set(3);
      service.setPageSize(10);

      expect(service.pageSize()).toBe(10);
      expect(service.outboundPage()).toBe(1);
      expect(service.returnPage()).toBe(1);
      expect(spy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 1,
          limit: 10,
        }),
      );
    });
  });
});
