import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FlightService } from './flight.service';
import { MetricsService } from '../metrics/metrics.service';
import { Flight, FlightMetrics, FlightStatus, Seat } from '@davivienda/shared';

@ApiTags('Vuelos (HU1)')
@Controller('api/flights')
export class FlightController {
  constructor(
    private readonly flightService: FlightService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Buscar y listar vuelos disponibles',
    description:
      'Permite buscar vuelos filtrando por ciudad de origen, destino y fecha. Retorna inventario actualizado de asientos disponibles.',
  })
  @ApiQuery({ name: 'origin', required: false, description: 'Código o nombre de ciudad de origen (ej: BOG, Bogotá)' })
  @ApiQuery({ name: 'destination', required: false, description: 'Código o nombre de ciudad destino (ej: MDE, Medellín)' })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha de salida en formato YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Listado de vuelos coincidentes con el criterio de búsqueda.' })
  async searchFlights(
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
    @Query('date') date?: string,
  ): Promise<Flight[]> {
    return this.flightService.searchFlights({ origin, destination, date });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un vuelo por ID o número de vuelo' })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiResponse({ status: 200, description: 'Detalle del vuelo solicitado.' })
  @ApiResponse({ status: 404, description: 'Vuelo no encontrado.' })
  async getFlightById(@Param('id') id: string): Promise<Flight> {
    return this.flightService.getFlightById(id);
  }

  @Get(':id/seats')
  @ApiOperation({
    summary: 'Consultar matriz de asientos de la cabina (Airbus A320)',
    description:
      'Retorna el estado de los 180 asientos del Airbus A320neo, combinando la persistencia relacional con los bloqueos temporales activos en Redis.',
  })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiResponse({ status: 200, description: 'Matriz completa de asientos con su estado actual (AVAILABLE, LOCKED, BOOKED).' })
  async getSeats(@Param('id') id: string): Promise<Seat[]> {
    return this.flightService.getSeatsForFlight(id);
  }

  @Get(':id/metrics')
  @ApiOperation({
    summary: 'Obtener métricas de ocupación en tiempo real (HU4)',
    description:
      'Calcula en tiempo O(1) la tasa de ocupación, total de asientos disponibles, bloqueados y vendidos, junto con el desglose por clase Ejecutiva y Turista.',
  })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiResponse({ status: 200, description: 'Métricas agregadas de ocupación en tiempo real.' })
  async getMetrics(@Param('id') id: string): Promise<FlightMetrics> {
    return this.metricsService.getMetricsForFlight(id);
  }

  /**
   * Endpoint administrativo para crear nuevos vuelos en caliente.
   */
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo vuelo (Administrativo)' })
  @ApiResponse({ status: 201, description: 'Vuelo y cabina de 180 asientos generados exitosamente.' })
  async createFlight(@Body() data: any): Promise<Flight> {
    return this.flightService.createFlight(data);
  }

  /**
   * Endpoint administrativo / simulación para cambiar estado de un vuelo (HU1).
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Actualizar estado operativo de un vuelo (HU1)',
    description:
      'Modifica el estado del vuelo (ON_TIME, DELAYED, CANCELLED) y emite de forma reactiva el evento flight:status_updated a todos los clientes conectados vía WebSocket.',
  })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ON_TIME', 'DELAYED', 'CANCELLED'], example: 'DELAYED' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado y evento reactivo propagado a los clientes.' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: FlightStatus,
  ): Promise<Flight> {
    return this.flightService.updateFlightStatus(id, status);
  }
}
