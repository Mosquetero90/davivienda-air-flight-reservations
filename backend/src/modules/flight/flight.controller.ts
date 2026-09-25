import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FlightService } from './flight.service';
import { MetricsService } from '../metrics/metrics.service';
import { Flight, FlightMetrics, FlightStatus, Seat } from '@davivienda/shared';

@Controller('api/flights')
export class FlightController {
  constructor(
    private readonly flightService: FlightService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  async searchFlights(
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
    @Query('date') date?: string,
  ): Promise<Flight[]> {
    return this.flightService.searchFlights({ origin, destination, date });
  }

  @Get(':id')
  async getFlightById(@Param('id') id: string): Promise<Flight> {
    return this.flightService.getFlightById(id);
  }

  @Get(':id/seats')
  async getSeats(@Param('id') id: string): Promise<Seat[]> {
    return this.flightService.getSeatsForFlight(id);
  }

  @Get(':id/metrics')
  async getMetrics(@Param('id') id: string): Promise<FlightMetrics> {
    return this.metricsService.getMetricsForFlight(id);
  }

  /**
   * Endpoint administrativo para crear nuevos vuelos en caliente.
   */
  @Post()
  async createFlight(@Body() data: any): Promise<Flight> {
    return this.flightService.createFlight(data);
  }

  /**
   * Endpoint administrativo / simulación para cambiar estado de un vuelo (HU1).
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: FlightStatus,
  ): Promise<Flight> {
    return this.flightService.updateFlightStatus(id, status);
  }
}
