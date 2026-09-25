import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { FlightStatus, CabinLayout } from '@davivienda/shared';
import { SeatEntity } from './seat.entity';
import { BookingEntity } from './booking.entity';

@Entity('flights')
@Index(['originCode', 'destinationCode', 'departureTime'])
export class FlightEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // ej: "DV-204"

  @Column({ type: 'varchar', length: 20 })
  flightNumber: string;

  @Column({ type: 'varchar', length: 100, default: 'Davivienda Air' })
  airline: string;

  @Column({ type: 'varchar', length: 50, default: 'Airbus A320neo' })
  aircraftModel: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  originCode: string;

  @Column({ type: 'varchar', length: 100 })
  originCity: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  destinationCode: string;

  @Column({ type: 'varchar', length: 100 })
  destinationCity: string;

  @Index()
  @Column({ type: 'varchar' })
  departureTime: string;

  @Column({ type: 'varchar' })
  arrivalTime: string;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  basePrice: number;

  @Column({ type: 'varchar', length: 10, default: 'COP' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: FlightStatus.ON_TIME,
  })
  status: FlightStatus;

  @Column({ type: 'simple-json' })
  cabinLayout: CabinLayout;

  @Column({ type: 'int', default: 180 })
  totalSeats: number;

  @OneToMany(() => SeatEntity, (seat) => seat.flight, { cascade: true })
  seats: SeatEntity[];

  @OneToMany(() => BookingEntity, (booking) => booking.flight)
  bookings: BookingEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
