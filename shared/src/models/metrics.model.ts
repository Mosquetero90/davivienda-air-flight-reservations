export interface FlightMetrics {
  flightId: string;
  flightNumber: string;
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  bookedSeats: number;
  occupancyPercentage: number;
  revenueEstimated: number;
  lastUpdated: number; // epoch ms
}
