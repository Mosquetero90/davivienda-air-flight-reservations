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

  describe('Manual Search (No Automatic Search/Filter on Input Changes)', () => {
    let loadFlightsSpy: jasmine.Spy;

    beforeEach(() => {
      loadFlightsSpy = spyOn(state, 'loadFlights').and.callThrough();
    });

    it('should NOT trigger search when onOriginChange is called', () => {
      component.onOriginChange('BOG');
      expect(loadFlightsSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger search when onDestinationChange is called', () => {
      component.onDestinationChange('MDE');
      expect(loadFlightsSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger search when swapCities is called', () => {
      component.origin = 'BOG';
      component.destination = 'MDE';
      component.swapCities();

      expect(component.origin).toBe('MDE');
      expect(component.destination).toBe('BOG');
      expect(loadFlightsSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger search when onDateChange is called', () => {
      component.onDateChange('2026-09-28');
      expect(loadFlightsSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger search when onReturnDateChange is called', () => {
      component.onReturnDateChange('2026-09-30');
      expect(loadFlightsSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger search when setTripType is called', () => {
      component.setTripType('ONE_WAY');
      expect(loadFlightsSpy).not.toHaveBeenCalled();
    });

    it('should trigger search and reset selected flights when applyFilter (Buscar) is executed', () => {
      state.selectedOutboundFlight.set(mockOutboundFlight);
      state.selectedReturnFlight.set(mockLaterReturnFlight);

      component.origin = 'BOG';
      component.destination = 'CTG';
      component.date = '2026-09-28';
      component.tripType = 'ONE_WAY';

      component.applyFilter();

      expect(loadFlightsSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          origin: 'BOG',
          destination: 'CTG',
          date: '2026-09-28',
          tripType: 'ONE_WAY',
        }),
      );
      expect(state.selectedOutboundFlight()).toBeNull();
      expect(state.selectedReturnFlight()).toBeNull();
    });
  });

  describe('Mandatory Date Selection for Search', () => {
    it('should be disabled and require outbound date in ONE_WAY when date is empty', () => {
      component.tripType = 'ONE_WAY';
      component.date = '';

      expect(component.isSearchDisabled).toBeTrue();
      expect(component.searchDisabledMessage).toBe('Debes seleccionar la fecha de ida');
    });

    it('should be enabled in ONE_WAY when outbound date is provided', () => {
      component.tripType = 'ONE_WAY';
      component.date = '2026-09-28';

      expect(component.isSearchDisabled).toBeFalse();
      expect(component.searchDisabledMessage).toBe('');
    });

    it('should be disabled and require both dates in ROUND_TRIP when both are empty', () => {
      component.tripType = 'ROUND_TRIP';
      component.date = '';
      component.returnDate = '';

      expect(component.isSearchDisabled).toBeTrue();
      expect(component.searchDisabledMessage).toBe('Debes seleccionar las 2 fechas (ida y regreso)');
    });

    it('should be disabled and require return date in ROUND_TRIP when only outbound date is provided', () => {
      component.tripType = 'ROUND_TRIP';
      component.date = '2026-09-28';
      component.returnDate = '';

      expect(component.isSearchDisabled).toBeTrue();
      expect(component.searchDisabledMessage).toBe('Debes seleccionar la fecha de regreso');
    });

    it('should be enabled in ROUND_TRIP when both outbound and return dates are provided', () => {
      component.tripType = 'ROUND_TRIP';
      component.date = '2026-09-28';
      component.returnDate = '2026-09-30';

      expect(component.isSearchDisabled).toBeFalse();
      expect(component.searchDisabledMessage).toBe('');
    });

    it('should block applyFilter() and show warning notification if isSearchDisabled is true', () => {
      const loadFlightsSpy = spyOn(state, 'loadFlights');
      const notifSpy = spyOn(state, 'addNotification');

      component.tripType = 'ONE_WAY';
      component.date = '';

      component.applyFilter();

      expect(loadFlightsSpy).not.toHaveBeenCalled();
      expect(notifSpy).toHaveBeenCalledWith('Debes seleccionar la fecha de ida', 'warning');
    });
  });

  describe('Flight Pagination Controls', () => {
    it('should compute currentPage, totalPages, totalCount, hasNextPage, hasPreviousPage based on active tab and state', () => {
      state.outboundPage.set(1);
      state.outboundTotal.set(12);
      state.outboundTotalPages.set(3);

      state.returnPage.set(2);
      state.returnTotal.set(8);
      state.returnTotalPages.set(2);

      component.tripType = 'ROUND_TRIP';
      component.activeTab = 'outbound';

      expect(component.currentPage).toBe(1);
      expect(component.totalPages).toBe(3);
      expect(component.totalCount).toBe(12);
      expect(component.hasPreviousPage).toBeFalse();
      expect(component.hasNextPage).toBeTrue();

      component.activeTab = 'return';

      expect(component.currentPage).toBe(2);
      expect(component.totalPages).toBe(2);
      expect(component.totalCount).toBe(8);
      expect(component.hasPreviousPage).toBeTrue();
      expect(component.hasNextPage).toBeFalse();
    });

    it('should generate visiblePages correctly', () => {
      state.outboundTotalPages.set(3);
      state.outboundPage.set(1);
      component.activeTab = 'outbound';

      expect(component.visiblePages).toEqual([1, 2, 3]);

      state.outboundTotalPages.set(10);
      state.outboundPage.set(5);

      expect(component.visiblePages).toEqual([3, 4, 5, 6, 7]);
    });

    it('should delegate page navigation to state.setOutboundPage and state.setReturnPage', () => {
      const setOutboundSpy = spyOn(state, 'setOutboundPage');
      const setReturnSpy = spyOn(state, 'setReturnPage');

      state.outboundTotalPages.set(4);
      state.outboundPage.set(1);
      component.activeTab = 'outbound';

      component.goToPage(2);
      expect(setOutboundSpy).toHaveBeenCalledWith(2);

      component.tripType = 'ROUND_TRIP';
      component.activeTab = 'return';
      state.returnTotalPages.set(4);
      state.returnPage.set(1);

      component.goToPage(3);
      expect(setReturnSpy).toHaveBeenCalledWith(3);
    });

    it('should advance and retreat with nextPage and prevPage', () => {
      state.outboundTotalPages.set(4);
      state.outboundPage.set(2);
      component.tripType = 'ONE_WAY';

      const goToPageSpy = spyOn(component, 'goToPage');

      component.nextPage();
      expect(goToPageSpy).toHaveBeenCalledWith(3);

      component.prevPage();
      expect(goToPageSpy).toHaveBeenCalledWith(1);
    });

    it('should compute startItemIndex and endItemIndex accurately', () => {
      component.tripType = 'ONE_WAY';
      state.outboundTotal.set(14);
      state.outboundPage.set(1);
      state.pageSize.set(5);

      expect(component.startItemIndex).toBe(1);
      expect(component.endItemIndex).toBe(5);

      // En la última página
      state.outboundPage.set(3);
      expect(component.startItemIndex).toBe(11);
      expect(component.endItemIndex).toBe(14);

      // Cuando no hay resultados
      state.outboundTotal.set(0);
      expect(component.startItemIndex).toBe(0);
      expect(component.endItemIndex).toBe(0);
    });

    it('should delegate page size change to state.setPageSize and reset pagination', () => {
      const setPageSizeSpy = spyOn(state, 'setPageSize');
      component.onPageSizeChange(10);
      expect(setPageSizeSpy).toHaveBeenCalledWith(10);
    });
  });
});
