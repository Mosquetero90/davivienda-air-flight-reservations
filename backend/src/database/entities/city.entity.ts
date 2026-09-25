import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CountryEntity } from './country.entity';
import { AirportEntity } from './airport.entity';

@Entity('cities')
export class CityEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string; // ej: "bogota"

  @Column({ type: 'varchar', length: 100 })
  name!: string; // ej: "Bogotá"

  @Column({ type: 'varchar', length: 10 })
  countryCode!: string;

  @ManyToOne(() => CountryEntity, (country) => country.cities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'countryCode' })
  country!: CountryEntity;

  @OneToMany(() => AirportEntity, (airport) => airport.city)
  airports!: AirportEntity[];
}
