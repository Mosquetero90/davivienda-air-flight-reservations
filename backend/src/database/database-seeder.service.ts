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

    const flightsData = [
      {
        id: 'DV-204',
        flightNumber: 'DV-204',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Bogotá (BOG)',
        destinationCity: 'Medellín (MDE)',
        originCode: 'BOG',
        destinationCode: 'MDE',
        departureTime: `${today}T06:30:00Z`,
        arrivalTime: `${today}T07:25:00Z`,
        durationMinutes: 55,
        basePrice: 280000,
        currency: 'COP',
        status: FlightStatus.ON_TIME,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
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
        departureTime: `${today}T08:45:00Z`,
        arrivalTime: `${today}T09:37:00Z`,
        durationMinutes: 52,
        basePrice: 245000,
        currency: 'COP',
        status: FlightStatus.DELAYED,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
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
        departureTime: `${today}T11:15:00Z`,
        arrivalTime: `${today}T12:40:00Z`,
        durationMinutes: 85,
        basePrice: 350000,
        currency: 'COP',
        status: FlightStatus.ON_TIME,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
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
        departureTime: `${today}T14:00:00Z`,
        arrivalTime: `${today}T15:00:00Z`,
        durationMinutes: 60,
        basePrice: 220000,
        currency: 'COP',
        status: FlightStatus.ON_TIME,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
      },
      // --- VUELOS DE RETORNO (Ida y Vuelta) ---
      {
        id: 'DV-205',
        flightNumber: 'DV-205',
        airline: 'Davivienda Air',
        aircraftModel: 'Airbus A320neo',
        originCity: 'Medellín (MDE)',
        destinationCity: 'Bogotá (BOG)',
        originCode: 'MDE',
        destinationCode: 'BOG',
        departureTime: `${today}T17:30:00Z`,
        arrivalTime: `${today}T18:25:00Z`,
        durationMinutes: 55,
        basePrice: 290000,
        currency: 'COP',
        status: FlightStatus.ON_TIME,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
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
        departureTime: `${today}T19:45:00Z`,
        arrivalTime: `${today}T20:37:00Z`,
        durationMinutes: 52,
        basePrice: 250000,
        currency: 'COP',
        status: FlightStatus.ON_TIME,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
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
        departureTime: `${today}T18:15:00Z`,
        arrivalTime: `${today}T19:40:00Z`,
        durationMinutes: 85,
        basePrice: 360000,
        currency: 'COP',
        status: FlightStatus.ON_TIME,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
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
        departureTime: `${today}T20:00:00Z`,
        arrivalTime: `${today}T21:00:00Z`,
        durationMinutes: 60,
        basePrice: 230000,
        currency: 'COP',
        status: FlightStatus.ON_TIME,
        cabinLayout: {
          rows: 30,
          columns: ['A', 'B', 'C', 'D', 'E', 'F'],
          aisleAfterColumn: ['C'],
          exitRows: [11, 12],
          businessRows: [1, 2, 3],
        },
        totalSeats: 180,
      },
    ];

    for (const fData of flightsData) {
      const existingFlight = await this.flightRepo.findOne({ where: { id: fData.id } });
      if (existingFlight) {
        continue;
      }

      const flight = this.flightRepo.create(fData);
      await this.flightRepo.save(flight);

      // Generar los 180 asientos de la cabina
      const seats: SeatEntity[] = [];
      const { rows, columns, exitRows, businessRows } = fData.cabinLayout;

      for (let r = 1; r <= rows; r++) {
        const isExit = exitRows.includes(r);
        const isBusiness = businessRows.includes(r);

        let seatClass = SeatClass.ECONOMY;
        let price = fData.basePrice;

        if (isBusiness) {
          seatClass = SeatClass.BUSINESS;
          price = Math.round(fData.basePrice * 1.6);
        } else if (isExit) {
          seatClass = SeatClass.PREMIUM_ECONOMY;
          price = fData.basePrice + 40000;
        }

        for (const col of columns) {
          const rowStr = r < 10 ? `0${r}` : `${r}`;
          const seatNumber = `${rowStr}${col}`;
          const seatId = `${fData.id}-${seatNumber}`;

          // Para DV-204, sembramos 4 asientos previamente comprados para realismo
          const isInitialBooked =
            fData.id === 'DV-204' &&
            ['01A', '01B', '11C', '11D'].includes(seatNumber);

          const seat = this.seatRepo.create({
            id: seatId,
            flightId: fData.id,
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

      await this.seatRepo.save(seats);
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

    this.logger.log(`✓ Semilla completada: ${flightsData.length} vuelos, ${flightsData.length * 180} asientos y reservas iniciales cargadas.`);
  }
}
