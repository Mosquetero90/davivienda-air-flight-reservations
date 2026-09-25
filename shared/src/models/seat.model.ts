import { SeatStatus, SeatClass } from '../enums';

export interface Seat {
  id: string; // formato: "AV123-14B"
  flightId: string;
  row: number;
  column: string; // "A", "B", "C", "D", "E", "F"
  seatNumber: string; // "14B"
  seatClass: SeatClass;
  price: number;
  isExitRow: boolean;
  status: SeatStatus;
  lockedByUserId?: string;
  lockedAt?: number; // epoch ms
  lockedUntil?: number; // epoch ms (TTL)
  bookedByUserId?: string;
  bookingReference?: string;
}

export interface CabinLayout {
  rows: number;
  columns: string[];
  aisleAfterColumn: string[]; // ej: ["C"] para pasillo central en 3-3 (A B C | D E F)
  exitRows: number[];
  businessRows: number[];
}
