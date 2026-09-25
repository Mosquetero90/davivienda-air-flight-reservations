import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FlightMetrics } from '@davivienda/shared';
import { MetricsService } from './metrics.service';
import { FlightMetricsDto, ErrorResponseDto } from '../../common/dto/swagger-models.dto';

@ApiTags('Métricas')
@Controller('api/flights')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Consultar métricas de ocupación del vuelo' })
  @ApiParam({ name: 'id', description: 'Identificador del vuelo (ej: DV-204)' })
  @ApiResponse({ status: 200, type: FlightMetricsDto, description: 'Métricas de ocupación y desglose de cabina' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Vuelo no encontrado' })
  async getMetrics(@Param('id') id: string): Promise<FlightMetrics> {
    return this.metricsService.getMetricsForFlight(id);
  }
}
