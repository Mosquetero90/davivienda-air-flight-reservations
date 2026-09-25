# Spec: Sistema de Reservas de Vuelos en Tiempo Real

> **Feature:** `flight-reservation`  
> **Rol:** Especialista Desarrollador Líder Técnico — Davivienda  
> **Metodología:** Spec-Driven Development (SDD) & EARS Notation  
> **Versión:** 1.0.0

---

## Problem Statement

Las plataformas de reserva de aerolíneas se enfrentan a un desafío crítico de concurrencia: múltiples usuarios compitiendo por los mismos asientos en vuelos de alta demanda. La falta de sincronización en tiempo real y el manejo inadecuado de condiciones de carrera provocan problemas graves de *double-booking* (sobreventa del mismo asiento a dos clientes), degradación de la confianza del usuario y sobrecarga operativa.

El sistema a construir resuelve este problema mediante un prototipo modular de alta reactividad que:
1. Permite búsqueda y filtrado dinámico de vuelos con propagación instantánea de cambios de estado operativo.
2. Proporciona un mapa de cabina interactivo con bloqueo temporal atómico de asientos y TTL gobernado de forma autónoma por el servidor (sin depender del cliente).
3. Garantiza la emisión de boletos con códigos PNR únicos tras la confirmación de pago simulado.
4. Expone un panel de control (Dashboard) administrativo con métricas agregadas en vivo (ocupación, bloqueos, ingresos estimados).

---

## Out of Scope

Para concentrar el esfuerzo en los atributos de calidad esenciales de la prueba (concurrencia, WebSockets y reactividad):
- Pasarela de pago bancaria real (se utiliza procesamiento simulado con tarjetas ficticias, Daviplata o PSE).
- Autenticación federada OAuth2/SAML bancaria completa (se emplean identificadores de sesión/usuario UUID en cliente).
- Persistencia en base de datos física PostgreSQL/Oracle (el estado operativo reside en un almacén en memoria en el servidor con interfaces desacopladas listas para Redis/SQL).
- Envío real de correos transaccionales SMTP o notificaciones SMS (el boleto digital y PNR se renderizan en pantalla).

---

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
| :--- | :--- | :--- |
| Duración del bloqueo temporal de asiento | 5 minutos (300 segundos) | Cumple con la ventana estándar de compra en aerolíneas y permite verificar fácilmente la expiración durante la prueba técnica. |
| Fuente de verdad del temporizador de bloqueo | Servidor backend autónomo (TTL) | Evita adulteraciones en el cliente y garantiza la liberación del asiento si el usuario cierra el navegador. |
| Protocolo de comunicación en tiempo real | WebSockets bidireccionales con Socket.io | Proporciona reconexión automática, soporte de salas por vuelo (Rooms) y detección inmediata de desconexión. |
| Framework frontend de UI | Angular 18+ (Standalone + Signals) | Requisito indispensable de la vacante Davivienda y óptimo para evitar re-renders en mapas de asientos interactivos. |
| Arquitectura del backend | NestJS con arquitectura modular limpia | Permite tipado estricto end-to-end con el paquete `shared/` y abstracciones nativas para WebSockets. |

**Open questions:** none

---

## Tech Stack

| Componente | Tecnología | Versión | Justificación |
| :--- | :--- | :--- | :--- |
| **Frontend** | Angular | `^19.0.0` o `^18.2.0` | Standalone components, Signals para reactividad de grano fino, OnPush Change Detection. |
| **Estilos UI** | Tailwind CSS | `^3.4.0` | Modelado flexible de cabina con CSS Grid, estados cromáticos interactivos y cero sobrecarga de CSS. |
| **Backend API** | NestJS | `^11.0.0` | Arquitectura modular empresarial, inyección de dependencias y validación con `class-validator`. |
| **Tiempo Real** | Socket.io (`@nestjs/platform-socket.io`) | `^4.8.0` | Protocolo WebSocket resiliente con multiplexación de salas (`flight:room`) y latencia < 50ms. |
| **Contratos** | TypeScript Monorepo (`shared/`) | `^5.4.5` | DTOs, Enums y eventos unificados compartidos en tiempo de compilación. |
| **Testing** | Jest / Jasmine / Vitest | `^29.0.0` | Pruebas unitarias y de integración para concurrencia y bloqueo de asientos. |

---

## Commands

```bash
# Instalación de dependencias de todo el monorepo
npm install

# Compilación de tipos y contratos compartidos (shared)
npm run build:shared

# Ejecución en desarrollo concurrente (Backend + Frontend)
npm run dev

# Ejecución individual del Backend (puerto 3000)
npm run start:backend

# Ejecución individual del Frontend (puerto 4200)
npm run start:frontend

# Ejecución de suites de pruebas unitarias
npm test

# Verificación de linting y calidad de código
npm run lint

# Despliegue en contenedor único (Docker Compose)
docker compose up --build
```

---

## Project Structure

```text
/
├── backend/                              # Servidor API REST y Gateway de WebSockets
│   ├── src/
│   │   ├── modules/
│   │   │   ├── flight/                   # Consulta y catálogo de vuelos
│   │   │   ├── seat/                     # Motor atómico de bloqueo y TTL
│   │   │   ├── booking/                  # Procesamiento de checkout y PNR
│   │   │   └── metrics/                  # Agregador de métricas en tiempo real
│   │   ├── gateway/                      # Socket.io Gateway y enrutamiento de salas
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                             # Pruebas de integración de concurrencia
│   └── package.json
├── frontend/                             # Aplicación SPA interactiva
│   ├── src/app/
│   │   ├── core/services/                # WebSocket client, State stores con Signals
│   │   ├── features/
│   │   │   ├── flight-search/            # Búsqueda y lista reactiva de vuelos
│   │   │   ├── seat-map/                 # Cabina interactiva y cuenta regresiva TTL
│   │   │   ├── checkout/                 # Modal de pago simulado y pase de abordar
│   │   │   └── dashboard/                # Métricas administrativas en vivo
│   │   ├── app.component.ts
│   │   └── app.routes.ts
│   └── package.json
├── shared/                               # Contratos TypeScript compartidos
│   ├── src/
│   │   ├── enums/                        # FlightStatus, SeatStatus, SeatClass
│   │   ├── models/                       # Flight, Seat, Booking, FlightMetrics
│   │   ├── events/                       # WsEvents y payloads tipados
│   │   ├── dtos/                         # SearchFlightsDto, CreateBookingDto
│   │   └── index.ts
│   └── package.json
├── docs/                                 # Documentación obligatoria de la prueba
│   ├── ia.md                             # Uso de IA y criterio técnico
│   └── architecture.md                   # Diagramas, decisiones y concurrencia
├── README.md                             # Guía de inicio rápido y sustentación
└── package.json                          # Configuración de npm workspaces
```

---

## Code Style

### Backend (NestJS Controller / Service)
Convenciones: Inyección por constructor, DTOs inmutables, métodos descriptivos, manejo estricto de excepciones HTTP.

```typescript
@Injectable()
export class SeatLockService {
  private readonly logger = new Logger(SeatLockService.name);

  constructor(
    private readonly stateStore: InMemoryStateStore,
    private readonly eventEmitter: SocketEventBroadcaster,
  ) {}

  public async acquireLock(flightId: string, seatId: string, userId: string): Promise<SeatLockResult> {
    const seatKey = `${flightId}:${seatId}`;
    const acquired = this.stateStore.atomicLock(seatKey, userId, 300); // 300s TTL
    
    if (!acquired) {
      this.logger.warn(`Lock conflict for seat ${seatId} on flight ${flightId} by user ${userId}`);
      throw new ConflictException(`El asiento ${seatId} ya se encuentra bloqueado u ocupado.`);
    }

    this.eventEmitter.broadcastSeatLocked(flightId, seatId, userId);
    return { success: true, lockedUntil: Date.now() + 300000 };
  }
}
```

### Frontend (Angular 18+ Component con Signals)
Convenciones: `standalone: true`, `ChangeDetectionStrategy.OnPush`, uso de `signal()` y `computed()`, sin subscripciones manuales no limpiadas.

```typescript
@Component({
  selector: 'app-seat-item',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button 
      [ngClass]="seatClassComputed()"
      [disabled]="isInteractionDisabled()"
      (click)="onSeatClick()">
      {{ seat().seatNumber }}
    </button>
  `
})
export class SeatItemComponent {
  seat = input.required<Seat>();
  currentUserId = input.required<string>();
  seatSelect = output<Seat>();

  isInteractionDisabled = computed(() => {
    const s = this.seat();
    return s.status === SeatStatus.BOOKED || 
      (s.status === SeatStatus.LOCKED && s.lockedByUserId !== this.currentUserId());
  });
}
```

---

## Boundaries

- **Always:**
  - Validar todos los payloads entrantes tanto en REST como en WebSockets.
  - Asegurar que el backend sea la **única fuente de verdad** para la adquisición y liberación de bloqueos.
  - Usar los tipos del paquete `shared/` en lugar de crear tipos locales duplicados.
  - Ejecutar `npm run build:shared` antes de compilar backend o frontend.
- **Ask First:**
  - Agregar nuevas dependencias de terceros al monorepo.
  - Modificar los nombres de eventos de WebSocket definidos en `WsEvents`.
  - Alterar la duración del TTL por defecto o los estados de los asientos.
- **Never:**
  - Confiar en temporizadores del cliente para liberar un asiento en el servidor.
  - Permitir mutaciones de estado concurrentes sin sincronización o validación atómica.
  - Dejar suscripciones a WebSockets abiertas al destruir componentes en Angular.

---

## User Stories

### Story 1: Búsqueda y Filtro de Vuelos en Tiempo Real
Como usuario del sistema,  
Quiero buscar vuelos filtrando por origen, destino y fecha,  
Para visualizar las opciones disponibles con sus tarifas y horarios actualizados en vivo.

**Acceptance Criteria:**
1. The system shall return a list of active flights matching the origin and destination search criteria.
2. While displaying the flight list, when a flight's operational status changes, the system shall update the affected flight in real-time across all connected clients without requiring a page refresh.
3. When a flight has no available seats remaining, the system shall display the status as `SOLD_OUT` and disable seat selection for that flight.

---

### Story 2: Selección y Bloqueo Temporal de Asientos
Como cliente de la aerolínea,  
Quiero seleccionar un asiento en el mapa interactivo de la aeronave,  
Para reservarlo temporalmente mientras completo mis datos de pago sin riesgo de que otro usuario lo tome.

**Acceptance Criteria:**
1. The system shall render an interactive visual cabin map indicating whether each seat is available, locked, or booked.
2. When an active client selects an available seat, the system shall atomically acquire a lock in the backend for 5 minutes.
3. When a seat is successfully locked, the system shall broadcast a `seat:locked` event to all clients connected to that flight room.
4. If two clients attempt to select the same available seat at the same time, the system shall award the lock to the first request processed and return a conflict error to the second request.
5. While a seat is in locked state, when the 5-minute TTL timer expires without payment confirmation, the backend shall automatically release the lock and broadcast a `seat:released` event.
6. When a user manually deselects their currently locked seat, the system shall release the lock immediately and broadcast `seat:released`.

---

### Story 3: Confirmación y Procesamiento de la Reserva
Como cliente de la aerolínea,  
Quiero confirmar mi reserva ingresando mis datos de pasajero y simulación de pago,  
Para obtener mi boleto digital con un código único de confirmación (PNR).

**Acceptance Criteria:**
1. When a client submits passenger and payment details for a locked seat, the system shall verify that the lock is still valid and owned by the requesting user.
2. When payment processing succeeds, the system shall transition the seat to permanently `BOOKED` and generate a unique alphanumeric PNR code.
3. When a booking is confirmed, the system shall broadcast a `seat:booked` event to all connected clients, permanently disabling that seat.
4. When a booking is finalized, the system shall display a digital confirmation boarding pass with flight details, seat number, and passenger name.

---

### Story 4: Dashboard de Estado y Ocupación en Tiempo Real
Como administrador o espectador del sistema,  
Quiero visualizar métricas en vivo de la demanda y ocupación del vuelo,  
Para monitorear el inventario de asientos disponibles, bloqueados y ocupados.

**Acceptance Criteria:**
1. The system shall provide a real-time dashboard displaying total capacity, percentage of occupancy, available seats, locked seats, and confirmed booked seats.
2. When any seat lock, release, or booking event occurs, the system shall update all dashboard counters and occupancy percentages instantaneously without page reload.

---

## Requirement Traceability

| Requirement ID | Description | Status |
| :--- | :--- | :--- |
| FLIGHT-01 | Búsqueda y filtrado de vuelos por origen, destino y fecha | in design |
| FLIGHT-02 | Actualización en tiempo real de estados de vuelo vía WebSockets | in design |
| SEAT-01 | Renderizado de mapa de cabina interactivo y estados cromáticos | in design |
| SEAT-02 | Bloqueo temporal atómico de asiento con exclusividad | in design |
| SEAT-03 | Notificación inmediata de bloqueo temporal a todos los clientes | in design |
| SEAT-04 | Detección y rechazo de colisiones concurrentes (anti-double booking) | in design |
| SEAT-05 | Expiración y liberación automática de bloqueo gobernada por backend (TTL) | in design |
| SEAT-06 | Liberación manual de asiento por acción del usuario | in design |
| BOOK-01 | Validación de propiedad y vigencia de bloqueo al procesar reserva | in design |
| BOOK-02 | Transición a ocupado permanente y generación de PNR único | in design |
| BOOK-03 | Difusión global de asiento reservado y deshabilitación permanente | in design |
| BOOK-04 | Emisión de pase de abordar digital con datos de confirmación | in design |
| DASH-01 | Panel administrativo con indicadores agregados de ocupación | in design |
| DASH-02 | Reactividad instantánea del dashboard ante eventos de asientos | in design |

---

## Testing Strategy

- **Nivel 1: Pruebas Unitarias (Jest)**
  - Validación de operaciones atómicas en `SeatLockService` (simulación de condiciones de carrera con promesas concurrentes `Promise.all`).
  - Verificación de expiración precisa con temporizadores virtuales (`jest.useFakeTimers()`).
  - Lógica de cálculo de métricas en `FlightMetricsCalculator`.
- **Nivel 2: Pruebas de Integración (Supertest + Socket.io Client)**
  - Handshake de WebSocket, suscripción a sala de vuelo (`flight:join`) y recepción de eventos distribuidos.
  - Validación de respuestas HTTP `201 Created` y `409 Conflict` en endpoints REST.
- **Nivel 3: Pruebas de Sistema / Concurrencia End-to-End**
  - Dos clientes Socket.io concurrentes disparando `seat:lock_request` al mismo asiento en el mismo milisegundo: comprobación estricta de 1 éxito (`seat:locked`) y 1 fallo (`seat:lock_failed`).

---

## Success Criteria

1. **Compilación Limpia:** Backend y frontend compilan sin errores en consola ni advertencias críticas de TypeScript.
2. **Sincronización Multi-Pestaña:** Al abrir dos ventanas del navegador en paralelo, cualquier acción en la Ventana A (bloqueo, deselección, compra) se refleja en la Ventana B en < 100 ms.
3. **Cero Sobre-Reservas:** En pruebas de estrés simuladas con 50 peticiones simultáneas sobre el mismo asiento, solo 1 cliente obtiene el bloqueo.
4. **Expiración Confiable:** Si un asiento se bloquea y el usuario no confirma en 5 minutos (o ventana reducida de prueba), el asiento se libera automáticamente en todos los clientes.
5. **Dashboard 100% Reactivo:** El panel de administración reacciona a cada evento en vivo sin requerir F5 o recargas manuales.
