import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  method: string; // DAVIPLATA, CARD, PSE

  @Column({ type: 'varchar', length: 100 })
  transactionId: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  lastFourDigits: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 30, default: 'APPROVED' })
  status: string;

  @CreateDateColumn()
  paidAt: Date;

  @OneToOne(() => BookingEntity, (booking) => booking.payment)
  @JoinColumn({ name: 'bookingId' })
  booking: BookingEntity;
}
