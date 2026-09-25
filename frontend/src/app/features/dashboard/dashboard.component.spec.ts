import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { SocketService } from '../../core/services/socket.service';
import { Flight, FlightMetrics, FlightStatus, SeatClass, SeatStatus } from '@davivienda/shared';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let state: FlightStateService;
  let flightApi: FlightApiService;
  let socketService: SocketService;

  const mockLayout = {
    rows: 30,
    columns: ['A', 'B', 'C', 'D', 'E', 'F'],
    aisleAfterColumn: ['C'],
    exitRows: [11, 12],
    businessRows: [1, 2, 3],
  };

  const mockFlight1: Flight = {
    id: 'DV-101',
    flightNumber: 'DV-101',
    airline: 'Davivienda Air',
    aircraftModel: 'A320neo',
    originCity: 'Bogotá',
    originCode: 'BOG',
    destinationCity: 'Medellín',
    destinationCode: 'MDE',
    departureTime: new Date().toISOString(),
    arrivalTime: new Date().toISOString(),
    durationMinutes: 55,
    basePrice: 200000,
    currency: 'COP',
    status: FlightStatus.ON_TIME,
    cabinLayout: mockLayout,
    totalSeats: 180,
    availableSeatsCount: 150,
  };

  const mockFlight2: Flight = {
    id: 'DV-202',
    flightNumber: 'DV-202',
    airline: 'Davivienda Air',
    aircraftModel: 'A320neo',
    originCity: 'Bogotá',
    originCode: 'BOG',
    destinationCity: 'Cartagena',
    destinationCode: 'CTG',
    departureTime: new Date().toISOString(),
    arrivalTime: new Date().toISOString(),
    durationMinutes: 80,
    basePrice: 280000,
    currency: 'COP',
    status: FlightStatus.ON_TIME,
    cabinLayout: mockLayout,
    totalSeats: 180,
    availableSeatsCount: 120,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        FlightStateService,
        FlightApiService,
        SocketService,
      ],
    }).compileComponents();

    state = TestBed.inject(FlightStateService);
    flightApi = TestBed.inject(FlightApiService);
    socketService = TestBed.inject(SocketService);

    spyOn(flightApi, 'getFlights').and.returnValue(
      of({
        data: [mockFlight1, mockFlight2],
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      } as any),
    );

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse exitosamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe solicitar hasta 100 vuelos al inicializarse y poblar allFlights', () => {
    fixture.detectChanges();

    expect(flightApi.getFlights).toHaveBeenCalledWith(jasmine.objectContaining({ limit: 100 }));
    expect(component.allFlights().length).toBe(2);
    expect(component.allFlights()[0].id).toBe('DV-101');
    expect(component.allFlights()[1].id).toBe('DV-202');
  });

  it('debe calcular métricas reactivas exactas cuando activeMetrics coincide con el vuelo seleccionado', () => {
    state.selectedFlight.set(mockFlight1);

    const mockMetrics: FlightMetrics = {
      flightId: 'DV-101',
      flightNumber: 'DV-101',
      totalSeats: 180,
      availableSeats: 140,
      lockedSeats: 10,
      bookedSeats: 30,
      occupancyPercentage: 22.2,
      revenueEstimated: 8400000,
      lastUpdated: Date.now(),
    };
    state.metrics.set(mockMetrics);

    fixture.detectChanges();

    expect(component.activeMetrics()).toEqual(mockMetrics);
    expect(component.displayTotalSeats()).toBe(180);
    expect(component.displayAvailableSeats()).toBe(140);
    expect(component.displayLockedSeats()).toBe(10);
    expect(component.displayBookedSeats()).toBe(30);
    expect(component.displayOccupancy()).toBe(22);
    expect(component.displayRevenue()).toBe(8400000);
  });

  it('debe ignorar métricas de otro vuelo y calcular los números directamente desde seats()', () => {
    state.selectedFlight.set(mockFlight1);

    // Métricas enviadas por socket que pertenecen a OTRO vuelo (DV-202)
    const foreignMetrics: FlightMetrics = {
      flightId: 'DV-202',
      flightNumber: 'DV-202',
      totalSeats: 180,
      availableSeats: 50,
      lockedSeats: 40,
      bookedSeats: 90,
      occupancyPercentage: 72.2,
      revenueEstimated: 25000000,
      lastUpdated: Date.now(),
    };
    state.metrics.set(foreignMetrics);

    // Asientos locales del vuelo DV-101
    state.seats.set([
      {
        id: '01A',
        flightId: 'DV-101',
        row: 1,
        column: 'A',
        seatNumber: '01A',
        seatClass: SeatClass.BUSINESS,
        price: 300000,
        isExitRow: false,
        status: SeatStatus.BOOKED,
      },
      {
        id: '01B',
        flightId: 'DV-101',
        row: 1,
        column: 'B',
        seatNumber: '01B',
        seatClass: SeatClass.BUSINESS,
        price: 300000,
        isExitRow: false,
        status: SeatStatus.LOCKED,
      },
      {
        id: '01C',
        flightId: 'DV-101',
        row: 1,
        column: 'C',
        seatNumber: '01C',
        seatClass: SeatClass.BUSINESS,
        price: 300000,
        isExitRow: false,
        status: SeatStatus.AVAILABLE,
      },
      {
        id: '01D',
        flightId: 'DV-101',
        row: 1,
        column: 'D',
        seatNumber: '01D',
        seatClass: SeatClass.BUSINESS,
        price: 300000,
        isExitRow: false,
        status: SeatStatus.AVAILABLE,
      },
    ]);

    fixture.detectChanges();

    // activeMetrics debe ser null porque foreignMetrics es de DV-202 y el activo es DV-101
    expect(component.activeMetrics()).toBeNull();

    // Fallbacks calculados a partir de los 4 asientos de DV-101:
    expect(component.displayTotalSeats()).toBe(4);
    expect(component.displayAvailableSeats()).toBe(2);
    expect(component.displayLockedSeats()).toBe(1);
    expect(component.displayBookedSeats()).toBe(1);
    // 1 asiento vendido de 4 = 25%
    expect(component.displayOccupancy()).toBe(25);
    // Revenue calculado de los asientos BOOKED: 300000 COP (sin el bug de || 4)
    expect(component.displayRevenue()).toBe(300000);
  });

  it('NO debe renderizar el mapa de calor matricial de la cabina en el DOM', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heatmapTitle = compiled.querySelector('h3');
    expect(compiled.textContent).not.toContain('Mapa de Calor Matricial de la Cabina');
  });

  it('debe permitir cambiar de vuelo mediante el dropdown', () => {
    const selectSpy = spyOn(state, 'selectFlight');
    fixture.detectChanges();

    const event = { target: { value: 'DV-202' } } as unknown as Event;
    component.onFlightChange(event);

    expect(selectSpy).toHaveBeenCalledWith('DV-202');
  });
});
