import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { FlightEntity } from './flight.entity';
import { PassengerEntity } from './passenger.entity';
import { PaymentEntity } from './payment.entity';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  bookingReference: string; // PNR ej: "DV-8X9K2"

  @Column({ type: 'varchar', length: 50 })
  flightId: string;

  @Column({ type: 'varchar', length: 50 })
  seatId: string;

  @Column({ type: 'varchar', length: 10 })
  seatNumber: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({ type: 'varchar', length: 10, default: 'COP' })
  currency: string;

  @Column({ type: 'varchar', length: 30, default: 'CONFIRMED' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => FlightEntity, (flight) => flight.bookings)
  @JoinColumn({ name: 'flightId' })
  flight: FlightEntity;

  @OneToOne(() => PassengerEntity, (passenger) => passenger.booking, {
    cascade: true,
  })
  passenger: PassengerEntity;

  @OneToOne(() => PaymentEntity, (payment) => payment.booking, {
    cascade: true,
  })
  payment: PaymentEntity;
}
