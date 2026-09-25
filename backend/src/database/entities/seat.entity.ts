import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SeatClass, SeatStatus } from '@davivienda/shared';
import { FlightEntity } from './flight.entity';

@Entity('seats')
@Index(['flightId', 'seatNumber'], { unique: true })
export class SeatEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // ej: "DV-204-12B"

  @Column({ type: 'varchar', length: 50 })
  flightId: string;

  @Column({ type: 'varchar', length: 10 })
  seatNumber: string; // "12B"

  @Column({ type: 'int' })
  rowNumber: number;

  @Column({ type: 'varchar', length: 5 })
  columnLetter: string; // "A", "B", ...

  @Column({
    type: 'varchar',
    length: 30,
    default: SeatClass.ECONOMY,
  })
  seatClass: SeatClass;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'boolean', default: false })
  isExitRow: boolean;

  @Column({
    type: 'varchar',
    length: 30,
    default: SeatStatus.AVAILABLE,
  })
  status: SeatStatus; // AVAILABLE o BOOKED (los bloqueos temporales LOCKED van en Redis)

  @Column({ type: 'varchar', length: 20, nullable: true })
  bookingReference?: string;

  @ManyToOne(() => FlightEntity, (flight) => flight.seats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'flightId' })
  flight: FlightEntity;
}
