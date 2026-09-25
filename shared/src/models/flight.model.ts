import { FlightStatus } from '../enums';
import { CabinLayout } from './seat.model';

export interface Flight {
  id: string; // ej: "AV-204"
  flightNumber: string; // ej: "AV204"
  airline: string; // ej: "Davivienda Air"
  aircraftModel: string; // ej: "Airbus A320-neo"
  originCity: string; // ej: "Bogotá (BOG)"
  destinationCity: string; // ej: "Medellín (MDE)"
  originCode: string; // "BOG"
  destinationCode: string; // "MDE"
  departureTime: string; // ISO date string
  arrivalTime: string; // ISO date string
  durationMinutes: number;
  basePrice: number;
  currency: string; // "COP"
  status: FlightStatus;
  cabinLayout: CabinLayout;
  totalSeats: number;
  availableSeatsCount: number;
}
