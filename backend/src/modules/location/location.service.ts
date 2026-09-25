import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CityEntity, AirportEntity, CountryEntity } from '../../database/entities';
import { CreateCityDto, CreateAirportDto } from '@davivienda/shared';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(AirportEntity)
    private readonly airportRepo: Repository<AirportEntity>,
    @InjectRepository(CountryEntity)
    private readonly countryRepo: Repository<CountryEntity>,
  ) {}

  async getCities(): Promise<CityEntity[]> {
    return this.cityRepo.find({
      relations: { country: true, airports: true },
      order: { name: 'ASC' },
    });
  }

  async getCountries(): Promise<CountryEntity[]> {
    return this.countryRepo.find({
      relations: { cities: true },
      order: { name: 'ASC' },
    });
  }

  async getAirports(): Promise<AirportEntity[]> {
    return this.airportRepo.find({
      relations: { city: true },
      order: { iataCode: 'ASC' },
    });
  }

  async createCity(dto: CreateCityDto): Promise<CityEntity> {
    const country = await this.countryRepo.findOne({
      where: { code: dto.countryCode.toUpperCase() },
    });
    if (!country) {
      throw new NotFoundException(`País con código '${dto.countryCode}' no encontrado.`);
    }

    const cityId =
      dto.id ||
      dto.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const existing = await this.cityRepo.findOne({ where: { id: cityId } });
    if (existing) {
      throw new ConflictException(`La ciudad con ID '${cityId}' ya existe.`);
    }

    const city = this.cityRepo.create({
      id: cityId,
      name: dto.name.trim(),
      countryCode: country.code,
    });

    return this.cityRepo.save(city);
  }

  async createAirport(dto: CreateAirportDto): Promise<AirportEntity> {
    const city = await this.cityRepo.findOne({ where: { id: dto.cityId } });
    if (!city) {
      throw new NotFoundException(`Ciudad con ID '${dto.cityId}' no encontrada.`);
    }

    const iataCode = dto.iataCode.toUpperCase().trim();
    const existing = await this.airportRepo.findOne({ where: { iataCode } });
    if (existing) {
      throw new ConflictException(`El aeropuerto con código IATA '${iataCode}' ya existe.`);
    }

    const airport = this.airportRepo.create({
      iataCode,
      name: dto.name.trim(),
      cityId: city.id,
    });

    return this.airportRepo.save(airport);
  }
}
