import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CityEntity } from './city.entity';

@Entity('airports')
export class AirportEntity {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  iataCode!: string; // ej: "BOG"

  @Column({ type: 'varchar', length: 150 })
  name!: string; // ej: "Aeropuerto Internacional El Dorado"

  @Column({ type: 'varchar', length: 50 })
  cityId!: string;

  @ManyToOne(() => CityEntity, (city) => city.airports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cityId' })
  city!: CityEntity;
}
