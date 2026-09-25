# Diseño Técnico: Sistema de Reservas de Vuelos en Tiempo Real

> **Feature:** `flight-reservation`  
> **Patrón:** Hexagonal (Puertos y Adaptadores) & Event-Driven Architecture  
> **Fecha:** 2026-09-24

---

## 1. Diagrama de Flujo y Máquina de Estados del Asiento

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE : Vuelo Creado / Inicializado
    
    AVAILABLE --> LOCKED : Usuario solicita bloqueo (seat:lock_request)
    LOCKED --> AVAILABLE : Expiración de TTL (5 min) / Desbloqueo manual (seat:released)
    LOCKED --> AVAILABLE : Cliente se desconecta abruptamente y expira TTL
    
    LOCKED --> BOOKED : Pago procesado exitosamente (POST /api/bookings)
    
    BOOKED --> [*] : Asiento ocupado permanentemente (PNR emitido)
```

---

## 2. Diagramas de Secuencia

### 2.1. Bloqueo Atómico y Propagación en Tiempo Real (HU2)

```mermaid
sequenceDiagram
    autonumber
    actor ClienteA as Cliente A (Ventana 1)
    participant WS as WebSocket Gateway (NestJS)
    participant LockEngine as Atomic SeatLock Manager
    actor ClienteB as Cliente B (Ventana 2)
    actor Dashboard as Admin Dashboard

    ClienteA->>WS: emit('seat:lock_request', { flightId, seatId, userId: 'A' })
    WS->>LockEngine: acquireLock(flightId, seatId, 'A', ttlSeconds: 300)
    LockEngine-->>WS: Lock Acquired (Success)
    
    par Notificación a Cliente A
        WS-->>ClienteA: emit('seat:locked', { seatId, status: 'LOCKED_BY_ME', lockedUntil })
    and Difusión a Sala de Vuelo (Broadcast)
        WS-->>ClienteB: broadcastToRoom(flightId, 'seat:locked', { seatId, status: 'LOCKED_BY_OTHER' })
    and Actualización del Dashboard
        WS-->>Dashboard: emit('metrics:updated', { available--, locked++, ... })
    end
```

### 2.2. Prevención de Condición de Carrera (*Anti Double-Booking*)

```mermaid
sequenceDiagram
    autonumber
    actor ClienteA as Cliente A
    actor ClienteB as Cliente B
    participant WS as WebSocket Gateway
    participant LockEngine as Atomic SeatLock Manager

    Note over ClienteA,ClienteB: Ambos intentan bloquear el asiento 14B simultáneamente
    par Petición Cliente A
        ClienteA->>WS: emit('seat:lock_request', { seatId: '14B', user: 'A' })
    and Petición Cliente B
        ClienteB->>WS: emit('seat:lock_request', { seatId: '14B', user: 'B' })
    end

    critical Procesamiento Atómico en Event Loop
        WS->>LockEngine: acquireLock(14B, user: 'A')
        LockEngine-->>WS: Acquired (OK)
        WS-->>ClienteA: emit('seat:locked', { seatId: '14B' })
    option Conflicto Detectado
        WS->>LockEngine: acquireLock(14B, user: 'B')
        LockEngine-->>WS: Rejected (SeatAlreadyLocked)
        WS-->>ClienteB: emit('seat:lock_failed', { seatId: '14B', reason: 'Asiento no disponible' })
    end
```

### 2.3. Expiración Autónoma por Servidor (TTL)

```mermaid
sequenceDiagram
    autonumber
    participant ServerTimer as Engine Autonomous TTL Timer
    participant WS as WebSocket Gateway
    actor ClienteA as Cliente A
    actor ClienteB as Cliente B
    actor Dashboard as Admin Dashboard

    Note over ServerTimer: Transcurren los 5 minutos sin pago confirmado
    ServerTimer->>ServerTimer: releaseLock(flightId, seatId)
    ServerTimer->>WS: notifySeatReleased(flightId, seatId, reason: 'EXPIRED')
    
    par Difusión Global a Sala
        WS-->>ClienteA: emit('seat:released', { seatId, reason: 'EXPIRED' })
        WS-->>ClienteB: emit('seat:released', { seatId, reason: 'EXPIRED' })
    and Actualización de Métricas
        WS-->>Dashboard: emit('metrics:updated', { available++, locked--, ... })
    end
```

---

## 3. Estrategia de Salas de WebSockets (Multiplexación por Vuelo)

Para optimizar el uso de red y evitar sobrecargar a clientes con eventos irrelevantes:
- Cuando un usuario entra a ver la cabina del vuelo `AV204`, el cliente emite `flight:join` con `{ flightId: 'AV204' }`.
- El Gateway de NestJS suscribe ese socket a la sala `flight_AV204` (`socket.join('flight_' + flightId)`).
- Todos los eventos de asientos (`seat:locked`, `seat:released`, `seat:booked`) se emiten exclusivamente a la sala correspondiente (`server.to('flight_' + flightId).emit(...)`).
- Los clientes suscritos al Dashboard administrativo se unen a la sala `metrics_feed` para recibir los agregados consolidados.

---

## 4. Agregación de Métricas en Tiempo Real (HU4)

El servicio `MetricsService` mantiene en memoria contadores O(1) por vuelo:
$$\text{occupancyPercentage} = \left( \frac{\text{bookedSeats} + \text{lockedSeats}}{\text{totalSeats}} \right) \times 100$$
$$\text{revenueEstimated} = \sum_{\text{booked}} \text{seatPrice}$$

Cada mutación atómica de asiento actualiza de inmediato estas variables y emite `metrics:updated`.
