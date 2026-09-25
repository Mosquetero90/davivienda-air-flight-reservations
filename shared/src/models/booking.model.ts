export interface Passenger {
  firstName: string;
  lastName: string;
  documentType: 'CC' | 'CE' | 'PASSPORT';
  documentNumber: string;
  email: string;
  phone: string;
}

export interface Booking {
  id: string;
  bookingReference: string; // PNR de 6 caracteres (ej: "DV8X9K")
  flightId: string;
  seatId: string;
  seatNumber: string;
  userId: string;
  passenger: Passenger;
  totalPrice: number;
  currency: string;
  createdAt: string; // ISO date string
  status: 'CONFIRMED' | 'CANCELLED';
  paymentDetails: {
    method: 'CARD' | 'DAVIPLATA' | 'PSE';
    lastFourDigits?: string;
    transactionId: string;
    paidAt: string;
  };
}
