import { DataSource } from 'typeorm';
import { LocationService } from './location.service';
import {
  CountryEntity,
  CityEntity,
  AirportEntity,
  FlightEntity,
  SeatEntity,
  BookingEntity,
  PassengerEntity,
  PaymentEntity,
} from '../../database/entities';
import { DatabaseSeederService } from '../../database/database-seeder.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('LocationService (Relational Catalog)', () => {
  let locationService: LocationService;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [
        CountryEntity,
        CityEntity,
        AirportEntity,
        FlightEntity,
        SeatEntity,
        BookingEntity,
        PassengerEntity,
        PaymentEntity,
      ],
      synchronize: true,
    });
    await dataSource.initialize();

    const seeder = new DatabaseSeederService(
      dataSource.getRepository(FlightEntity),
      dataSource.getRepository(SeatEntity),
      dataSource.getRepository(BookingEntity),
      dataSource.getRepository(PassengerEntity),
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(CountryEntity),
      dataSource.getRepository(CityEntity),
      dataSource.getRepository(AirportEntity),
    );
    await seeder.seedLocations();

    locationService = new LocationService(
      dataSource.getRepository(CityEntity),
      dataSource.getRepository(AirportEntity),
      dataSource.getRepository(CountryEntity),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('debe retornar las ciudades con sus relaciones de país y aeropuertos', async () => {
    const cities = await locationService.getCities();
    expect(cities.length).toBeGreaterThanOrEqual(7);

    const bogota = cities.find((c) => c.id === 'bogota');
    expect(bogota).toBeDefined();
    expect(bogota?.name).toBe('Bogotá');
    expect(bogota?.countryCode).toBe('CO');
    expect(bogota?.airports?.length).toBeGreaterThan(0);
    expect(bogota?.airports?.[0].iataCode).toBe('BOG');
  });

  it('debe retornar los países registrados con sus ciudades', async () => {
    const countries = await locationService.getCountries();
    expect(countries.length).toBeGreaterThanOrEqual(1);

    const colombia = countries.find((c) => c.code === 'CO');
    expect(colombia).toBeDefined();
    expect(colombia?.currency).toBe('COP');
    expect(colombia?.cities?.length).toBeGreaterThanOrEqual(7);
  });

  it('debe retornar todos los aeropuertos registrados', async () => {
    const airports = await locationService.getAirports();
    expect(airports.length).toBeGreaterThanOrEqual(7);

    const mde = airports.find((a) => a.iataCode === 'MDE');
    expect(mde).toBeDefined();
    expect(mde?.cityId).toBe('medellin');
  });

  it('debe permitir crear una nueva ciudad dinámicamente', async () => {
    const newCity = await locationService.createCity({
      name: 'Bucaramanga',
      countryCode: 'CO',
    });

    expect(newCity).toBeDefined();
    expect(newCity.id).toBe('bucaramanga');
    expect(newCity.name).toBe('Bucaramanga');
    expect(newCity.countryCode).toBe('CO');
  });

  it('debe lanzar ConflictException si la ciudad ya existe', async () => {
    await expect(
      locationService.createCity({
        id: 'bucaramanga',
        name: 'Bucaramanga',
        countryCode: 'CO',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe permitir crear un nuevo aeropuerto para una ciudad existente', async () => {
    const newAirport = await locationService.createAirport({
      iataCode: 'BGA',
      name: 'Aeropuerto Internacional Palonegro',
      cityId: 'bucaramanga',
    });

    expect(newAirport).toBeDefined();
    expect(newAirport.iataCode).toBe('BGA');
    expect(newAirport.name).toBe('Aeropuerto Internacional Palonegro');
    expect(newAirport.cityId).toBe('bucaramanga');
  });

  it('debe lanzar NotFoundException si se intenta crear un aeropuerto en una ciudad inexistente', async () => {
    await expect(
      locationService.createAirport({
        iataCode: 'XYZ',
        name: 'Aeropuerto Fantasma',
        cityId: 'ciudad-no-existe',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
