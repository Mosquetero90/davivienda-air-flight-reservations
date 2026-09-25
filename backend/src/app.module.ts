import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { SeatModule } from './modules/seat/seat.module';
import { FlightModule } from './modules/flight/flight.module';
import { BookingModule } from './modules/booking/booking.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { LocationModule } from './modules/location/location.module';
import { FlightGateway } from './gateway/flight.gateway';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    SeatModule,
    FlightModule,
    BookingModule,
    MetricsModule,
    LocationModule,
  ],
  providers: [FlightGateway],
})
export class AppModule {}

