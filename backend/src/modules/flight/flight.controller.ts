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
import {
  FlightDto,
  SeatDto,
  FlightMetricsDto,
  UpdateFlightStatusDto,
  ErrorResponseDto,
} from '../../common/dto/swagger-models.dto';

@ApiTags('Vuelos')
@Controller('api/flights')
export class FlightController {
  constructor(
    private readonly flightService: FlightService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Buscar vuelos por origen, destino y fecha' })
  @ApiQuery({ name: 'origin', required: false, description: 'Código o nombre de ciudad origen (ej: BOG)' })
  @ApiQuery({ name: 'destination', required: false, description: 'Código o nombre de ciudad destino (ej: MDE)' })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha de salida (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, type: [FlightDto], description: 'Listado de vuelos encontrados' })
  async searchFlights(
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
    @Query('date') date?: string,
  ): Promise<Flight[]> {
    return this.flightService.searchFlights({ origin, destination, date });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar información de un vuelo por ID' })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiResponse({ status: 200, type: FlightDto, description: 'Detalle del vuelo' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Vuelo no encontrado' })
  async getFlightById(@Param('id') id: string): Promise<Flight> {
    return this.flightService.getFlightById(id);
  }

  @Get(':id/seats')
  @ApiTags('Asientos')
  @ApiOperation({ summary: 'Consultar matriz de asientos de la cabina' })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiResponse({ status: 200, type: [SeatDto], description: 'Listado de asientos con su estado actual' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Vuelo no encontrado' })
  async getSeats(@Param('id') id: string): Promise<Seat[]> {
    return this.flightService.getSeatsForFlight(id);
  }

  @Get(':id/metrics')
  @ApiTags('Métricas')
  @ApiOperation({ summary: 'Consultar métricas de ocupación del vuelo' })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiResponse({ status: 200, type: FlightMetricsDto, description: 'Métricas de ocupación y desglose de cabina' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Vuelo no encontrado' })
  async getMetrics(@Param('id') id: string): Promise<FlightMetrics> {
    return this.metricsService.getMetricsForFlight(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo vuelo' })
  @ApiResponse({ status: 201, type: FlightDto, description: 'Vuelo creado exitosamente' })
  async createFlight(@Body() data: any): Promise<Flight> {
    return this.flightService.createFlight(data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado operativo de un vuelo' })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiBody({ type: UpdateFlightStatusDto })
  @ApiResponse({ status: 200, type: FlightDto, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Vuelo no encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: FlightStatus,
  ): Promise<Flight> {
    return this.flightService.updateFlightStatus(id, status);
  }
}
