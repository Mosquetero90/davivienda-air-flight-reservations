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

@ApiTags('Reservas y Pagos (HU3)')
@Controller('api/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({
    summary: 'Confirmar reserva y emitir tiquete PNR (HU3)',
    description:
      'Procesa el formulario de pasajero y el pago simulado (DaviPlata / Tarjeta Davivienda). Ejecuta una transacción ACID en PostgreSQL, libera el lock temporal de Redis y genera el código PNR alfanumérico para el pasabordo digital.',
  })
  @ApiBody({
    description: 'Datos de la reserva, pasajero, asiento seleccionado y método de pago',
    schema: {
      type: 'object',
      required: ['flightId', 'seatNumber', 'passenger', 'payment'],
      properties: {
        flightId: { type: 'string', example: 'DV-204' },
        seatNumber: { type: 'string', example: '12B' },
        passenger: {
          type: 'object',
          properties: {
            fullName: { type: 'string', example: 'Carlos Mendoza' },
            documentType: { type: 'string', example: 'CC' },
            documentNumber: { type: 'string', example: '1020304050' },
            email: { type: 'string', example: 'carlos.mendoza@davivienda.com' },
            phone: { type: 'string', example: '+57 310 123 4567' },
          },
        },
        payment: {
          type: 'object',
          properties: {
            method: { type: 'string', example: 'DAVIPLATA' },
            amount: { type: 'number', example: 285000 },
            currency: { type: 'string', example: 'COP' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva confirmada exitosamente con código PNR y tiquete emitido.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: El asiento no se encuentra bloqueado por este usuario o ya fue adquirido.',
  })
  async createBooking(
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.createBooking(dto);
  }

  @Get(':pnr')
  @ApiOperation({
    summary: 'Consultar reserva por código alfanumérico PNR',
    description:
      'Recupera el pasabordo digital y la información completa de la reserva dado el código PNR de 6 caracteres.',
  })
  @ApiParam({ name: 'pnr', description: 'Código PNR de la reserva (ej: DV-8X9K2)', example: 'DV-204-12B' })
  @ApiResponse({ status: 200, description: 'Reserva encontrada con detalle de pasajero y tiquete.' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada con el código PNR especificado.' })
  async getBookingByPnr(@Param('pnr') pnr: string): Promise<Booking> {
    const booking = await this.bookingService.getBookingByReference(pnr);
    if (!booking) {
      throw new NotFoundException(`Reserva con código PNR ${pnr} no encontrada.`);
    }
    return booking;
  }
}
