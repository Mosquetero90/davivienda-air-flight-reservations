import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutComponent } from './checkout.component';
import { FlightStateService } from '../../core/state/flight-state.service';
import { FlightApiService } from '../../core/services/flight-api.service';
import { UserSessionService } from '../../core/services/user-session.service';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('CheckoutComponent - Credit and Debit Card Payment Flow', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;
  let mockFlightState: Partial<FlightStateService>;
  let mockFlightApi: Partial<FlightApiService>;
  let mockUserSession: Partial<UserSessionService>;

  beforeEach(async () => {
    const testFlight = {
      id: 'FL-101',
      flightNumber: 'DV-101',
      originCode: 'BOG',
      destinationCode: 'MDE',
      departureTime: '2026-10-15T08:00:00Z',
      price: 250000,
    };

    mockFlightState = {
      selectedFlight: signal<any>(testFlight),
      myLockedSeats: signal<any[]>([
        { seatNumber: '12A', price: 250000 },
      ]),
      passengers: signal(1),
      lockSecondsRemaining: signal(300),
      lastBooking: signal<any>(null),
      lastReturnBooking: signal<any>(null),
      tripType: signal<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY'),
      selectedOutboundFlight: signal<any>(null),
      selectedReturnFlight: signal<any>(null),
      myLockedOutboundSeats: signal<any[]>([]),
      myLockedReturnSeats: signal<any[]>([]),
      isLoading: signal(false),
      confirmBooking: jasmine.createSpy('confirmBooking').and.returnValue(Promise.resolve({
        bookingId: 'BK-1',
        bookingReference: 'PNR-TEST',
      })),
    } as any;

    mockFlightApi = {
      getFlightById: jasmine.createSpy('getFlightById').and.returnValue(of(testFlight as any)),
      createBooking: jasmine.createSpy('createBooking'),
    };

    mockUserSession = {
      currentUser: signal({
        id: 'user-1',
        name: 'Carlos Mendoza',
        documentType: 'CC' as const,
        documentNumber: '1020482910',
        email: 'carlos.mendoza@davivienda.com',
        phone: '3108924411',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideRouter([]),
        { provide: FlightStateService, useValue: mockFlightState },
        { provide: FlightApiService, useValue: mockFlightApi },
        { provide: UserSessionService, useValue: mockUserSession },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    fixture.componentRef.setInput('flightId', 'FL-101');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with CARD as the default selected payment method', () => {
    expect(component.selectedPaymentMethod).toBe('CARD');
  });

  it('should auto-format card number into groups of 4 and detect Visa brand', () => {
    const input = document.createElement('input');
    input.value = '4557123456789012';
    component.onCardNumberInput({ target: input } as any);

    expect(component.cardNumber).toBe('4557 1234 5678 9012');
    expect(component.detectedCardBrand).toBe('visa');
  });

  it('should detect Mastercard brand when digits start with 55', () => {
    const input = document.createElement('input');
    input.value = '5512345678901234';
    component.onCardNumberInput({ target: input } as any);

    expect(component.detectedCardBrand).toBe('mastercard');
  });

  it('should detect AMEX brand when digits start with 37', () => {
    const input = document.createElement('input');
    input.value = '371234567890123';
    component.onCardNumberInput({ target: input } as any);

    expect(component.detectedCardBrand).toBe('amex');
  });

  it('should detect Diners Club brand when digits start with 36', () => {
    const input = document.createElement('input');
    input.value = '36123456789012';
    component.onCardNumberInput({ target: input } as any);

    expect(component.detectedCardBrand).toBe('diners');
  });

  it('should format expiration date as MM/AA', () => {
    const input = document.createElement('input');
    input.value = '1228';
    component.onCardExpInput({ target: input } as any);

    expect(component.cardExp).toBe('12/28');
  });

  it('should populate demo card details via fillDemoCard()', () => {
    component.fillDemoCard();

    expect(component.cardNumber).toBe('4557 8901 2345 6789');
    expect(component.cardHolder).toBe('CARLOS MENDOZA');
    expect(component.cardExp).toBe('12/28');
    expect(component.cardCvv).toBe('789');
    expect(component.detectedCardBrand).toBe('visa');
    expect(component.isCardFlipped()).toBeFalse();
  });

  it('should clear card form fields on clearCardForm()', () => {
    component.fillDemoCard();
    component.clearCardForm();

    expect(component.cardNumber).toBe('');
    expect(component.cardHolder).toBe('');
    expect(component.cardExp).toBe('');
    expect(component.cardCvv).toBe('');
    expect(component.detectedCardBrand).toBeNull();
    expect(component.isCardFlipped()).toBeFalse();
  });

  it('should update cardHolder in uppercase on onCardHolderInput()', () => {
    const input = document.createElement('input');
    input.value = 'Juan Perez';
    component.onCardHolderInput({ target: input } as any);

    expect(component.cardHolder).toBe('JUAN PEREZ');
  });

  it('should toggle isCardFlipped on toggleCardFlip()', () => {
    expect(component.isCardFlipped()).toBeFalse();
    component.toggleCardFlip();
    expect(component.isCardFlipped()).toBeTrue();
    component.toggleCardFlip();
    expect(component.isCardFlipped()).toBeFalse();
  });

  it('should toggle split payment on and off', () => {
    expect(component.splitPayment).toBeFalse();
    component.splitPayment = true;
    expect(component.splitPayment).toBeTrue();
  });

  it('should validate form based on passenger details and pass card details on submitBooking', async () => {
    component.fillDemoCard();
    expect(component.isFormValid()).toBeTrue();

    await component.submitBooking();
    expect(mockFlightState.confirmBooking).toHaveBeenCalledWith(
      component.passenger,
      'CARD',
      {
        cardNumber: '4557 8901 2345 6789',
        expiryDate: '12/28',
        cvv: '789',
      },
    );
  });
});
