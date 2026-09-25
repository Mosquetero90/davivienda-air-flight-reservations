import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightService } from './flight.service';
import { FlightController } from './flight.controller';
import { SeatModule } from '../seat/seat.module';
import { MetricsModule } from '../metrics/metrics.module';
import { FlightEntity, SeatEntity } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlightEntity, SeatEntity]),
    SeatModule,
    forwardRef(() => MetricsModule),
  ],
  controllers: [FlightController],
  providers: [FlightService],
  exports: [FlightService],
})
export class FlightModule {}
