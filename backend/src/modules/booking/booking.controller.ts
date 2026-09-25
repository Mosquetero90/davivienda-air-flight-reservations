import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { Booking, BookingResponseDto, CreateBookingDto } from '@davivienda/shared';

@Controller('api/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.createBooking(dto);
  }

  @Get(':pnr')
  async getBookingByPnr(@Param('pnr') pnr: string): Promise<Booking> {
    const booking = await this.bookingService.getBookingByReference(pnr);
    if (!booking) {
      throw new NotFoundException(`Reserva con código PNR ${pnr} no encontrada.`);
    }
    return booking;
  }
}
