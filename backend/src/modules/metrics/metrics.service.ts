import { Injectable, Logger } from '@nestjs/common';
import { FlightMetrics, SeatStatus } from '@davivienda/shared';
import { FlightService } from '../flight/flight.service';
import { Subject } from 'rxjs';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // Stream reactivo para métricas en vivo (HU4 Dashboard)
  public readonly metricsUpdated$ = new Subject<FlightMetrics>();

  constructor(private readonly flightService: FlightService) {}

  /**
   * Calcula en tiempo real las métricas de un vuelo (asientos disponibles, bloqueados, ocupados e ingresos).
   */
  async getMetricsForFlight(flightId: string): Promise<FlightMetrics> {
    const flight = await this.flightService.getFlightById(flightId);
    const seats = await this.flightService.getSeatsForFlight(flightId);

    const totalSeats = seats.length;
    let availableSeats = 0;
    let lockedSeats = 0;
    let bookedSeats = 0;
    let revenueEstimated = 0;

    for (const seat of seats) {
      if (seat.status === SeatStatus.BOOKED) {
        bookedSeats++;
        revenueEstimated += seat.price;
      } else if (seat.status === SeatStatus.LOCKED) {
        lockedSeats++;
        // Se cuenta el potencial de ingreso de bloqueos activos
        revenueEstimated += Math.round(seat.price * 0.5);
      } else {
        availableSeats++;
      }
    }

    const occupancyPercentage =
      totalSeats > 0
        ? Math.round(((bookedSeats + lockedSeats) / totalSeats) * 1000) / 10
        : 0;

    const metrics: FlightMetrics = {
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      totalSeats,
      availableSeats,
      lockedSeats,
      bookedSeats,
      occupancyPercentage,
      revenueEstimated,
      lastUpdated: Date.now(),
    };

    return metrics;
  }

  /**
   * Recalcula y emite métricas actualizadas a los suscriptores de WebSockets.
   */
  async notifyMetricsUpdated(flightId: string): Promise<FlightMetrics> {
    try {
      const metrics = await this.getMetricsForFlight(flightId);
      this.metricsUpdated$.next(metrics);
      return metrics;
    } catch (err) {
      this.logger.error(`Error calculando métricas para ${flightId}: ${err}`);
      throw err;
    }
  }
}
