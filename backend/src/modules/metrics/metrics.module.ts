import { Module, forwardRef } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { FlightModule } from '../flight/flight.module';

@Module({
  imports: [forwardRef(() => FlightModule)],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
