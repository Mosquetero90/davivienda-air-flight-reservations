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
import { Flight, FlightStatus, Seat, PaginatedFlightsResult } from '@davivienda/shared';
import {
  FlightDto,
  PaginatedFlightsDto,
  SeatDto,
  UpdateFlightStatusDto,
  ErrorResponseDto,
  SearchFlightsQueryDto,
  CreateFlightDto,
} from '../../common/dto/swagger-models.dto';

@ApiTags('Vuelos')
@Controller('api/flights')
export class FlightController {
  constructor(
    private readonly flightService: FlightService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Buscar vuelos por origen, destino y fecha con paginación' })
  @ApiQuery({ name: 'origin', required: false, description: 'Código o nombre de ciudad origen (ej: BOG)' })
  @ApiQuery({ name: 'destination', required: false, description: 'Código o nombre de ciudad destino (ej: MDE)' })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha de salida (YYYY-MM-DD)' })
  @ApiQuery({ name: 'passengers', required: false, description: 'Número de pasajeros solicitados (ej: 1)' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de vuelos por página (default: 5)' })
  @ApiResponse({ status: 200, type: PaginatedFlightsDto, description: 'Listado paginado de vuelos encontrados' })
  async searchFlights(@Query() query: SearchFlightsQueryDto): Promise<PaginatedFlightsResult> {
    return this.flightService.searchFlights(query);
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

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo vuelo' })
  @ApiResponse({ status: 201, type: FlightDto, description: 'Vuelo creado exitosamente' })
  async createFlight(@Body() data: CreateFlightDto): Promise<Flight> {
    return this.flightService.createFlight(data as any);
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
