# 🤖 AGENTS.md — Kashy Backend

> **Este archivo es el punto de entrada para cualquier IA o desarrollador.**
> Antes de escribir una sola línea de código, lee este archivo para saber qué documentos consultar según la tarea.

---

## Regla Principal

Toda IA que trabaje en este proyecto **debe** seguir esta secuencia:

1. **Leer este archivo** para entender qué documentos existen.
2. **Leer `project-brief.md`** para entender el proyecto.
3. **Consultar el documento específico** según la tarea a realizar.
4. **Consultar la skill correspondiente** antes de generar código.

> Nunca generar código sin haber leído al menos `project-brief.md` + el documento de la tarea + la skill relevante.

---

## 📁 Estructura del Contexto

```
.context/
├── AGENTS.md                          ← Estás aquí
├── guidelines/
│   ├── project-brief.md               ← Leer SIEMPRE primero
│   ├── architecture.md
│   ├── database.md
│   ├── api-routes.md
│   ├── business-rules.md
│   ├── external-services.md
│   └── router/
│       ├── authentication.md
│       ├── shopping-lists.md
│       ├── finances.md
│       └── notifications.md
└── skills/
    ├── nestjs-clean-architecture/
    │   ├── SKILL.md
    │   └── references/
    └── nodejs-runtime-expert/
        ├── SKILL.md
        └── references/
```

---

## 📋 Guidelines — Documentos del Proyecto

### Siempre leer primero

| Documento         | Ruta                          | Descripción                                                                                                                               |
| :---------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Project Brief** | `guidelines/project-brief.md` | Resumen del proyecto, stack tecnológico, alcance del MVP y reglas de negocio generales. **Lectura obligatoria antes de cualquier tarea.** |

### Consultar según la tarea

| Documento             | Ruta                              | Cuándo consultarlo                                                                                                                                                                                         |
| :-------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**      | `guidelines/architecture.md`      | Al crear módulos, carpetas, archivos, entidades, repositorios, controllers o cualquier componente del proyecto. Define la estructura de carpetas exacta, convenciones de nombrado y reglas de dependencia. |
| **Database**          | `guidelines/database.md`          | Al crear migraciones, entidades TypeORM, queries, relaciones o al modificar el esquema de BD. Contiene todas las tablas, campos, tipos y relaciones.                                                       |
| **API Routes**        | `guidelines/api-routes.md`        | Al crear o modificar endpoints. Contiene convenciones generales: estructura de URL, headers obligatorios, paginación, catálogo de errores estandarizado y convenciones de respuesta.                       |
| **Business Rules**    | `guidelines/business-rules.md`    | Al implementar lógica de cálculos, monedas, conversiones, IVA, exchange rate, totales de listas o balance financiero. Contiene todas las fórmulas y reglas de negocio.                                     |
| **External Services** | `guidelines/external-services.md` | Al integrar Firebase Auth, FCM, RabbitMQ o DolarAPI. Contiene endpoints, flujos, variables de entorno y cómo se conecta cada servicio.                                                                     |

### Endpoints por servicio

| Documento          | Ruta                                  | Cuándo consultarlo                                                                                                                                                              |
| :----------------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Authentication** | `guidelines/router/authentication.md` | Al trabajar en registro, login, Google auth, refresh token, cambio de contraseña, perfil o logout. Incluye el flujo completo de JWT custom + Firebase refresh token en backend. |
| **Shopping Lists** | `guidelines/router/shopping-lists.md` | Al trabajar en CRUD de listas de compras, items en batch o la comparadora de métricas entre listas.                                                                             |
| **Finances**       | `guidelines/router/finances.md`       | Al trabajar en CRUD de ingresos/egresos, recurrencia automática, recordatorios o el summary del dashboard.                                                                      |
| **Notifications**  | `guidelines/router/notifications.md`  | Al trabajar en listado de notificaciones, lectura (individual/masiva), eliminación o preferencias de notificación.                                                              |

---

## 🧠 Skills — Guías Genéricas de Código

Las skills son guías reutilizables que aplican a cualquier proyecto. Definen **cómo** escribir código, mientras que los guidelines definen **qué** escribir para Kashy.

### NestJS Clean Architecture

| Archivo              | Ruta                                                              | Cuándo consultarlo                                                                                                                                                                                                                   |
| :------------------- | :---------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SKILL.md**         | `skills/nestjs-clean-architecture/SKILL.md`                       | Al crear cualquier componente: módulos, entidades, repositorios, use cases, controllers, DTOs, adapters. Define las capas (domain, application, infrastructure), reglas de dependencia, shared-kernel y comunicación entre dominios. |
| **Command Patterns** | `skills/nestjs-clean-architecture/references/command-patterns.md` | Al crear use cases que modifican estado: create, update, delete, complete, toggle, duplicate.                                                                                                                                        |
| **Query Patterns**   | `skills/nestjs-clean-architecture/references/query-patterns.md`   | Al crear use cases de lectura: getById, list, paginated, stats, compare. Incluye el patrón de Mapper.                                                                                                                                |
| **Test Criteria**    | `skills/nestjs-clean-architecture/references/test-criteria.md`    | Al validar que el código generado cumple con la arquitectura. Checklist de 10 puntos y 7 test cases de aceptación.                                                                                                                   |

### Node.js Runtime Expert

| Archivo               | Ruta                                                           | Cuándo consultarlo                                                                                                                                 |
| :-------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SKILL.md**          | `skills/nodejs-runtime-expert/SKILL.md`                        | Al escribir cualquier código Node.js/TypeScript. Define convenciones ES6+, principios de error handling, async/await patterns y graceful shutdown. |
| **Error Patterns**    | `skills/nodejs-runtime-expert/references/error-patterns.md`    | Al implementar manejo de errores: jerarquía de excepciones, propagación por capas, error boundaries, validación de input, unhandled rejections.    |
| **External Services** | `skills/nodejs-runtime-expert/references/external-services.md` | Al integrar servicios externos: timeout, retry con backoff, circuit breaker, fallback y cache.                                                     |
| **Performance**       | `skills/nodejs-runtime-expert/references/performance.md`       | Al diagnosticar o prevenir problemas de rendimiento: event loop blocking, memory leaks, connection pooling, worker threads y monitoreo.            |

---

## 🗺 Mapa de Tareas → Documentos

| Tarea                              | Documentos a consultar                                                                     |
| :--------------------------------- | :----------------------------------------------------------------------------------------- |
| Crear un nuevo módulo/dominio      | `project-brief.md` → `architecture.md` → `nestjs-clean-architecture/SKILL.md`              |
| Crear un endpoint nuevo            | `api-routes.md` → `router/{servicio}.md` → `architecture.md` → skill de clean architecture |
| Crear una entidad/migración        | `database.md` → `architecture.md` → `command-patterns.md`                                  |
| Implementar un caso de uso         | `architecture.md` → `command-patterns.md` o `query-patterns.md` según el tipo              |
| Integrar un servicio externo       | `external-services.md` → `nodejs-runtime-expert/references/external-services.md`           |
| Implementar lógica de cálculos     | `business-rules.md` → `nodejs-runtime-expert/SKILL.md`                                     |
| Implementar autenticación/refresh  | `router/authentication.md` → `external-services.md` (Firebase)                             |
| Crear notificaciones/recordatorios | `router/finances.md` → `router/notifications.md` → `external-services.md` (RabbitMQ + FCM) |
| Resolver un bug de performance     | `nodejs-runtime-expert/references/performance.md`                                          |
| Resolver un error de runtime       | `nodejs-runtime-expert/references/error-patterns.md`                                       |
| Validar código generado            | `nestjs-clean-architecture/references/test-criteria.md`                                    |

---

## ⚠️ Reglas para la IA

1. **No inventar.** Si algo no está documentado en estos archivos, preguntar antes de asumir.
2. **No contradecir.** Si el código a generar contradice algún documento, el documento gana.
3. **No mezclar dominios.** Los módulos nunca se importan entre sí. Consultar `architecture.md` para la regla de comunicación entre dominios.
4. **No silenciar errores.** Consultar `nodejs-runtime-expert/SKILL.md` para las reglas de error handling.
5. **Validar al final.** Antes de entregar código, pasar el checklist de `test-criteria.md`.
6. **Output: código directo + breve "Por qué".** Toda respuesta debe incluir el código solicitado seguido de una explicación breve citando el documento de `.context/` que respalda la decisión. Ejemplo: _"Estructura basada en `guidelines/architecture.md`, patrón Create de `skills/nestjs-clean-architecture/references/command-patterns.md`."_
