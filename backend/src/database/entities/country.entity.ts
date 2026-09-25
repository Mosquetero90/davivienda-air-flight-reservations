import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { CityEntity } from './city.entity';

@Entity('countries')
export class CountryEntity {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  code!: string; // ej: "CO"

  @Column({ type: 'varchar', length: 100 })
  name!: string; // ej: "Colombia"

  @Column({ type: 'varchar', length: 10, default: 'COP' })
  currency!: string;

  @OneToMany(() => CityEntity, (city) => city.country)
  cities!: CityEntity[];
}
