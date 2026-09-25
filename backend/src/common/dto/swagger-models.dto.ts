import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlightStatus, SeatClass, SeatStatus } from '@davivienda/shared';

// ============================================================================
// DTOs de Vuelos (HU1)
// ============================================================================

export class FlightDto {
  @ApiProperty({ example: 'DV-204', description: 'Identificador único del vuelo' })
  id!: string;

  @ApiProperty({ example: 'DV-204', description: 'Número de vuelo comercial' })
  flightNumber!: string;

  @ApiProperty({ example: 'Davivienda Air', description: 'Aerolínea operadora' })
  airline!: string;

  @ApiProperty({ example: 'Airbus A320neo', description: 'Modelo y configuración de la aeronave (180 asientos)' })
  aircraftModel!: string;

  @ApiProperty({ example: 'Bogotá (BOG)', description: 'Ciudad y terminal aérea de origen' })
  originCity!: string;

  @ApiProperty({ example: 'Medellín (MDE)', description: 'Ciudad y terminal aérea de destino' })
  destinationCity!: string;

  @ApiProperty({ example: 'BOG', description: 'Código IATA de origen' })
  originCode!: string;

  @ApiProperty({ example: 'MDE', description: 'Código IATA de destino' })
  destinationCode!: string;

  @ApiProperty({ example: '2026-09-25T08:30:00.000Z', description: 'Fecha y hora estimada de salida (ISO 8601)' })
  departureTime!: string;

  @ApiProperty({ example: '2026-09-25T09:25:00.000Z', description: 'Fecha y hora estimada de llegada (ISO 8601)' })
  arrivalTime!: string;

  @ApiProperty({
    enum: ['ON_TIME', 'DELAYED', 'CANCELLED'],
    example: 'ON_TIME',
    description: 'Estado operativo del vuelo en tiempo real',
  })
  status!: FlightStatus;

  @ApiProperty({ example: 285000, description: 'Tarifa base de pasaje estándar' })
  basePrice!: number;

  @ApiProperty({ example: 'COP', description: 'Moneda de la transacción' })
  currency!: string;

  @ApiProperty({ example: 142, description: 'Total de asientos actualmente disponibles para reserva' })
  availableSeatsCount!: number;

  @ApiProperty({ example: 180, description: 'Capacidad total de asientos de la cabina' })
  totalSeatsCount!: number;
}

export class UpdateFlightStatusDto {
  @ApiProperty({
    enum: ['ON_TIME', 'DELAYED', 'CANCELLED'],
    example: 'DELAYED',
    description: 'Nuevo estado operativo del vuelo a propagar vía WebSockets',
  })
  status!: FlightStatus;
}

// ============================================================================
// DTOs de Cabina y Asientos (HU2)
// ============================================================================

export class SeatDto {
  @ApiProperty({ example: 'DV-204-12B', description: 'Identificador único del asiento' })
  id!: string;

  @ApiProperty({ example: 'DV-204', description: 'Identificador del vuelo al que pertenece' })
  flightId!: string;

  @ApiProperty({ example: '12B', description: 'Código alfanumérico del asiento (Fila + Columna)' })
  seatNumber!: string;

  @ApiProperty({ example: 12, description: 'Número de fila (1 a 30 en Airbus A320)' })
  row!: number;

  @ApiProperty({ example: 'B', description: 'Columna del asiento (A, B, C | D, E, F)' })
  column!: string;

  @ApiProperty({
    enum: ['BUSINESS', 'ECONOMY', 'PREMIUM_ECONOMY'],
    example: 'ECONOMY',
    description: 'Clase de cabina (Filas 1-2 Business/Ejecutiva, Filas 3-30 Economy/Turista)',
  })
  seatClass!: SeatClass;

  @ApiProperty({
    enum: ['AVAILABLE', 'LOCKED', 'BOOKED'],
    example: 'AVAILABLE',
    description: 'Estado del asiento: Disponible, Bloqueado temporalmente (Redis), o Vendido (PostgreSQL)',
  })
  status!: SeatStatus;

  @ApiProperty({ example: 285000, description: 'Precio del asiento en pesos colombianos' })
  price!: number;

  @ApiProperty({ example: 'COP', description: 'Moneda' })
  currency!: string;

  @ApiPropertyOptional({ example: 'carlos_mendoza', description: 'Usuario que mantiene el bloqueo temporal atómico' })
  lockedBy?: string;

  @ApiPropertyOptional({ example: '2026-09-25T00:50:00.000Z', description: 'Timestamp de expiración del TTL (300s)' })
  lockedUntil?: string;
}

// ============================================================================
// DTOs de Reservas y Pagos (HU3)
// ============================================================================

export class PassengerDto {
  @ApiProperty({ example: 'Carlos', description: 'Nombre(s) del pasajero' })
  firstName!: string;

  @ApiProperty({ example: 'Mendoza', description: 'Apellido(s) del pasajero' })
  lastName!: string;

  @ApiProperty({
    enum: ['CC', 'CE', 'PASSPORT'],
    example: 'CC',
    description: 'Tipo de documento de identidad',
  })
  documentType!: 'CC' | 'CE' | 'PASSPORT';

  @ApiProperty({ example: '1020304050', description: 'Número de documento de identidad' })
  documentNumber!: string;

  @ApiProperty({ example: 'carlos.mendoza@davivienda.com', description: 'Correo electrónico para envío del tiquete PNR' })
  email!: string;

  @ApiProperty({ example: '+57 310 123 4567', description: 'Teléfono celular del pasajero' })
  phone!: string;
}

export class PaymentDto {
  @ApiProperty({
    enum: ['CARD', 'DAVIPLATA', 'PSE'],
    example: 'DAVIPLATA',
    description: 'Método de pago seleccionado (Soporte prioritario DaviPlata)',
  })
  method!: 'CARD' | 'DAVIPLATA' | 'PSE';

  @ApiPropertyOptional({ example: '4500123456789012', description: 'Número de tarjeta (requerido si method=CARD)' })
  cardNumber?: string;

  @ApiPropertyOptional({ example: 'Carlos Mendoza', description: 'Titular de la tarjeta' })
  cardHolder?: string;

  @ApiPropertyOptional({ example: '12/28', description: 'Fecha de expiración MM/YY' })
  expiryDate?: string;

  @ApiPropertyOptional({ example: '123', description: 'Código de seguridad CVV' })
  cvv?: string;
}

export class CreateBookingRequestDto {
  @ApiProperty({ example: 'DV-204', description: 'Identificador del vuelo reservado' })
  flightId!: string;

  @ApiProperty({ example: '12B', description: 'Identificador o código del asiento bloqueado previamente' })
  seatId!: string;

  @ApiProperty({ example: 'carlos_mendoza', description: 'Identificador del usuario que mantiene el lock en Redis' })
  userId!: string;

  @ApiProperty({ type: () => PassengerDto, description: 'Datos personales y de contacto del pasajero' })
  passenger!: PassengerDto;

  @ApiProperty({ type: () => PaymentDto, description: 'Datos del medio de pago' })
  payment!: PaymentDto;
}

export class BookingResponseDto {
  @ApiProperty({ example: 'b8f6c4a1-3e2d-4f5a-9b1c-7e8d9a0b1c2d', description: 'UUID de la reserva en base de datos' })
  bookingId!: string;

  @ApiProperty({ example: 'DV-8X9K2', description: 'Código PNR alfanumérico único de 6 caracteres (Passenger Name Record)' })
  bookingReference!: string;

  @ApiProperty({ example: 'DV-204', description: 'Número del vuelo confirmado' })
  flightNumber!: string;

  @ApiProperty({ example: '12B', description: 'Asiento asignado y confirmado' })
  seatNumber!: string;

  @ApiProperty({ example: 'Bogotá (BOG)', description: 'Ciudad de origen' })
  origin!: string;

  @ApiProperty({ example: 'Medellín (MDE)', description: 'Ciudad de destino' })
  destination!: string;

  @ApiProperty({ example: '2026-09-25T08:30:00.000Z', description: 'Hora de embarque y salida' })
  departureTime!: string;

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre completo del pasajero' })
  passengerName!: string;

  @ApiProperty({ example: 285000, description: 'Valor total pagado' })
  totalPaid!: number;

  @ApiProperty({ example: 'COP', description: 'Moneda' })
  currency!: string;

  @ApiProperty({ example: '2026-09-25T00:48:30.000Z', description: 'Timestamp de confirmación ACID en PostgreSQL' })
  confirmedAt!: string;
}

// ============================================================================
// DTOs de Métricas y Telemetría (HU4)
// ============================================================================

export class CabinClassBreakdownDto {
  @ApiProperty({ example: 12, description: 'Total de asientos en esta clase' })
  total!: number;

  @ApiProperty({ example: 8, description: 'Asientos disponibles' })
  available!: number;

  @ApiProperty({ example: 4, description: 'Asientos ocupados o bloqueados' })
  occupied!: number;
}

export class FlightMetricsDto {
  @ApiProperty({ example: 'DV-204', description: 'Identificador del vuelo' })
  flightId!: string;

  @ApiProperty({ example: 180, description: 'Total de asientos configurados en cabina' })
  totalSeats!: number;

  @ApiProperty({ example: 142, description: 'Total de asientos libres para compra' })
  availableSeats!: number;

  @ApiProperty({ example: 8, description: 'Total de asientos temporalmente bloqueados en Redis' })
  lockedSeats!: number;

  @ApiProperty({ example: 30, description: 'Total de asientos confirmados y pagados en PostgreSQL' })
  occupiedSeats!: number;

  @ApiProperty({ example: 16.67, description: 'Porcentaje de ocupación actual (Ocupados / Total * 100)' })
  occupancyRate!: number;

  @ApiProperty({ type: () => CabinClassBreakdownDto, description: 'Métricas de Clase Ejecutiva (Filas 1-2)' })
  executiveSeats!: CabinClassBreakdownDto;

  @ApiProperty({ type: () => CabinClassBreakdownDto, description: 'Métricas de Clase Turista (Filas 3-30)' })
  touristSeats!: CabinClassBreakdownDto;

  @ApiProperty({ example: '2026-09-25T00:48:30.000Z', description: 'Última actualización de la telemetría en tiempo real' })
  lastUpdated!: string;
}

// ============================================================================
// DTOs de Error y Excepciones
// ============================================================================

export class ErrorResponseDto {
  @ApiProperty({ example: 409, description: 'Código de estado HTTP (ej: 409 Conflict, 400 Bad Request, 404 Not Found)' })
  statusCode!: number;

  @ApiProperty({
    example: 'El asiento 12B no se encuentra bloqueado por este usuario o ya fue reservado.',
    description: 'Mensaje descriptivo del motivo del error de negocio',
  })
  message!: string;

  @ApiProperty({ example: 'Conflict', description: 'Nombre canónico del error HTTP' })
  error!: string;

  @ApiProperty({ example: '2026-09-25T00:48:30.000Z', description: 'Marca de tiempo en que ocurrió el error' })
  timestamp?: string;
}
