import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightService } from './flight.service';
import { FlightController } from './flight.controller';
import { SeatModule } from '../seat/seat.module';
import { FlightEntity, SeatEntity } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlightEntity, SeatEntity]),
    SeatModule,
  ],
  controllers: [FlightController],
  providers: [FlightService],
  exports: [FlightService],
})
export class FlightModule {}
