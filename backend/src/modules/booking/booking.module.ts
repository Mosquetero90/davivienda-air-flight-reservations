import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { FlightModule } from '../flight/flight.module';
import { SeatModule } from '../seat/seat.module';
import {
  BookingEntity,
  PassengerEntity,
  PaymentEntity,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, PassengerEntity, PaymentEntity]),
    FlightModule,
    SeatModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
