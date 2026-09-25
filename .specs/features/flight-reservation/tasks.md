# Plan de Tareas: Sistema de Reservas de Vuelos en Tiempo Real

> **Feature:** `flight-reservation`  
> **Metodología:** Spec-Driven Development (SDD) & Atomic Execution  
> **Fecha:** 2026-09-24

---

## Test Coverage Matrix

| Capa / Módulo | Requisito Trazable | Estrategia de Prueba | Comando de Verificación |
| :--- | :--- | :--- | :--- |
| **Shared Contracts** | FLIGHT-01, SEAT-01 | Tipado estricto TS & Compilación | `npm run build:shared` |
| **SeatLock Engine** | SEAT-02, SEAT-04, SEAT-05 | Unit Test: Concurrencia y TTL atómico | `npm test --workspace=backend` |
| **Flight Service** | FLIGHT-01, FLIGHT-02 | Unit Test: Búsqueda y mutación de estado | `npm test --workspace=backend` |
| **Booking Service** | BOOK-01, BOOK-02, BOOK-03 | Unit Test: Validación de lock y emisión PNR | `npm test --workspace=backend` |
| **Metrics Engine** | DASH-01, DASH-02 | Unit Test: Agregaciones reactivas O(1) | `npm test --workspace=backend` |
| **WebSocket Gateway** | SEAT-03, SEAT-06 | Integration Test: Salas y broadcast | `npm test --workspace=backend` |
| **Frontend Signals** | SEAT-01, DASH-02 | Component / Store Test: Reactividad fina | `npm test --workspace=frontend` |
| **E2E Multi-Client** | AC-01 a AC-05 | Manual & Automated Multi-Tab sync | Verificación en 2 navegadores |

---

## Gate Check Commands

```bash
# Gate 1: Compilación de contratos compartidos
npm run build:shared

# Gate 2: Tests del backend
npm test --workspace=backend

# Gate 3: Tests del frontend
npm test --workspace=frontend

# Gate 4: Linting de todo el workspace
npm run lint
```

---

## Execution Plan

### Phase 1: Backend Core & Concurrency Engine
```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: WebSockets Gateway & REST APIs
```text
T5 -> T6 -> T7
```

### Phase 3: Frontend Setup & Reactive State
```text
T8 -> T9 -> T10
```

### Phase 4: Frontend Components & Interactive UI
```text
T11 -> T12 -> T13 -> T14
```

### Phase 5: Integración Multi-Cliente & Docker
```text
T15 -> T16
```

---

## Task Breakdown

### Phase 1: Backend Core & Concurrency Engine

### T1: Scaffolding de NestJS Backend y Dependencias
**Depends on**: none
**Where**: backend/package.json
**Tests**: npm run build --workspace=backend
**Gate**: npm run build:shared && npm run build --workspace=backend

Inicializar el proyecto NestJS en `backend/` integrando `@davivienda/shared`, `@nestjs/platform-socket.io`, `socket.io`, `class-validator`, `class-transformer` y soporte de TypeScript.

### T2: Implementación del Motor Atómico de Bloqueo con TTL
**Depends on**: T1
**Where**: backend/src/modules/seat/seat-lock.service.ts
**Tests**: backend/src/modules/seat/seat-lock.service.spec.ts
**Gate**: npm test --workspace=backend

Implementar `SeatLockService` con operaciones síncronas atómicas de adquisición de bloqueo (`acquireLock`), verificación de exclusividad, prevención de doble reserva y temporizador autónomo de expiración de 5 minutos que dispara la liberación automática.

### T3: Módulo de Catálogo y Consulta de Vuelos
**Depends on**: T2
**Where**: backend/src/modules/flight/flight.service.ts
**Tests**: backend/src/modules/flight/flight.service.spec.ts
**Gate**: npm test --workspace=backend

Implementar `FlightService` con datos semilla de vuelos realistas (ej: BOG-MDE, BOG-CTG), layout de cabina Airbus A320 (30 filas, A-B-C | D-E-F), filtrado por origen/destino y actualización reactiva de estados (`SCHEDULED`, `DELAYED`, `CANCELLED`).

### T4: Motor de Reservas y Emisión de PNR
**Depends on**: T3
**Where**: backend/src/modules/booking/booking.service.ts
**Tests**: backend/src/modules/booking/booking.service.spec.ts
**Gate**: npm test --workspace=backend

Implementar `BookingService` validando vigencia y pertenencia del lock, transición permanente a `BOOKED`, generación de código PNR único (6 caracteres alfanuméricos) y registro de pago simulado.

---

### Phase 2: WebSockets Gateway & REST APIs

### T5: WebSocket Gateway con Multiplexación de Salas
**Depends on**: T4
**Where**: backend/src/gateway/flight.gateway.ts
**Tests**: backend/test/gateway.e2e-spec.ts
**Gate**: npm test --workspace=backend

Crear `FlightGateway` con Socket.io manejando eventos `flight:join`, `flight:leave`, `seat:lock_request`, `seat:unlock_request`, enrutando a salas por vuelo (`flight_<id>`) y difundiendo eventos `seat:locked`, `seat:released`, `seat:booked`.

### T6: Agregador de Métricas en Vivo para Dashboard
**Depends on**: T5
**Where**: backend/src/modules/metrics/metrics.service.ts
**Tests**: backend/src/modules/metrics/metrics.service.spec.ts
**Gate**: npm test --workspace=backend

Implementar `MetricsService` manteniendo contadores O(1) de asientos disponibles, bloqueados y ocupados por vuelo, emitiendo `metrics:updated` en cada cambio de inventario.

### T7: Controladores REST y Manejo Global de Errores
**Depends on**: T6
**Where**: backend/src/modules/flight/flight.controller.ts
**Tests**: backend/test/app.e2e-spec.ts
**Gate**: npm test --workspace=backend

Exponer endpoints REST (`GET /api/flights`, `GET /api/flights/:id`, `POST /api/bookings`, `PATCH /api/flights/:id/status`) con validación de DTOs vía `ValidationPipe` y manejo de excepciones HTTP (`409 Conflict`, `404 Not Found`).

---

### Phase 3: Frontend Setup & Reactive State

### T8: Scaffolding de Angular 18+ con Standalone y Tailwind CSS
**Depends on**: T7
**Where**: frontend/package.json
**Tests**: npm run build --workspace=frontend
**Gate**: npm run build --workspace=frontend

Inicializar la aplicación Angular en `frontend/` configurando `standalone: true`, enrutador declarativo, integración con `@davivienda/shared` y estilos utilitarios con Tailwind CSS.

### T9: Servicio Cliente de WebSockets (Socket.io)
**Depends on**: T8
**Where**: frontend/src/app/core/services/socket.service.ts
**Tests**: frontend/src/app/core/services/socket.service.spec.ts
**Gate**: npm test --workspace=frontend

Crear `SocketService` gestionando la conexión Socket.io, reconexión automática, emisión de eventos tipados (`joinFlight`, `requestLock`, `requestUnlock`) y exposición de observables/signals de eventos entrantes.

### T10: Signal Store Reactivo para Vuelo y Cabina
**Depends on**: T9
**Where**: frontend/src/app/core/state/flight-state.service.ts
**Tests**: frontend/src/app/core/state/flight-state.service.spec.ts
**Gate**: npm test --workspace=frontend

Implementar `FlightStateService` utilizando Angular Signals (`signal`, `computed`) para mantener el estado reactivo del vuelo activo, la matriz de asientos y el temporizador regresivo de bloqueo personal sin re-renders masivos.

---

### Phase 4: Frontend Components & Interactive UI

### T11: Componente de Búsqueda y Listado de Vuelos
**Depends on**: T10
**Where**: frontend/src/app/features/flight-search/flight-search.component.ts
**Tests**: frontend/src/app/features/flight-search/flight-search.component.spec.ts
**Gate**: npm test --workspace=frontend

Implementar la vista de búsqueda con filtros por origen/destino y listado reactivo de tarjetas de vuelos que actualiza estados en tiempo real (`DELAYED`, `CANCELLED`, `SOLD_OUT`).

### T12: Mapa Interactivo de Cabina y Asientos
**Depends on**: T11
**Where**: frontend/src/app/features/seat-map/seat-map.component.ts
**Tests**: frontend/src/app/features/seat-map/seat-map.component.spec.ts
**Gate**: npm test --workspace=frontend

Construir el mapa visual de cabina (A-B-C pasillo D-E-F) con estados cromáticos (verde: disponible, amarillo: bloqueado por mí, naranja/rojo: bloqueado por otro, gris: ocupado), temporizador de expiración en vivo y click para bloquear/desbloquear.

### T13: Modal de Checkout, Pago Simulado y Boarding Pass
**Depends on**: T12
**Where**: frontend/src/app/features/checkout/checkout.component.ts
**Tests**: frontend/src/app/features/checkout/checkout.component.spec.ts
**Gate**: npm test --workspace=frontend

Crear el modal de confirmación con formulario reactivo de pasajero, selección de método de pago simulado (Tarjeta, Daviplata, PSE), confirmación en backend y renderizado del pase de abordar con código PNR.

### T14: Dashboard Administrativo en Vivo
**Depends on**: T13
**Where**: frontend/src/app/features/dashboard/dashboard.component.ts
**Tests**: frontend/src/app/features/dashboard/dashboard.component.spec.ts
**Gate**: npm test --workspace=frontend

Implementar el panel de métricas en tiempo real con tarjetas estadísticas (capacidad total, porcentaje de ocupación, disponibles, bloqueados, confirmados) y visualizador de eventos de auditoría en directo.

---

### Phase 5: Integración Multi-Cliente & Docker

### T15: Pruebas de Integración Concurrente Multi-Pestaña
**Depends on**: T14
**Where**: backend/test/concurrency.e2e-spec.ts
**Tests**: backend/test/concurrency.e2e-spec.ts
**Gate**: npm test --workspace=backend

Automatizar prueba de integración con 2 clientes Socket.io concurrentes compitiendo por el mismo asiento para verificar la atomicidad del lock y el rechazo inmediato al cliente perdedor.

### T16: Dockerfile y Docker Compose Unificado
**Depends on**: T15
**Where**: docker-compose.yml
**Tests**: docker compose config
**Gate**: docker compose config

Crear `backend/Dockerfile`, `frontend/Dockerfile` y `docker-compose.yml` para desplegar el backend y frontend con un solo comando (`docker compose up --build`).
