import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FlightEntity,
  SeatEntity,
  BookingEntity,
  PassengerEntity,
  PaymentEntity,
  CountryEntity,
  CityEntity,
  AirportEntity,
} from './entities';
import { FlightStatus, SeatClass, SeatStatus } from '@davivienda/shared';

@Injectable()
export class DatabaseSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectRepository(FlightEntity)
    private readonly flightRepo: Repository<FlightEntity>,
    @InjectRepository(SeatEntity)
    private readonly seatRepo: Repository<SeatEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(PassengerEntity)
    private readonly passengerRepo: Repository<PassengerEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(CountryEntity)
    private readonly countryRepo: Repository<CountryEntity>,
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(AirportEntity)
    private readonly airportRepo: Repository<AirportEntity>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedLocations();
    await this.seedFlightsAndSeats();
  }

  public async seedLocations() {
    const countriesCount = await this.countryRepo.count();
    if (countriesCount > 0) {
      return;
    }

    this.logger.log('🗺️ Sembrando catálogo geográfico relacional (Países, Ciudades y Aeropuertos)...');

    // 1. País: Colombia
    const colombia = this.countryRepo.create({
      code: 'CO',
      name: 'Colombia',
      currency: 'COP',
    });
    await this.countryRepo.save(colombia);

    // 2. Ciudades
    const citiesData = [
      { id: 'bogota', name: 'Bogotá', countryCode: 'CO' },
      { id: 'medellin', name: 'Medellín', countryCode: 'CO' },
      { id: 'cartagena', name: 'Cartagena', countryCode: 'CO' },
      { id: 'cali', name: 'Cali', countryCode: 'CO' },
      { id: 'santa-marta', name: 'Santa Marta', countryCode: 'CO' },
      { id: 'barranquilla', name: 'Barranquilla', countryCode: 'CO' },
      { id: 'san-andres', name: 'San Andrés', countryCode: 'CO' },
    ];

    const savedCities = await this.cityRepo.save(
      citiesData.map((c) => this.cityRepo.create(c)),
    );

    // 3. Aeropuertos
    const airportsData = [
      { iataCode: 'BOG', name: 'Aeropuerto Internacional El Dorado', cityId: 'bogota' },
      { iataCode: 'MDE', name: 'Aeropuerto Internacional José María Córdova', cityId: 'medellin' },
      { iataCode: 'CTG', name: 'Aeropuerto Internacional Rafael Núñez', cityId: 'cartagena' },
      { iataCode: 'CLO', name: 'Aeropuerto Internacional Alfonso Bonilla Aragón', cityId: 'cali' },
      { iataCode: 'SMR', name: 'Aeropuerto Internacional Simón Bolívar', cityId: 'santa-marta' },
      { iataCode: 'BAQ', name: 'Aeropuerto Internacional Ernesto Cortissoz', cityId: 'barranquilla' },
      { iataCode: 'ADZ', name: 'Aeropuerto Internacional Gustavo Rojas Pinilla', cityId: 'san-andres' },
    ];

    await this.airportRepo.save(
      airportsData.map((a) => this.airportRepo.create(a)),
    );

    this.logger.log(`✓ Catálogo geográfico sembrado: 1 país, ${savedCities.length} ciudades y ${airportsData.length} aeropuertos.`);
  }

  private async seedFlightsAndSeats() {
    const today = new Date().toISOString().split('T')[0];

    const cabinLayout = {
      rows: 30,
      columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      aisleAfterColumn: ['C'],
      exitRows: [11, 12],
      businessRows: [1, 2, 3],
    };

    interface SeedFlightDef {
      id: string;
      flightNumber: string;
      airline: string;
      aircraftModel: string;
      originCity: string;
      destinationCity: string;
      originCode: string;
      destinationCode: string;
      depTime: string;
      arrTime: string;
      durationMinutes: number;
      basePrice: number;
      status: FlightStatus;
    }

    const flightsDef: SeedFlightDef[] = [
      // 1. Bogotá <-> Medellín (MDE)
      // Ida BOG -> MDE (5 horarios)
      {
        id: 'DV-200',
        flightNumber: 'DV-200',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Medellín (MDE)',
        originCode: 'BOG',
        destinationCode: 'MDE',
        depTime: '06:00:00',
        arrTime: '06:55:00',
        durationMinutes: 55,
        basePrice: 280000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-202',
        flightNumber: 'DV-202',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Medellín (MDE)',
        originCode: 'BOG',
        destinationCode: 'MDE',
        depTime: '09:15:00',
        arrTime: '10:10:00',
        durationMinutes: 55,
        basePrice: 260000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-204',
        flightNumber: 'DV-204',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Medellín (MDE)',
        originCode: 'BOG',
        destinationCode: 'MDE',
        depTime: '12:30:00',
        arrTime: '13:25:00',
        durationMinutes: 55,
        basePrice: 290000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-206',
        flightNumber: 'DV-206',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Medellín (MDE)',
        originCode: 'BOG',
        destinationCode: 'MDE',
        depTime: '15:45:00',
        arrTime: '16:40:00',
        durationMinutes: 55,
        basePrice: 250000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-318',
        flightNumber: 'DV-318',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Medellín (MDE)',
        originCode: 'BOG',
        destinationCode: 'MDE',
        depTime: '18:30:00',
        arrTime: '19:25:00',
        durationMinutes: 55,
        basePrice: 245000,
        status: FlightStatus.DELAYED,
      },
      // Regreso MDE -> BOG (5 horarios)
      {
        id: 'DV-201',
        flightNumber: 'DV-201',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Medellín (MDE)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'MDE',
        destinationCode: 'BOG',
        depTime: '07:30:00',
        arrTime: '08:25:00',
        durationMinutes: 55,
        basePrice: 285000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-203',
        flightNumber: 'DV-203',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Medellín (MDE)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'MDE',
        destinationCode: 'BOG',
        depTime: '10:45:00',
        arrTime: '11:40:00',
        durationMinutes: 55,
        basePrice: 265000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-205',
        flightNumber: 'DV-205',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Medellín (MDE)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'MDE',
        destinationCode: 'BOG',
        depTime: '14:15:00',
        arrTime: '15:10:00',
        durationMinutes: 55,
        basePrice: 290000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-207',
        flightNumber: 'DV-207',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Medellín (MDE)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'MDE',
        destinationCode: 'BOG',
        depTime: '17:30:00',
        arrTime: '18:25:00',
        durationMinutes: 55,
        basePrice: 275000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-319',
        flightNumber: 'DV-319',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Medellín (MDE)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'MDE',
        destinationCode: 'BOG',
        depTime: '20:30:00',
        arrTime: '21:25:00',
        durationMinutes: 55,
        basePrice: 250000,
        status: FlightStatus.ON_TIME,
      },

      // 2. Bogotá <-> Cartagena (CTG)
      // Ida BOG -> CTG (5 horarios)
      {
        id: 'DV-100',
        flightNumber: 'DV-100',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cartagena (CTG)',
        originCode: 'BOG',
        destinationCode: 'CTG',
        depTime: '06:15:00',
        arrTime: '07:40:00',
        durationMinutes: 85,
        basePrice: 360000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-102',
        flightNumber: 'DV-102',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cartagena (CTG)',
        originCode: 'BOG',
        destinationCode: 'CTG',
        depTime: '09:30:00',
        arrTime: '10:55:00',
        durationMinutes: 85,
        basePrice: 350000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-104',
        flightNumber: 'DV-104',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cartagena (CTG)',
        originCode: 'BOG',
        destinationCode: 'CTG',
        depTime: '12:45:00',
        arrTime: '14:10:00',
        durationMinutes: 85,
        basePrice: 340000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-106',
        flightNumber: 'DV-106',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cartagena (CTG)',
        originCode: 'BOG',
        destinationCode: 'CTG',
        depTime: '16:00:00',
        arrTime: '17:25:00',
        durationMinutes: 85,
        basePrice: 330000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-108',
        flightNumber: 'DV-108',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cartagena (CTG)',
        originCode: 'BOG',
        destinationCode: 'CTG',
        depTime: '19:15:00',
        arrTime: '20:40:00',
        durationMinutes: 85,
        basePrice: 370000,
        status: FlightStatus.ON_TIME,
      },
      // Regreso CTG -> BOG (5 horarios)
      {
        id: 'DV-101',
        flightNumber: 'DV-101',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Cartagena (CTG)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CTG',
        destinationCode: 'BOG',
        depTime: '08:30:00',
        arrTime: '09:55:00',
        durationMinutes: 85,
        basePrice: 365000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-103',
        flightNumber: 'DV-103',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Cartagena (CTG)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CTG',
        destinationCode: 'BOG',
        depTime: '11:30:00',
        arrTime: '12:55:00',
        durationMinutes: 85,
        basePrice: 360000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-105',
        flightNumber: 'DV-105',
        airline: 'Boeing 737-800',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Cartagena (CTG)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CTG',
        destinationCode: 'BOG',
        depTime: '14:45:00',
        arrTime: '16:10:00',
        durationMinutes: 85,
        basePrice: 345000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-107',
        flightNumber: 'DV-107',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Cartagena (CTG)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CTG',
        destinationCode: 'BOG',
        depTime: '18:00:00',
        arrTime: '19:25:00',
        durationMinutes: 85,
        basePrice: 355000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-109',
        flightNumber: 'DV-109',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Cartagena (CTG)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CTG',
        destinationCode: 'BOG',
        depTime: '21:15:00',
        arrTime: '22:40:00',
        durationMinutes: 85,
        basePrice: 375000,
        status: FlightStatus.ON_TIME,
      },

      // 3. Bogotá <-> Cali (CLO)
      // Ida BOG -> CLO (5 horarios)
      {
        id: 'DV-500',
        flightNumber: 'DV-500',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cali (CLO)',
        originCode: 'BOG',
        destinationCode: 'CLO',
        depTime: '06:30:00',
        arrTime: '07:30:00',
        durationMinutes: 60,
        basePrice: 230000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-502',
        flightNumber: 'DV-502',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cali (CLO)',
        originCode: 'BOG',
        destinationCode: 'CLO',
        depTime: '09:45:00',
        arrTime: '10:45:00',
        durationMinutes: 60,
        basePrice: 220000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-504',
        flightNumber: 'DV-504',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cali (CLO)',
        originCode: 'BOG',
        destinationCode: 'CLO',
        depTime: '13:00:00',
        arrTime: '14:00:00',
        durationMinutes: 60,
        basePrice: 240000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-506',
        flightNumber: 'DV-506',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cali (CLO)',
        originCode: 'BOG',
        destinationCode: 'CLO',
        depTime: '16:15:00',
        arrTime: '17:15:00',
        durationMinutes: 60,
        basePrice: 220000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-508',
        flightNumber: 'DV-508',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Cali (CLO)',
        originCode: 'BOG',
        destinationCode: 'CLO',
        depTime: '19:30:00',
        arrTime: '20:30:00',
        durationMinutes: 60,
        basePrice: 250000,
        status: FlightStatus.ON_TIME,
      },
      // Regreso CLO -> BOG (5 horarios)
      {
        id: 'DV-501',
        flightNumber: 'DV-501',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Cali (CLO)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CLO',
        destinationCode: 'BOG',
        depTime: '08:15:00',
        arrTime: '09:15:00',
        durationMinutes: 60,
        basePrice: 235000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-503',
        flightNumber: 'DV-503',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Cali (CLO)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CLO',
        destinationCode: 'BOG',
        depTime: '11:30:00',
        arrTime: '12:30:00',
        durationMinutes: 60,
        basePrice: 225000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-505',
        flightNumber: 'DV-505',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Cali (CLO)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CLO',
        destinationCode: 'BOG',
        depTime: '14:45:00',
        arrTime: '15:45:00',
        durationMinutes: 60,
        basePrice: 245000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-507',
        flightNumber: 'DV-507',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Cali (CLO)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CLO',
        destinationCode: 'BOG',
        depTime: '18:00:00',
        arrTime: '19:00:00',
        durationMinutes: 60,
        basePrice: 230000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-509',
        flightNumber: 'DV-509',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Cali (CLO)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'CLO',
        destinationCode: 'BOG',
        depTime: '21:15:00',
        arrTime: '22:15:00',
        durationMinutes: 60,
        basePrice: 255000,
        status: FlightStatus.ON_TIME,
      },

      // 4. Bogotá <-> Santa Marta (SMR)
      // Ida BOG -> SMR (5 horarios)
      {
        id: 'DV-400',
        flightNumber: 'DV-400',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Santa Marta (SMR)',
        originCode: 'BOG',
        destinationCode: 'SMR',
        depTime: '06:15:00',
        arrTime: '07:45:00',
        durationMinutes: 90,
        basePrice: 320000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-402',
        flightNumber: 'DV-402',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Santa Marta (SMR)',
        originCode: 'BOG',
        destinationCode: 'SMR',
        depTime: '09:30:00',
        arrTime: '11:00:00',
        durationMinutes: 90,
        basePrice: 300000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-404',
        flightNumber: 'DV-404',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Santa Marta (SMR)',
        originCode: 'BOG',
        destinationCode: 'SMR',
        depTime: '13:00:00',
        arrTime: '14:30:00',
        durationMinutes: 90,
        basePrice: 340000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-406',
        flightNumber: 'DV-406',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Santa Marta (SMR)',
        originCode: 'BOG',
        destinationCode: 'SMR',
        depTime: '16:30:00',
        arrTime: '18:00:00',
        durationMinutes: 90,
        basePrice: 310000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-408',
        flightNumber: 'DV-408',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Santa Marta (SMR)',
        originCode: 'BOG',
        destinationCode: 'SMR',
        depTime: '19:45:00',
        arrTime: '21:15:00',
        durationMinutes: 90,
        basePrice: 350000,
        status: FlightStatus.ON_TIME,
      },
      // Regreso SMR -> BOG (5 horarios)
      {
        id: 'DV-401',
        flightNumber: 'DV-401',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Santa Marta (SMR)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'SMR',
        destinationCode: 'BOG',
        depTime: '08:30:00',
        arrTime: '10:00:00',
        durationMinutes: 90,
        basePrice: 325000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-403',
        flightNumber: 'DV-403',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Santa Marta (SMR)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'SMR',
        destinationCode: 'BOG',
        depTime: '11:45:00',
        arrTime: '13:15:00',
        durationMinutes: 90,
        basePrice: 315000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-405',
        flightNumber: 'DV-405',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Santa Marta (SMR)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'SMR',
        destinationCode: 'BOG',
        depTime: '15:15:00',
        arrTime: '16:45:00',
        durationMinutes: 90,
        basePrice: 345000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-407',
        flightNumber: 'DV-407',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Santa Marta (SMR)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'SMR',
        destinationCode: 'BOG',
        depTime: '18:45:00',
        arrTime: '20:15:00',
        durationMinutes: 90,
        basePrice: 320000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-409',
        flightNumber: 'DV-409',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Santa Marta (SMR)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'SMR',
        destinationCode: 'BOG',
        depTime: '22:00:00',
        arrTime: '23:30:00',
        durationMinutes: 90,
        basePrice: 355000,
        status: FlightStatus.ON_TIME,
      },

      // 5. Bogotá <-> Barranquilla (BAQ)
      // Ida BOG -> BAQ (5 horarios)
      {
        id: 'DV-600',
        flightNumber: 'DV-600',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Barranquilla (BAQ)',
        originCode: 'BOG',
        destinationCode: 'BAQ',
        depTime: '06:20:00',
        arrTime: '07:45:00',
        durationMinutes: 85,
        basePrice: 275000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-602',
        flightNumber: 'DV-602',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Barranquilla (BAQ)',
        originCode: 'BOG',
        destinationCode: 'BAQ',
        depTime: '09:40:00',
        arrTime: '11:05:00',
        durationMinutes: 85,
        basePrice: 290000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-604',
        flightNumber: 'DV-604',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Barranquilla (BAQ)',
        originCode: 'BOG',
        destinationCode: 'BAQ',
        depTime: '13:10:00',
        arrTime: '14:35:00',
        durationMinutes: 85,
        basePrice: 270000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-606',
        flightNumber: 'DV-606',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Barranquilla (BAQ)',
        originCode: 'BOG',
        destinationCode: 'BAQ',
        depTime: '16:30:00',
        arrTime: '17:55:00',
        durationMinutes: 85,
        basePrice: 285000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-608',
        flightNumber: 'DV-608',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Barranquilla (BAQ)',
        originCode: 'BOG',
        destinationCode: 'BAQ',
        depTime: '19:50:00',
        arrTime: '21:15:00',
        durationMinutes: 85,
        basePrice: 310000,
        status: FlightStatus.ON_TIME,
      },
      // Regreso BAQ -> BOG (5 horarios)
      {
        id: 'DV-601',
        flightNumber: 'DV-601',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Barranquilla (BAQ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'BAQ',
        destinationCode: 'BOG',
        depTime: '08:30:00',
        arrTime: '09:55:00',
        durationMinutes: 85,
        basePrice: 280000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-603',
        flightNumber: 'DV-603',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Barranquilla (BAQ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'BAQ',
        destinationCode: 'BOG',
        depTime: '11:50:00',
        arrTime: '13:15:00',
        durationMinutes: 85,
        basePrice: 295000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-605',
        flightNumber: 'DV-605',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Barranquilla (BAQ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'BAQ',
        destinationCode: 'BOG',
        depTime: '15:20:00',
        arrTime: '16:45:00',
        durationMinutes: 85,
        basePrice: 275000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-607',
        flightNumber: 'DV-607',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320',
        originCity: 'Barranquilla (BAQ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'BAQ',
        destinationCode: 'BOG',
        depTime: '18:40:00',
        arrTime: '20:05:00',
        durationMinutes: 85,
        basePrice: 290000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-609',
        flightNumber: 'DV-609',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Barranquilla (BAQ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'BAQ',
        destinationCode: 'BOG',
        depTime: '22:00:00',
        arrTime: '23:25:00',
        durationMinutes: 85,
        basePrice: 315000,
        status: FlightStatus.ON_TIME,
      },

      // 6. Bogotá <-> San Andrés (ADZ)
      // Ida BOG -> ADZ (5 horarios)
      {
        id: 'DV-700',
        flightNumber: 'DV-700',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'San Andrés (ADZ)',
        originCode: 'BOG',
        destinationCode: 'ADZ',
        depTime: '06:10:00',
        arrTime: '08:25:00',
        durationMinutes: 135,
        basePrice: 420000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-702',
        flightNumber: 'DV-702',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'San Andrés (ADZ)',
        originCode: 'BOG',
        destinationCode: 'ADZ',
        depTime: '09:30:00',
        arrTime: '11:45:00',
        durationMinutes: 135,
        basePrice: 450000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-704',
        flightNumber: 'DV-704',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'San Andrés (ADZ)',
        originCode: 'BOG',
        destinationCode: 'ADZ',
        depTime: '12:50:00',
        arrTime: '15:05:00',
        durationMinutes: 135,
        basePrice: 410000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-706',
        flightNumber: 'DV-706',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'San Andrés (ADZ)',
        originCode: 'BOG',
        destinationCode: 'ADZ',
        depTime: '16:10:00',
        arrTime: '18:25:00',
        durationMinutes: 135,
        basePrice: 440000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-708',
        flightNumber: 'DV-708',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'San Andrés (ADZ)',
        originCode: 'BOG',
        destinationCode: 'ADZ',
        depTime: '19:20:00',
        arrTime: '21:35:00',
        durationMinutes: 135,
        basePrice: 470000,
        status: FlightStatus.ON_TIME,
      },
      // Regreso ADZ -> BOG (5 horarios)
      {
        id: 'DV-701',
        flightNumber: 'DV-701',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'San Andrés (ADZ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'ADZ',
        destinationCode: 'BOG',
        depTime: '09:15:00',
        arrTime: '11:30:00',
        durationMinutes: 135,
        basePrice: 430000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-703',
        flightNumber: 'DV-703',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'San Andrés (ADZ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'ADZ',
        destinationCode: 'BOG',
        depTime: '12:35:00',
        arrTime: '14:50:00',
        durationMinutes: 135,
        basePrice: 460000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-705',
        flightNumber: 'DV-705',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'San Andrés (ADZ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'ADZ',
        destinationCode: 'BOG',
        depTime: '15:55:00',
        arrTime: '18:10:00',
        durationMinutes: 135,
        basePrice: 420000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-707',
        flightNumber: 'DV-707',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'San Andrés (ADZ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'ADZ',
        destinationCode: 'BOG',
        depTime: '19:15:00',
        arrTime: '21:30:00',
        durationMinutes: 135,
        basePrice: 450000,
        status: FlightStatus.ON_TIME,
      },
      {
        id: 'DV-709',
        flightNumber: 'DV-709',
        airline: 'Davivienda Air',
        aircraftModel: 'Boeing 737-800',
        originCity: 'San Andrés (ADZ)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'ADZ',
        destinationCode: 'BOG',
        depTime: '22:25:00',
        arrTime: '00:40:00',
        durationMinutes: 135,
        basePrice: 480000,
        status: FlightStatus.ON_TIME,
      },
    ];

    const todayObj = new Date();
    let totalSeededFlights = 0;

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const d = new Date(todayObj);
      d.setDate(todayObj.getDate() + dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      for (const def of flightsDef) {
        const flightId = dayOffset === 0 ? def.id : `${def.id}-${dateStr}`;

        let arrDateStr = dateStr;
        if (def.arrTime < def.depTime) {
          const nextDay = new Date(d);
          nextDay.setDate(d.getDate() + 1);
          arrDateStr = nextDay.toISOString().split('T')[0];
        }

        const departureTime = `${dateStr}T${def.depTime}Z`;
        const arrivalTime = `${arrDateStr}T${def.arrTime}Z`;

        const existingFlight = await this.flightRepo.findOne({ where: { id: flightId } });
        if (existingFlight) {
          existingFlight.departureTime = departureTime;
          existingFlight.arrivalTime = arrivalTime;
          existingFlight.basePrice = def.basePrice;
          await this.flightRepo.save(existingFlight);
          totalSeededFlights++;
          continue;
        }

        const flight = this.flightRepo.create({
          id: flightId,
          flightNumber: def.flightNumber,
          airline: def.airline,
          aircraftModel: def.aircraftModel,
          originCity: def.originCity,
          destinationCity: def.destinationCity,
          originCode: def.originCode,
          destinationCode: def.destinationCode,
          departureTime,
          arrivalTime,
          durationMinutes: def.durationMinutes,
          basePrice: def.basePrice,
          currency: 'COP',
          status: def.status,
          cabinLayout,
          totalSeats: 180,
        });

        await this.flightRepo.save(flight);
        totalSeededFlights++;

        // Generar los 180 asientos de la cabina
        const seats: SeatEntity[] = [];
        const { rows, columns, exitRows, businessRows } = cabinLayout;

        for (let r = 1; r <= rows; r++) {
          const isExit = exitRows.includes(r);
          const isBusiness = businessRows.includes(r);

          let seatClass = SeatClass.ECONOMY;
          let price = def.basePrice;

          if (isBusiness) {
            seatClass = SeatClass.BUSINESS;
            price = Math.round(def.basePrice * 1.6);
          } else if (isExit) {
            seatClass = SeatClass.PREMIUM_ECONOMY;
            price = def.basePrice + 40000;
          }

          for (const col of columns) {
            const rowStr = r < 10 ? `0${r}` : `${r}`;
            const seatNumber = `${rowStr}${col}`;
            const seatId = `${flightId}-${seatNumber}`;

            const isInitialBooked =
              (flightId === 'DV-204' && ['01A', '01B', '11C', '11D'].includes(seatNumber)) ||
              (dayOffset > 0 && ['03B', '12C'].includes(seatNumber) && def.flightNumber.endsWith('4'));

            const seat = this.seatRepo.create({
              id: seatId,
              flightId,
              seatNumber,
              rowNumber: r,
              columnLetter: col,
              seatClass,
              price,
              isExitRow: isExit,
              status: isInitialBooked ? SeatStatus.BOOKED : SeatStatus.AVAILABLE,
            });

            seats.push(seat);
          }
        }

        await this.seatRepo.insert(seats);
      }
    }

    // Sembrar una reserva histórica de ejemplo para DV-204 asiento 11C si no existe
    const existingBookings = await this.bookingRepo.count();
    if (existingBookings === 0) {
      const initialBooking = this.bookingRepo.create({
        bookingReference: 'DV-79K2B',
        flightId: 'DV-204',
        seatId: 'DV-204-11C',
        seatNumber: '11C',
        userId: 'carlos_mendoza',
        totalPrice: 320000,
        currency: 'COP',
        status: 'CONFIRMED',
      });
      const savedBooking = await this.bookingRepo.save(initialBooking);

      const passenger = this.passengerRepo.create({
        booking: savedBooking,
        firstName: 'Carlos',
        lastName: 'Mendoza',
        documentType: 'CC',
        documentNumber: '1020482910',
        email: 'carlos.mendoza@email.com',
        phone: '3108924411',
      });
      await this.passengerRepo.save(passenger);

      const payment = this.paymentRepo.create({
        booking: savedBooking,
        method: 'DAVIPLATA',
        transactionId: 'TX-DAV-88912',
        lastFourDigits: '4411',
        amount: 320000,
        status: 'APPROVED',
      });
      await this.paymentRepo.save(payment);
    }

    this.logger.log(`✓ Semilla completada: ${totalSeededFlights} vuelos sembrados para los próximos 7 días, ${totalSeededFlights * 180} asientos y reservas iniciales cargadas.`);
  }
}
