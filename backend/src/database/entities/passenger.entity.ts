import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';

@Entity('passengers')
export class PassengerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 20 })
  documentType: string; // CC, CE, PASSPORT

  @Column({ type: 'varchar', length: 50 })
  documentNumber: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @OneToOne(() => BookingEntity, (booking) => booking.passenger)
  @JoinColumn({ name: 'bookingId' })
  booking: BookingEntity;
}
