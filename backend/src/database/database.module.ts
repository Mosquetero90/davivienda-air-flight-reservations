import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  FlightEntity,
  SeatEntity,
  PassengerEntity,
  PaymentEntity,
  BookingEntity,
} from './entities';
import { DatabaseSeederService } from './database-seeder.service';

const logger = new Logger('DatabaseModule');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        const isPostgresConfigured =
          Boolean(process.env.POSTGRES_HOST) || Boolean(process.env.DATABASE_URL);

        if (isPostgresConfigured) {
          logger.log(
            `Conectando a PostgreSQL en ${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}...`,
          );
          return {
            type: 'postgres',
            host: process.env.POSTGRES_HOST || 'localhost',
            port: Number(process.env.POSTGRES_PORT) || 5432,
            username: process.env.POSTGRES_USER || 'davivienda',
            password: process.env.POSTGRES_PASSWORD || 'davivienda123',
            database: process.env.POSTGRES_DB || 'davivienda_flights',
            entities: [
              FlightEntity,
              SeatEntity,
              PassengerEntity,
              PaymentEntity,
              BookingEntity,
            ],
            synchronize: true, // Crea las tablas automáticamente en desarrollo/demo
            logging: false,
          };
        }

        // Resilient Fallback a SQLite para desarrollo ágil y tests
        logger.log('Iniciando base de datos SQLite persistente local para desarrollo...');
        return {
          type: 'better-sqlite3',
          database: 'davivienda_flights.sqlite',
          entities: [
            FlightEntity,
            SeatEntity,
            PassengerEntity,
            PaymentEntity,
            BookingEntity,
          ],
          synchronize: true,
          logging: false,
        };
      },
    }),
    TypeOrmModule.forFeature([
      FlightEntity,
      SeatEntity,
      PassengerEntity,
      PaymentEntity,
      BookingEntity,
    ]),
  ],
  providers: [DatabaseSeederService],
  exports: [TypeOrmModule, DatabaseSeederService],
})
export class DatabaseModule {}
