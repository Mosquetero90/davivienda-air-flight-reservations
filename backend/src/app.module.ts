import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
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
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 10,
      },
    ]),
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

