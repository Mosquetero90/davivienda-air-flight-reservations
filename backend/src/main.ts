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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`===================================================================`);
  logger.log(`🚀 Davivienda Air - Sistema de Reservas de Vuelos en Tiempo Real`);
  logger.log(`🌐 Servidor HTTP REST escuchando en: http://localhost:${port}`);
  logger.log(`⚡ WebSocket Gateway (Socket.io) activo en el mismo puerto`);
  logger.log(`🔒 Motor de Concurrencia y Lock Atómico listo`);
  logger.log(`===================================================================`);
}

bootstrap();
