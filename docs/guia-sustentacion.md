# Guía de Sustentación y Defensa Técnica

> **Proyecto:** Sistema de Reservas de Vuelos en Tiempo Real con Concurrencia Distribuida  
> **Rol:** Especialista Desarrollador Líder Técnico — Banco Davivienda  
> **Propósito:** Guion de demostración en vivo (5 min) y banco de respuestas arquitectónicas ante el panel evaluador.

---

## 1. Pitch de Apertura (1 Minuto)

> *"Buenas tardes al panel evaluador. Hoy les presento una solución de grado bancario para el problema crítico de alta concurrencia en la reserva de vuelos. 
> 
> El desafío central no es pintar un mapa de asientos, sino **garantizar la consistencia transaccional absoluta y la experiencia en tiempo real**, evitando a toda costa la sobreventa de inventario (*double-booking*) ante miles de usuarios compitiendo en el mismo milisegundo.
> 
> Para lograrlo, implementamos una **Arquitectura Hexagonal en NestJS**, un motor de **bloqueo distribuido atómico con Redis 7 (`SET NX PX`)**, persistencia **ACID en PostgreSQL 16**, y un cliente **Angular 18 Standalone gobernado por Signals** que sincroniza cambios delta mediante WebSockets de forma silenciosa, fluida y con la identidad visual institucional de Davivienda."*

---

## 2. Guion de Demostración en Vivo (5 Minutos)

Para demostrar en vivo la resiliencia del sistema ante el comité, sigue esta secuencia exacta:

### Paso 1: Catálogo y Búsqueda Paginada (45 segundos)
1. Abrir `http://localhost:4200`.
2. Mostrar la barra de búsqueda moderna con el selector de fechas y el catálogo relacional de ciudades (Bogotá, Medellín, Cartagena, etc.).
3. Resaltar la **paginación server-side**: el backend entrega 5 vuelos por página con metadata completa (`skip`/`take`), navegando fluidamente entre páginas.

### Paso 2: Concurrencia Multi-Ventana y Prevención de Double-Booking (1 min 30 seg)
1. Abrir una segunda ventana en modo incógnito (o en un navegador alterno como Chrome + Firefox).
2. **Asignar identidades:** En la ventana A, seleccionar a *"Carlos Mendoza"*; en la ventana B, a *"Ana Rodríguez"*.
3. En ambas ventanas, ingresar al vuelo **`DV-204`** (Bogotá &rarr; Medellín).
4. **Demostración de bloqueo atómico:**
   - En la ventana A (Carlos), hacer clic en el asiento **`12B`**.
   - En la ventana A, el asiento se vuelve **Rojo** con un temporizador regresivo de 5 minutos (`04:59`).
   - En la ventana B (Ana), **en milisegundos y sin recargar**, el asiento `12B` cambia a **Ámbar pulsante** con el ícono de candado 🔒 y el tooltip anonimizado *"Asiento reservado temporalmente"*.
5. **Simulación de colisión simultánea:**
   - En la ventana B, intentar hacer clic sobre el asiento `12B`.
   - El sistema rechaza la acción, protegiendo el inventario con cero sobreventa.

### Paso 3: Expiración Autónoma del TTL en Backend (45 segundos)
1. Explicar al panel que el TTL **no depende del navegador ni de JavaScript del cliente**: si el usuario cierra la ventana o apaga la laptop, la clave en Redis (`flight:DV-204:seat:12B:lock`) expira a los 300 segundos.
2. Hacer clic en *"Liberar Asiento"* en la ventana A para ver cómo el asiento regresa inmediatamente a **Verde (Disponible)** en todas las pantallas.

### Paso 4: Flujo de Pago y Tarjeta Virtual Interactiva (1 minuto)
1. En la ventana A, seleccionar nuevamente el asiento `12B` y presionar *"Continuar al Pago"*.
2. Resaltar el stepper del embudo de reserva:
   - Formulario de tarjeta de crédito virtual interactiva que refleja los números en vivo y gira en 3D al enfocar el campo CVV.
   - Pestaña de pago con **DaviPlata** o **Tarjeta de Crédito Davivienda**.
3. Confirmar la compra:
   - Se ejecuta una **transacción ACID con `QueryRunner` en PostgreSQL**, marcando el asiento permanentemente como `BOOKED` y liberando la clave de Redis.
   - Se emite el **Pasabordo Digital interactivo con código PNR oficial** (ej: `DV-79K2B`).
   - En la ventana B, el asiento `12B` pasa instantáneamente a **Gris (Ocupado)**.

### Paso 5: Dashboard de Telemetría Ejecutiva (1 minuto)
1. Navegar a la pestaña *"Dashboard de Ocupación"*.
2. Demostrar el selector de vuelos con el catálogo completo (60 vuelos en BD).
3. Mostrar las 4 tarjetas KPI reactivas en tiempo real:
   - Tasa de ocupación (Gauge radial animado).
   - Asientos disponibles.
   - Bloqueos activos en Redis.
   - Ventas confirmadas e ingresos acumulados en COP.
4. Resaltar el feed de auditoría en vivo conectado a la sala de WebSockets.

---

## 3. Banco de Preguntas Difíciles del Panel de Arquitectura

A continuación se presentan las respuestas estructuradas ante las preguntas más complejas que suele formular un comité evaluador técnico:

### P1: ¿Cómo escala esta arquitectura si pasamos de cientos a 1.000.000 de usuarios concurrentes en una promoción como CyberLunes o Black Friday?
> **Respuesta:**  
> *"La solución fue diseñada con separación limpia entre procesamiento de lectura y escritura:
> 1. **Capa de Concurrencia (Redis Cluster Sharding):** El particionamiento de claves se realiza por identificador de vuelo (`{flight_id}:seat_id`). Esto garantiza que las operaciones `SET NX PX` se distribuyan uniformemente entre los nodos de un Redis Cluster, logrando decenas de miles de operaciones por segundo por nodo con latencias < 2ms.
> 2. **WebSocket Gateway Sharding:** Desplegamos múltiples pods del backend NestJS detrás de un Load Balancer con afinidad de sesión (Sticky Sessions) o balanceo Round-Robin, conectando los gateways mediante el **Redis Streams / Socket.io Redis Adapter**. Así, los eventos emitidos en un pod se propagan transparentemente a los clientes conectados en los demás pods.
> 3. **Persistencia (PostgreSQL Read Replicas & Connection Pooling):** La base de datos relacional solo recibe tráfico de lectura paginada (a través de Read Replicas) y escrituras finales de compra protegidas por PgBouncer, eliminando la sobrecarga sobre la base de datos transaccional primaria."*

---

### P2: En el Teorema CAP/PACELC, ¿qué compromiso asume esta arquitectura en caso de partición de red entre Redis y la Base de Datos?
> **Respuesta:**  
> *"En un sistema de reservas de asientos y transacciones financieras, **la consistencia estricta (C) es innegociable sobre la disponibilidad (A)**. No podemos tolerar sobreventa (*double-booking*).
> 
> Si ocurre una partición de red y Redis no está accesible:
> - El sistema cuenta con un fallback transaccional pesimista en PostgreSQL utilizando `SELECT ... FOR UPDATE` sobre la fila del asiento dentro de la transacción del `BookingService`.
> - Si ambos nodos de persistencia no pueden garantizar la adquisición del lock exclusivo, la operación falla de manera determinista hacia el cliente con un mensaje de reintento (`SEAT_LOCK_FAILED`), prefiriendo rechazar temporalmente una reserva antes que permitir una reserva fantasma o duplicada."*

---

### P3: ¿Por qué eligieron WebSockets sobre Server-Sent Events (SSE) o HTTP Long Polling?
> **Respuesta:**  
> *"Evaluamos las tres opciones:
> - **Long Polling:** Descargado por overhead excesivo de cabeceras HTTP (TCP handshake, TLS y headers de 1KB en cada request) que a escala de miles de usuarios satura la red.
> - **Server-Sent Events (SSE):** Excelente para feeds unidireccionales (servidor &rarr; cliente), pero requiere peticiones HTTP POST separadas para cada acción del usuario (bloquear/desbloquear).
> - **WebSockets (Socket.io):** Proporciona un canal **full-duplex persistente sobre una única conexión TCP**. La solicitud de bloqueo y la difusión del delta ocurren en la misma sesión con latencias inferiores a 5 milisegundos, permitiendo multiplexar salas por vuelo (`flight_<id>`) para que los clientes solo escuchen eventos del avión que están visualizando."*

---

### P4: ¿Cómo se garantiza la seguridad bancaria y el cumplimiento de PCI-DSS en el flujo de pagos?
> **Respuesta:**  
> *"La solución aplica principios de diseño bancario seguro:
> 1. **No persistencia de datos sensibles (PCI-DSS Criterio 3.2):** El código CVV y los números completos de tarjeta de crédito nunca tocan la base de datos relacional. La entidad `Booking` almacena únicamente el método de pago (`CREDIT_CARD` / `DAVIPLATA`), el PNR y los últimos 4 dígitos como máscara de auditoría.
> 2. **Anonimización de PII:** En las salas de WebSocket, los identificadores y nombres de usuarios se filtran; los terceros solo ven estados (`LOCKED`, `BOOKED`), impidiendo que un atacante rastree qué cliente bancario está reservando qué asiento.
> 3. **Rate Limiting Defensivo:** Se incorporó `@nestjs/throttler` en los endpoints REST (`limit: 5, ttl: 60s`) para mitigar ataques de fuerza bruta, scraping o denegación de servicio (DoS) sobre el inventario."*

---

### P5: ¿Por qué decidieron utilizar Angular 18 con Signals en lugar de RxJS tradicional con ChangeDetectorRef?
> **Respuesta:**  
> *"En aplicaciones tradicionales de mapas de asientos con 180 nodos SVG/HTML, un evento WebSocket solía disparar una detección de cambios global en toda la vista de Angular (revisando 180 componentes). 
> 
> Con **Angular Signals (Fine-Grained Reactivity)**, el estado de los asientos se modela con señales inmutables computadas (`computed`, `signal`). Cuando llega un evento delta de WebSocket, solo se actualiza la señal específica del asiento modificado; Angular actualiza **únicamente ese nodo exacto en el DOM**, sin reflows ni ciclos de detección de cambios innecesarios, logrando un rendimiento constante de 60 cuadros por segundo."*
