import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('DaviviendaFlightSystem');
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir conexión del cliente Angular (puerto 4200) y sockets
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validación estricta global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Configuración de Documentación Interactiva Swagger / OpenAPI
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const {
    FlightDto,
    SeatDto,
    FlightMetricsDto,
    CreateBookingRequestDto,
    BookingResponseDto: SwaggerBookingResponseDto,
    PassengerDto,
    PaymentDto,
    UpdateFlightStatusDto,
    ErrorResponseDto,
    CityDto,
    CountryDto,
    AirportDto,
    CreateCityInputDto,
    CreateAirportInputDto,
  } = await import('./common/dto/swagger-models.dto');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Davivienda Air — API REST')
    .setDescription(
      'API REST para la búsqueda y consulta de vuelos, mapa de asientos de cabina Airbus A320, confirmación de reservas y métricas de ocupación.',
    )
    .setVersion('1.0.0')
    .addTag('Vuelos', 'Búsqueda, consulta y administración de vuelos')
    .addTag('Asientos', 'Matriz de asientos y disponibilidad de cabina')
    .addTag('Reservas', 'Creación y consulta de reservas de vuelos')
    .addTag('Métricas', 'Métricas de ocupación y telemetría de cabina')
    .addTag('Ubicaciones', 'Catálogo geográfico de países, ciudades y aeropuertos')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [
      FlightDto,
      SeatDto,
      FlightMetricsDto,
      CreateBookingRequestDto,
      SwaggerBookingResponseDto,
      PassengerDto,
      PaymentDto,
      UpdateFlightStatusDto,
      ErrorResponseDto,
      CityDto,
      CountryDto,
      AirportDto,
      CreateCityInputDto,
      CreateAirportInputDto,
    ],
  });

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Davivienda Air — API REST',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`===================================================================`);
  logger.log(`🚀 Davivienda Air - Sistema de Reservas de Vuelos en Tiempo Real`);
  logger.log(`🌐 Servidor HTTP REST: http://localhost:${port}`);
  logger.log(`📚 Documentación Swagger UI: http://localhost:${port}/api/docs`);
  logger.log(`⚡ WebSocket Gateway (Socket.io) activo en el mismo puerto`);
  logger.log(`🔒 Motor de Concurrencia y Lock Atómico listo`);
  logger.log(`===================================================================`);
}

bootstrap();
