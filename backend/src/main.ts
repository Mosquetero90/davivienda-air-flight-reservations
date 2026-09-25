import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('DaviviendaFlightSystem');
  const app = await NestFactory.create(AppModule);

  // Permitir detección correcta de IP del cliente tras proxies reversos (Docker, Nginx) para Throttler
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  // 1. Cabeceras de Seguridad HTTP con Helmet (X-Frame-Options, X-Content-Type-Options, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI requiere inline assets; el reverse-proxy Nginx aplica CSP al frontend
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Configuración controlada de CORS con lista blanca
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS bloqueado para origen no autorizado: ${origin}`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Validación estricta global de DTOs (mitiga Parameter Tampering y Mass Assignment)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
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
