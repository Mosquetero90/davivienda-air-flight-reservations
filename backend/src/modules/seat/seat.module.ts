import { Module } from '@nestjs/common';
import { SeatLockService } from './seat-lock.service';

@Module({
  providers: [SeatLockService],
  exports: [SeatLockService],
})
export class SeatModule {}
