import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { Booking, BookingResponseDto, CreateBookingDto } from '@davivienda/shared';
import {
  CreateBookingRequestDto,
  BookingResponseDto as SwaggerBookingResponseDto,
  ErrorResponseDto,
} from '../../common/dto/swagger-models.dto';

@ApiTags('Reservas')
@Controller('api/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Crear y confirmar una reserva de vuelo' })
  @ApiBody({ type: CreateBookingRequestDto })
  @ApiResponse({
    status: 201,
    type: SwaggerBookingResponseDto,
    description: 'Reserva confirmada exitosamente con código PNR emitido',
  })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'Conflicto: Asiento no bloqueado por este usuario o ya reservado',
  })
  async createBooking(
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.createBooking(dto);
  }

  @Get(':pnr')
  @ApiOperation({ summary: 'Consultar reserva por código PNR' })
  @ApiParam({ name: 'pnr', description: 'Código PNR de la reserva (ej: DV-8X9K2)' })
  @ApiResponse({
    status: 200,
    type: SwaggerBookingResponseDto,
    description: 'Detalle de la reserva y pasabordo digital',
  })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: 'Reserva no encontrada',
  })
  async getBookingByPnr(@Param('pnr') pnr: string): Promise<Booking> {
    const booking = await this.bookingService.getBookingByReference(pnr);
    if (!booking) {
      throw new NotFoundException(`Reserva con código PNR ${pnr} no encontrada.`);
    }
    return booking;
  }
}
