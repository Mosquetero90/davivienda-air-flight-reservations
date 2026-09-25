import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LocationService } from './location.service';
import {
  CityDto,
  CountryDto,
  AirportDto,
  CreateCityInputDto,
  CreateAirportInputDto,
  ErrorResponseDto,
} from '../../common/dto/swagger-models.dto';

@ApiTags('Ubicaciones')
@Controller('api/locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('cities')
  @ApiOperation({ summary: 'Obtener catálogo de ciudades con sus aeropuertos' })
  @ApiResponse({ status: 200, type: [CityDto], description: 'Listado de ciudades disponibles' })
  async getCities() {
    return this.locationService.getCities();
  }

  @Get('countries')
  @ApiOperation({ summary: 'Obtener catálogo de países' })
  @ApiResponse({ status: 200, type: [CountryDto], description: 'Listado de países registrados' })
  async getCountries() {
    return this.locationService.getCountries();
  }

  @Get('airports')
  @ApiOperation({ summary: 'Obtener catálogo de aeropuertos' })
  @ApiResponse({ status: 200, type: [AirportDto], description: 'Listado de aeropuertos registrados' })
  async getAirports() {
    return this.locationService.getAirports();
  }

  @Post('cities')
  @ApiOperation({ summary: 'Registrar una nueva ciudad en el catálogo' })
  @ApiBody({ type: CreateCityInputDto })
  @ApiResponse({ status: 201, type: CityDto, description: 'Ciudad creada exitosamente' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'País no encontrado' })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'La ciudad ya existe' })
  async createCity(@Body() dto: CreateCityInputDto) {
    return this.locationService.createCity(dto);
  }

  @Post('airports')
  @ApiOperation({ summary: 'Registrar un nuevo aeropuerto en una ciudad' })
  @ApiBody({ type: CreateAirportInputDto })
  @ApiResponse({ status: 201, type: AirportDto, description: 'Aeropuerto creado exitosamente' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Ciudad no encontrada' })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'El aeropuerto ya existe' })
  async createAirport(@Body() dto: CreateAirportInputDto) {
    return this.locationService.createAirport(dto);
  }
}
