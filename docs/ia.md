# Documento de Uso de Inteligencia Artificial (IA)

> **Rol:** Especialista Desarrollador Líder Técnico  
> **Institución:** Banco Davivienda — Vicepresidencia de Tecnología  
> **Proyecto:** Sistema de Reservas de Vuelos en Tiempo Real con Concurrencia Distribuida  
> **Metodología:** Desarrollo Asistido por Inteligencia Artificial & Spec-Driven Engineering (`tlc-spec-driven`)

---

## 1. Herramientas de IA Utilizadas

Durante el ciclo de vida del proyecto se empleó un ecosistema de herramientas de Inteligencia Artificial enfocado en acelerar la arquitectura, el diseño de contratos, el scaffolding de código y la suite de pruebas automatizadas:

| Herramienta / Modelo | Versión / Variante | Rol / Caso de Uso Principal |
| :--- | :--- | :--- |
| **Google Antigravity AI** | Gemini 3.1 Pro, 3.8 Flash | Orquestación agéntica del espacio de trabajo, diseño de arquitectura hexagonal, refactorización de código y generación de documentación técnica interactiva. |
| **Tech Lead's Club Agent Skills** | `tlc-spec-driven` v3.3.0 | Framework de desarrollo guiado por especificaciones formales (Spec-Driven Development), contratos EARS y gobernanza de decisiones arquitectónicas (`STATE.md`). |
| **NestJS Architecture Expert Agent** | NestJS Best Practices | Auditoría estricta de inyección de dependencias, desacoplamiento modular, transacciones ACID y eliminación de patrones de consulta N+1. |
| **Angular Architecture Expert Agent** | Angular 18 Developer | Generación de componentes Standalone modernos, reactividad fina mediante Signals y diseño responsivo institucional con Tailwind CSS. |

---

## 2. Prompts Clave y Casos de Uso

A continuación se documentan los prompts deterministas empleados en las diferentes etapas del proyecto:

### 2.1. Análisis y Modelado Formal de Requisitos (Spec-Driven)
* **Prompt:**  
  > *"Actúa como Líder Técnico. Analiza los requisitos funcionales y no funcionales de la prueba técnica (tiempo real, concurrencia, bloqueo efímero de asientos, prevención de double-booking y persistencia transaccional). Modela las especificaciones formales usando notación EARS y desglosa los criterios de aceptación deterministas organizados por historias de usuario (HU1 a HU4)."*
* **Resultado:** Matriz de especificación formal en `.specs/features/flight-reservation/spec.md` con trazabilidad completa de eventos en tiempo real (`seat:locked`, `seat:lock_failed`, `seat:released`, `seat:booked`, `metrics:updated`).

### 2.2. Diseño de Concurrencia y Bloqueo Distribuido
* **Prompt:**  
  > *"Diseña la estrategia de control de concurrencia para evitar doble reserva (double-booking) ante peticiones concurrentes en el mismo milisegundo sobre el mismo asiento. Evalúa un Mutex en memoria vs Redis Distributed Lock (`SET NX PX`), justificando la decisión para una solución modular escalable de alta disponibilidad."*
* **Resultado:** Implementación del patrón de exclusión mutua distribuida con Redis 7 y fallback automático a memoria/SQLite para entornos de desarrollo local.

### 2.3. Contratos Compartidos y Tipado Extremo Monorepo (`shared/`)
* **Prompt:**  
  > *"Genera los contratos TypeScript unificados (DTOs, Enums y Payloads de WebSocket) para compartir entre backend y frontend en un monorepo modular. Asegura inmutabilidad y tipado estricto de extremo a extremo sin duplicación de definiciones."*
* **Resultado:** Paquete `@davivienda/shared` compilado con TypeScript, garantizando que el gateway NestJS y las Signals de Angular compartan exactamente las mismas estructuras de datos.

### 2.4. Paginación Server-Side y Reactividad de Interfaz
* **Prompt:**  
  > *"Implementa paginación server-side en NestJS usando skip/take con TypeORM, validación Swagger `@Min(1)` y `@Max(100)`, y enlaza en Angular 18 mediante señales reactivas dedicadas tanto para el buscador (5 vuelos por página) como para el dashboard ejecutivo (catálogo completo de hasta 100 vuelos)."*
* **Resultado:** Endpoint REST paginado con metadata (`page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`) y barra de navegación accesible en el frontend.

---

## 3. Refactorizaciones guiadas por Criterio Humano (Tech Lead)

Uno de los aspectos más críticos de la ingeniería asistida por IA es la aplicación rigurosa del criterio técnico humano ante propuestas automatizadas que resultan subóptimas, inseguras o inviables en entornos bancarios reales. A continuación se detallan las **6 decisiones arquitectónicas donde el criterio del Líder Técnico corrigió las sugerencias iniciales de la IA**:

```
           Propuesta Inicial de la IA                  Criterio de Ingeniería del Tech Lead
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│ 1. Temporizador TTL gestionado en cliente    │ ──>│ Backend único soberano del TTL (Redis NX PX) │
│ 2. Retransmisión completa de cabina (180 as.)│ ──>│ Deltas atómicos con Angular Signals O(1)     │
│ 3. Validación secuencial en memoria (TOCTOU) │ ──>│ Exclusión mutua atómica distribuida en Redis │
│ 4. Consultas N+1 en bucles TypeORM           │ ──>│ Carga batch combinada y transacciones ACID   │
│ 5. Toasts globales por cada acción de red    │ ──>│ Cabina reactiva silenciosa con color-coding  │
│ 6. Exposición de PII de usuarios en tooltips │ ──>│ Anonimización estricta ("Asiento reservado") │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

### 3.1. Gestión del Temporizador de Expiración (TTL) en Backend vs Cliente
* **Propuesta Inicial de la IA:** Propuso gestionar la cuenta regresiva de 5 minutos en el cliente Angular mediante `setTimeout` y disparar un endpoint `POST /seats/release` cuando el temporizador llegara a cero.
* **Criterio y Corrección Técnica:** **Vulnerabilidad crítica de seguridad y consistencia.** Si el usuario pierde conexión, cierra la pestaña del navegador o manipula el código en consola, el asiento quedaría bloqueado indefinidamente secuestrando el inventario. Se refactorizó para que el **backend sea la única fuente de verdad**: Redis administra la expiración atómica con clave `flight:{flightId}:seat:{seatId}:lock` y TTL de 300 segundos, notificando proactivamente a las salas de WebSocket vía `seat:released` cuando la clave expira.

### 3.2. Granularidad Fina de WebSockets (Deltas Atómicos) vs Reemisión Masiva
* **Propuesta Inicial de la IA:** Sugirió retransmitir el array completo de los 180 asientos de la aeronave (`FlightSeatsStatePayload`) a todos los sockets conectados tras cualquier clic o liberación.
* **Criterio y Corrección Técnica:** En una cabina de 180 asientos con 50 usuarios concurrentes, retransmitir el árbol completo en cada interacción satura el ancho de banda y dispara reflows innecesarios en el navegador. Se diseñó una arquitectura de **eventos delta de granularidad fina**: el gateway emite únicamente el asiento modificado (`seatId`, `status`, `lockedByUserId`), y el cliente Angular actualiza puntualmente dicho elemento en la señal `seats = signal<Seat[]>([])` en tiempo $O(1)$.

### 3.3. Prevención de Condición de Carrera (*TOCTOU*) en Bloqueos Concurrentes
* **Propuesta Inicial de la IA:** Planteó una verificación secuencial estándar: consultar si el asiento estaba libre en base de datos (`find`) y, si era afirmativo, actualizar su estado a bloqueado (`save`).
* **Criterio y Corrección Técnica:** Modelo vulnerable a *Time-of-Check to Time-of-Use (TOCTOU)* ante milisegundos de concurrencia real (dos usuarios presionando el mismo asiento simultáneamente). Se implementó el comando primitivo atómico de Redis:
  ```bash
  SET flight:DV-204:seat:12B:lock "user_id" NX PX 300000
  ```
  Al ser una operación atómica de un solo ciclo en Redis, solo una petición tiene éxito (`OK`), mientras que la segunda es rechazada instantáneamente devolviendo un evento `seat:lock_failed` con motivo `DOUBLE-BOOKING PREVENTED`.

### 3.4. Consistencia Transaccional ACID y Eliminación del Problema N+1
* **Propuesta Inicial de la IA:** Al confirmar la compra de una reserva con múltiples pasajeros, ejecutaba actualizaciones individuales en bucle dentro de un `for` hacia la base de datos sin contexto transaccional.
* **Criterio y Corrección Técnica:** Si la actualización del segundo asiento fallaba (por ejemplo, desconexión de red o timeout), el primer asiento quedaba pagado pero la reserva quedaba huérfana y el dinero debitado sin emitir el tiquete. Se refactorizó usando `QueryRunner` de TypeORM para envolver toda la operación en una transacción ACID estricta (`startTransaction`, `commitTransaction`, `rollbackTransaction`), ejecutando consultas agrupadas (batch) para eliminar por completo el problema de consultas $N+1$.

### 3.5. Supresión de Toasts Intrusivos en Cabina de Tiempo Real
* **Propuesta Inicial de la IA:** Cada vez que el gateway notificaba un bloqueo o liberación, disparaba un banner toast flotante en la pantalla de todos los usuarios conectados.
* **Criterio y Corrección Técnica:** En horas pico con decenas de personas reservando al mismo tiempo, la pantalla del cliente se saturaba de popups intrusivos e ilegibles. Se rediseñó la experiencia de usuario: los cambios de estado de terceros se comunican de forma **silenciosa y elegante mediante transiciones cromáticas en el mapa** (verde $\rightarrow$ ámbar pulsante $\rightarrow$ gris), reservando los toasts exclusivamente para acciones directas del usuario logueado o errores de colisión.

### 3.6. Anonimización de Datos Personales (PII) en Tooltips de Asientos
* **Propuesta Inicial de la IA:** Mostraba en el tooltip público del mapa de asientos el identificador o nombre completo del usuario que bloqueaba el asiento (*"Bloqueado por Carlos Mendoza"*).
* **Criterio y Corrección Técnica:** Violación de principios bancarios de privacidad de datos personales (PII) y seguridad de la información. Se implementó una lógica de visualización contextual: el propietario ve *"Tu Asiento (Bloqueado)"*, mientras que cualquier otro usuario conectado ve únicamente *"Asiento reservado temporalmente"*.

---

## 4. Impacto Cuantitativo y Cualitativo

| Dimensión | Estimación Sin IA | Con Asistencia de IA + Criterio | Impacto Logrado |
| :--- | :---: | :---: | :---: |
| **Tiempo de Desarrollo Total** | ~18 - 20 horas | ~6.5 horas | **~65% de aceleración** |
| **Generación de Contratos Tipados (`shared/`)** | 3.5 horas | 40 minutos | Reducción de discrepancias DTO frontend-backend a cero |
| **Suite de Pruebas Unitarias (119 tests)** | 6 horas | 1.5 horas | Cobertura integral en 6 suites de backend y 8 de frontend |
| **Documentación y Diagramas Mermaid** | 3 horas | 35 minutos | Documentación técnica exhaustiva con trazabilidad formal |

### Dónde el Criterio Humano fue Innegociable:
1. **Seguridad y Resiliencia Bancaria:** Aseguramiento de expiración del inventario en Redis, validaciones de token/identidad y prevención de transacciones huérfanas.
2. **Control Fino de Rendimiento:** Selección de la arquitectura de señales en Angular 18 frente al antipatrón de re-renderizado total de la cabina.
3. **Experiencia de Usuario de Grado Financiero:** Anonimización de datos privados, diseño limpio inspirado en la identidad institucional de Davivienda y eliminación de ruidos visuales en tiempo real.

---

## 5. Conclusiones

La Inteligencia Artificial fungió como un **acelerador de ingeniería de alto impacto** para tareas operativas, tipado estricto, generación de mocks y documentación formal. No obstante, la solidez, robustez concurrente y elegancia de la solución final radicaron en la **capacidad del Líder Técnico para cuestionar, auditar y rediseñar** las propuestas iniciales de la IA hacia estándares de confiabilidad bancaria.
