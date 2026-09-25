# Documento de Uso de Inteligencia Artificial (IA)

> **Rol:** Especialista Desarrollador Líder Técnico  
> **Proyecto:** Sistema de Reservas de Vuelos en Tiempo Real  
> **Metodología:** Desarrollo Asistido por IA & Spec-Driven Engineering (`tlc-spec-driven`)

---

## 1. Herramientas de IA Utilizadas

| Herramienta / Modelo | Versión / Variante | Rol / Caso de Uso |
| :--- | :--- | :--- |
| **Antigravity AI (Google DeepMind)** | Gemini 3.8 Flash / Pro | Orquestación general, arquitectura, implementación guiada por especificaciones y revisión de código. |
| **Tech Lead's Club Agent Skills** | `tlc-spec-driven` v3.3.0 | Framework de desarrollo Spec-Driven, validación determinista de especificaciones, contratos EARS y gobernanza de decisiones. |

---

## 2. Prompts y Casos de Uso

A continuación se presentan los prompts clave empleados en el ciclo de vida del proyecto:

### 2.1. Definición y Análisis de Requisitos (Spec-Driven)
* **Prompt:**  
  > *"Analiza los requisitos de la prueba técnica para el rol de Tech Lead en Davivienda (tiempo real, concurrencia, bloqueo temporal de asientos, prevención de double-booking). Modela las especificaciones formales usando notación EARS y desglosa los criterios de aceptación deterministas."*
* **Resultado:** Matriz de especificación con trazabilidad de eventos de tiempo real (`seat:locked`, `seat:released`, `seat:booked`).

### 2.2. Diseño de Arquitectura y Manejo de Concurrencia
* **Prompt:**  
  > *"Diseña la estrategia de control de concurrencia para evitar double-booking ante selecciones simultáneas en el mismo milisegundo. Evalúa Mutex en memoria con TTL vs Redis Distributed Lock, justificando la decisión para un prototipo modular escalable."*
* **Resultado:** Diagrama Mermaid de flujo y mecanismo de bloqueo atómico con expiración automática sin dependencia de timers del cliente.

### 2.3. Generación de Contratos Compartidos (`shared/`)
* **Prompt:**  
  > *"Genera los contratos TypeScript unificados (DTOs, Enums y Eventos de WebSocket) para compartir entre backend y frontend en un monorepo, asegurando tipado estricto extremo."*
* **Resultado:** Paquete `shared` con DTOs inmutables y payloads tipados de punta a punta.

---

## 3. Refactorización y Criterio Propio

Casos concretos donde las sugerencias iniciales de la IA fueron corregidas o refinadas mediante criterio técnico humano:

1. **Gestión de Expiración del Bloqueo Temporal:**
   - *Respuesta inicial de la IA:* Propuso gestionar el temporizador de 5-10 minutos en el cliente frontend (`setTimeout` en Angular) y notificar al backend cuando expirara.
   - *Criterio y corrección técnica:* **Anti-patrón de seguridad y consistencia.** Si el cliente cierra el navegador, pierde la red o adultera el temporizador, el asiento queda bloqueado indefinidamente. Se refactorizó para que el **backend sea la única fuente de verdad**, orquestando un TTL autónomo con limpieza y emisión global del evento `seat:released`.

2. **Alcance de la Reactividad en el Frontend:**
   - *Respuesta inicial de la IA:* Proponía re-emitir el estado completo de la aeronave (`FlightSeatsState`) a todos los clientes conectados en cada clic.
   - *Criterio y corrección técnica:* Ineficiente a nivel de red y memoria ante cientos de clientes concurrentes. Se ajustó a un patrón de **eventos delta de granularidad fina** (`SeatStateUpdatedEvent`), combinando en Angular con **Signals** para mutar únicamente el nodo del asiento afectado en el DOM sin re-renderizar la cabina.

3. **Arquitectura de Concurrencia (Prevención de Race Conditions):**
   - *Respuesta inicial de la IA:* Verificación no atómica estándar (`if (seat.status === 'AVAILABLE') { seat.status = 'LOCKED'; }`).
   - *Criterio y corrección técnica:* Susceptible a condición de carrera (*time-of-check to time-of-use - TOCTOU*). Se implementó una **operación de adquisición atómica garantizada** en memoria.

---

## 4. Impacto y Eficiencia

* **Tiempo Ahorrado Estimado:** ~50% a 60% en tareas operativas y boilerplate.
* **Áreas de Mayor Valor Aportado:**
  1. **Scaffolding y Contratos:** Creación acelerada de DTOs, interfaces tipadas y configuración de monorepo.
  2. **Verificación Determinista:** Aplicación rigurosa de metodologías Spec-Driven (`tlc-spec-driven`).
  3. **Documentación Técnica:** Generación asistida de diagramas Mermaid y documentación arquitectónica de alto nivel.
