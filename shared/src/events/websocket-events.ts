import { FlightStatus, SeatStatus } from '../enums';
import { Flight } from '../models/flight.model';
import { Seat } from '../models/seat.model';
import { FlightMetrics } from '../models/metrics.model';

export enum WsEvents {
  // Client -> Server
  JOIN_FLIGHT = 'flight:join',
  LEAVE_FLIGHT = 'flight:leave',
  SEAT_LOCK_REQUEST = 'seat:lock_request',
  SEAT_UNLOCK_REQUEST = 'seat:unlock_request',
  SUBSCRIBE_METRICS = 'metrics:subscribe',

  // Server -> Client
  FLIGHT_INITIAL_STATE = 'flight:initial_state',
  SEAT_LOCKED = 'seat:locked',
  SEAT_LOCK_FAILED = 'seat:lock_failed',
  SEAT_RELEASED = 'seat:released',
  SEAT_BOOKED = 'seat:booked',
  FLIGHT_STATUS_UPDATED = 'flight:status_updated',
  METRICS_UPDATED = 'metrics:updated',
  ERROR = 'error:occurred',
}

// Client -> Server Payloads
export interface JoinFlightPayload {
  flightId: string;
  userId: string;
}

export interface LeaveFlightPayload {
  flightId: string;
  userId: string;
}

export interface SeatLockRequestPayload {
  flightId: string;
  seatId: string;
  userId: string;
}

export interface SeatUnlockRequestPayload {
  flightId: string;
  seatId: string;
  userId: string;
}

// Server -> Client Payloads
export interface FlightInitialStatePayload {
  flight: Flight;
  seats: Seat[];
  metrics: FlightMetrics;
  serverTime: number;
}

export interface SeatLockedEventPayload {
  flightId: string;
  seatId: string;
  seatNumber: string;
  lockedByUserId: string;
  lockedUntil: number; // epoch ms (TTL)
  remainingSeconds: number;
}

export interface SeatLockFailedEventPayload {
  flightId: string;
  seatId: string;
  message: string;
  currentStatus: SeatStatus;
}

export interface SeatReleasedEventPayload {
  flightId: string;
  seatId: string;
  seatNumber: string;
  reason: 'EXPIRED' | 'USER_UNLOCKED' | 'BOOKED' | 'SYSTEM' | 'DISCONNECTED';
}

export interface SeatBookedEventPayload {
  flightId: string;
  seatId: string;
  seatNumber: string;
  bookingReference: string;
}

export interface FlightStatusUpdatedEventPayload {
  flightId: string;
  newStatus: FlightStatus;
  previousStatus: FlightStatus;
}
