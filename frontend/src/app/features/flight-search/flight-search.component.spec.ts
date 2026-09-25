import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FlightSearchComponent } from './flight-search.component';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { Flight, FlightStatus } from '@davivienda/shared';

describe('FlightSearchComponent (Round-Trip Flight Timing Validation)', () => {
  let component: FlightSearchComponent;
  let fixture: ComponentFixture<FlightSearchComponent>;
  let state: FlightStateService;

  const mockOutboundFlight: Flight = {
    id: 'DV-204',
    flightNumber: 'DV-204',
    airline: 'Davivienda Air',
    aircraftModel: 'Airbus A320neo',
    originCity: 'Bogotá (BOG)',
    destinationCity: 'Medellín (MDE)',
    originCode: 'BOG',
    destinationCode: 'MDE',
    departureTime: '2026-09-25T12:30:00.000Z',
    arrivalTime: '2026-09-25T13:25:00.000Z',
    durationMinutes: 55,
    basePrice: 290000,
    currency: 'COP',
    status: FlightStatus.ON_TIME,
    cabinLayout: {
      rows: 30,
      columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      aisleAfterColumn: ['C'],
      exitRows: [11, 12],
      businessRows: [1, 2, 3],
    },
    totalSeats: 180,
    availableSeatsCount: 150,
  };

  const mockEarlierReturnFlight: Flight = {
    id: 'DV-201',
    flightNumber: 'DV-201',
    airline: 'Davivienda Air',
    aircraftModel: 'Airbus A320neo',
    originCity: 'Medellín (MDE)',
    destinationCity: 'Bogotá (BOG)',
    originCode: 'MDE',
    destinationCode: 'BOG',
    departureTime: '2026-09-25T08:00:00.000Z', // 8:00 AM (earlier than 13:25 PM arrival of outbound)
    arrivalTime: '2026-09-25T08:55:00.000Z',
    durationMinutes: 55,
    basePrice: 270000,
    currency: 'COP',
    status: FlightStatus.ON_TIME,
    cabinLayout: {
      rows: 30,
      columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      aisleAfterColumn: ['C'],
      exitRows: [11, 12],
      businessRows: [1, 2, 3],
    },
    totalSeats: 180,
    availableSeatsCount: 150,
  };

  const mockLaterReturnFlight: Flight = {
    id: 'DV-207',
    flightNumber: 'DV-207',
    airline: 'Davivienda Air',
    aircraftModel: 'Airbus A320neo',
    originCity: 'Medellín (MDE)',
    destinationCity: 'Bogotá (BOG)',
    originCode: 'MDE',
    destinationCode: 'BOG',
    departureTime: '2026-09-25T17:30:00.000Z', // 5:30 PM (after 13:25 PM arrival of outbound)
    arrivalTime: '2026-09-25T18:25:00.000Z',
    durationMinutes: 55,
    basePrice: 285000,
    currency: 'COP',
    status: FlightStatus.ON_TIME,
    cabinLayout: {
      rows: 30,
      columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      aisleAfterColumn: ['C'],
      exitRows: [11, 12],
      businessRows: [1, 2, 3],
    },
    totalSeats: 180,
    availableSeatsCount: 150,
  };

  let mockFlightApi: any;

  beforeEach(async () => {
    mockFlightApi = {
      getCities: jasmine.createSpy('getCities').and.returnValue(of([])),
      getFlights: jasmine.createSpy('getFlights').and.returnValue(of([])),
      getFlightById: jasmine.createSpy('getFlightById').and.returnValue(of(null)),
      updateFlightStatus: jasmine.createSpy('updateFlightStatus').and.returnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [FlightSearchComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        FlightStateService,
        { provide: FlightApiService, useValue: mockFlightApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightSearchComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(FlightStateService);
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('Default origin and destination filters', () => {
    it('should default origin and destination to empty strings ("Todos los orígenes" / "Todos los destinos")', () => {
      expect(component.origin).toBe('');
      expect(component.destination).toBe('');
    });

    it('should reset origin and destination to empty strings on resetFilters()', () => {
      component.origin = 'CTG';
      component.destination = 'BOG';
      component.resetFilters();

      expect(component.origin).toBe('');
      expect(component.destination).toBe('');
    });
  });

  describe('isReturnFlightBeforeOutbound', () => {
    it('should return false if no outbound flight is selected', () => {
      state.selectedOutboundFlight.set(null);
      expect(component.isReturnFlightBeforeOutbound(mockEarlierReturnFlight)).toBeFalse();
    });

    it('should return true if return flight departs before outbound flight arrives', () => {
      state.selectedOutboundFlight.set(mockOutboundFlight);
      expect(component.isReturnFlightBeforeOutbound(mockEarlierReturnFlight)).toBeTrue();
    });

    it('should return false if return flight departs after outbound flight arrives', () => {
      state.selectedOutboundFlight.set(mockOutboundFlight);
      expect(component.isReturnFlightBeforeOutbound(mockLaterReturnFlight)).toBeFalse();
    });
  });

  describe('selectReturn', () => {
    it('should block selection and warn if no outbound flight is selected yet', () => {
      state.selectedOutboundFlight.set(null);
      component.selectReturn(mockLaterReturnFlight);

      expect(state.selectedReturnFlight()).toBeNull();
      expect(component.activeTab).toBe('outbound');
    });

    it('should block selection of return flight if it departs before outbound arrival', () => {
      state.selectedOutboundFlight.set(mockOutboundFlight);
      component.selectReturn(mockEarlierReturnFlight);

      expect(state.selectedReturnFlight()).toBeNull();
    });

    it('should successfully select return flight if it departs after outbound arrival', () => {
      state.selectedOutboundFlight.set(mockOutboundFlight);
      component.selectReturn(mockLaterReturnFlight);

      expect(state.selectedReturnFlight()?.id).toBe(mockLaterReturnFlight.id);
    });
  });

  describe('selectOutbound conflict resolution', () => {
    it('should invalidate an existing return flight if new outbound flight arrives after it', () => {
      // First, set a return flight that was valid for an earlier flight
      state.selectedReturnFlight.set(mockEarlierReturnFlight);

      // Now user selects an outbound flight that arrives at 13:25
      component.selectOutbound(mockOutboundFlight);

      expect(state.selectedOutboundFlight()?.id).toBe(mockOutboundFlight.id);
      expect(state.selectedReturnFlight()).toBeNull(); // Must be cleared!
    });

    it('should preserve return flight if it departs after the new outbound flight', () => {
      state.selectedReturnFlight.set(mockLaterReturnFlight);

      component.selectOutbound(mockOutboundFlight);

      expect(state.selectedOutboundFlight()?.id).toBe(mockOutboundFlight.id);
      expect(state.selectedReturnFlight()?.id).toBe(mockLaterReturnFlight.id); // Preserved!
    });
  });

  describe('Date consistency in round trip', () => {
    it('should auto-adjust returnDate if departure date is set to a later date', () => {
      component.date = '2026-09-25';
      component.returnDate = '2026-09-26';

      // User changes departure date to Sep 28
      component.onDateChange('2026-09-28');

      expect(component.returnDate).toBe('2026-09-28');
    });

    it('should auto-adjust returnDate if user attempts to set returnDate earlier than departure date', () => {
      component.date = '2026-09-28';

      // User attempts to set returnDate to Sep 25
      component.onReturnDateChange('2026-09-25');

      expect(component.returnDate).toBe('2026-09-28');
    });
  });

  describe('setTripType (Reset on Toggle between Round Trip and One Way)', () => {
    it('should reset outbound and return flight selections when switching from ROUND_TRIP to ONE_WAY', () => {
      component.tripType = 'ROUND_TRIP';
      state.selectedOutboundFlight.set(mockOutboundFlight);
      state.selectedReturnFlight.set(mockLaterReturnFlight);
      component.returnDate = '2026-09-28';
      component.activeTab = 'return';

      component.setTripType('ONE_WAY');

      expect(component.tripType).toBe('ONE_WAY');
      expect(state.selectedOutboundFlight()).toBeNull();
      expect(state.selectedReturnFlight()).toBeNull();
      expect(component.returnDate).toBe('');
      expect(component.activeTab).toBe('outbound');
    });

    it('should reset flight selections when switching from ONE_WAY to ROUND_TRIP', () => {
      component.tripType = 'ONE_WAY';
      state.selectedOutboundFlight.set(mockOutboundFlight);

      component.setTripType('ROUND_TRIP');

      expect(component.tripType).toBe('ROUND_TRIP');
      expect(state.selectedOutboundFlight()).toBeNull();
      expect(state.selectedReturnFlight()).toBeNull();
      expect(component.activeTab).toBe('outbound');
    });

    it('should not alter selections if the currently active tripType is clicked again (idempotent)', () => {
      component.tripType = 'ROUND_TRIP';
      state.selectedOutboundFlight.set(mockOutboundFlight);
      state.selectedReturnFlight.set(mockLaterReturnFlight);

      component.setTripType('ROUND_TRIP');

      expect(state.selectedOutboundFlight()?.id).toBe(mockOutboundFlight.id);
      expect(state.selectedReturnFlight()?.id).toBe(mockLaterReturnFlight.id);
    });
  });
});
