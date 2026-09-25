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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('✈️ Davivienda Air — API REST de Reservas de Vuelos')
    .setDescription(
      'Documentación interactiva OpenAPI/Swagger para el Sistema de Reservas en Tiempo Real con Concurrencia Atómica (Redis) y Persistencia ACID (PostgreSQL). Cumple con los requerimientos de la prueba técnica para Especialista Desarrollador Líder Técnico — Banco Davivienda.',
    )
    .setVersion('1.0.0')
    .addTag('Vuelos (HU1)', 'Consulta, búsqueda con filtros, disponibilidad y estados operativos en vivo')
    .addTag('Cabina y Asientos (HU2)', 'Matriz de 180 asientos del Airbus A320 y bloqueos temporales concurrentes')
    .addTag('Reservas y Pagos (HU3)', 'Emisión de PNR, pasabordo digital y transacciones ACID con DaviPlata')
    .addTag('Métricas y Telemetría (HU4)', 'Monitoreo de ocupación de cabina y KPIs en tiempo real')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Davivienda Air — Swagger API Docs',
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
