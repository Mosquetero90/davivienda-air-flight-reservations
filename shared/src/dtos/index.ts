export type TripType = 'ROUND_TRIP' | 'ONE_WAY';

export interface SearchFlightsDto {
  origin?: string;
  destination?: string;
  date?: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  passengers?: number;
  tripType?: TripType;
}

export interface CreateBookingDto {
  flightId: string;
  seatId: string;
  userId: string;
  passenger: {
    firstName: string;
    lastName: string;
    documentType: 'CC' | 'CE' | 'PASSPORT';
    documentNumber: string;
    email: string;
    phone: string;
  };
  payment: {
    method: 'CARD' | 'DAVIPLATA' | 'PSE';
    cardNumber?: string;
    cardHolder?: string;
    expiryDate?: string;
    cvv?: string;
  };
}

export type BookingPassengerDto = CreateBookingDto['passenger'];
export type BookingPaymentDto = CreateBookingDto['payment'];

export interface BookingResponseDto {
  bookingId: string;
  bookingReference: string; // PNR
  flightNumber: string;
  seatNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  passengerName: string;
  totalPaid: number;
  currency: string;
  confirmedAt: string;
}
