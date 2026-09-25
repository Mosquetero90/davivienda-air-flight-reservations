# Project State & Decision Log (STATE.md)

> **Proyecto:** Sistema de Reservas de Vuelos en Tiempo Real  
> **Candidatura:** Especialista Desarrollador Líder Técnico — Davivienda  
> **Última actualización:** 2026-09-24

---

## 1. Architectural Decision Records (ADRs)

### AD-001: Selección de Frontend — Angular 18+ con Signals y Standalone Components
* **Fecha:** 2026-09-24
* **Estado:** Aceptado
* **Contexto:** La vacante de Davivienda exige *"Indispensable JavaScript y Angular — desarrollo avanzado, arquitectura de componentes y optimización"*. La prueba requiere renderizar una cabina interactiva de aeronave (150-200 asientos) sincronizada en tiempo real.
* **Decisión:** Emplear Angular 18+ utilizando componentes `standalone: true`, `ChangeDetectionStrategy.OnPush` y `Signals` reactivas (`signal`, `computed`).
* **Consecuencias:** Se elimina la sobrecarga de reconciliación del Virtual DOM en el mapa de asientos (cada asiento se actualiza de forma atómica en el DOM cuando cambia su estado). Se descarta NgRx para evitar boilerplate excesivo en un prototipo de 1 día, resolviendo el estado con servicios reactivos basados en Signals y RxJS.

### AD-002: Selección de Backend — NestJS (Modular Monolith)
* **Fecha:** 2026-09-24
* **Estado:** Aceptado
* **Contexto:** Se requiere una API REST, WebSocket Gateway y tipado compartido con el frontend. Se evaluaron Spring Boot y NestJS.
* **Decisión:** Implementar un Monolito Modular en NestJS con arquitectura limpia (Hexagonal).
* **Consecuencias:** Habilita el paquete `@davivienda/shared` para compartir DTOs y contratos de eventos WebSocket de forma nativa sin generadores de código. El modelo de I/O no bloqueante de Node.js gestiona las conexiones persistentes de Socket.io con mínimo consumo de memoria.

### AD-003: Control de Concurrencia y Prevención de Double-Booking
* **Fecha:** 2026-09-24
* **Estado:** Aceptado
* **Contexto:** Múltiples clientes pueden intentar bloquear o comprar el mismo asiento exactamente en el mismo milisegundo.
* **Decisión:** Implementar un motor de bloqueo atómico con Redis (`SET NX PX` con TTL de 300 segundos) y fallback resiliente en memoria con validación en el Event Loop.
* **Consecuencias:** El backend es la única fuente de verdad. Se previenen condiciones de carrera (*TOCTOU*). La expiración es autónoma en el servidor: si el usuario cierra la ventana o vence el TTL de 5 minutos, el temporizador libera el asiento y emite `seat:released` a todos los clientes conectados a la sala.

### AD-004: Comunicación en Tiempo Real con Socket.io
* **Fecha:** 2026-09-24
* **Estado:** Aceptado
* **Contexto:** Se debe actualizar el estado de asientos, vuelos y métricas sin recargar la página.
* **Decisión:** Utilizar `@nestjs/platform-socket.io` y `socket.io-client`.
* **Consecuencias:** Soporte nativo de canales/salas por vuelo (`flight:join`), reconexión automática resiliente con backoff exponencial y detección de eventos de desconexión.

### AD-005: Sistema de Diseño Institucional Davivienda y Prototipado con Stitch MCP
* **Fecha:** 2026-09-24
* **Estado:** Aceptado
* **Contexto:** Se requiere que la interfaz de usuario respete fielmente los lineamientos gráficos del Banco Davivienda (colores institucionales, DaviPlata, DaviPuntos) y sirva como referencia visual nítida para la sustentación.
* **Decisión:** Diseñar las 4 pantallas del producto mediante el MCP de Stitch (Proyecto ID `14151116527474714026`) vinculadas a un Design System institucional con color primario `#ED1C24` (Rojo Davivienda), acento DaviPlata (`#E20613`), dorado DaviPuntos (`#FFB800`) y tipografía Inter.
* **Consecuencias:** Proporciona especificaciones visuales de alta fidelidad para el desarrollo en Angular con Tailwind CSS, garantizando congruencia estética en toda la experiencia.

---

## 2. Handoff Snapshot

* **Fase Actual:** Specify, Design, Tasks y Execution completadas al 100%.
* **UI/UX:** 4 pantallas completas diseñadas en Stitch bajo identidad de marca Davivienda (`#ED1C24`, `#E20613`, `#FFB800`, `#10B981`).
* **Contratos Compartidos:** Paquete `@davivienda/shared` implementado y compilado con tipado estricto unificado.
* **Backend:** Monolito modular hexagonal en NestJS con Redis atómico (`SET NX PX`), PostgreSQL (ACID), Socket.io gateway y 12 pruebas unitarias pasando.
* **Frontend:** Angular 18+ Standalone, Signals reactivas, Tailwind CSS y componentes completos (HU1, HU2, HU3, HU4).
* **Despliegue:** `docker-compose.yml` orquestando PostgreSQL, Redis, Backend y Frontend con Nginx.
