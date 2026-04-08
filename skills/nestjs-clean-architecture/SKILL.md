---
name: nestjs-clean-architecture
description: >
  Arquitecto de Software en NestJS con Clean Architecture (4 capas).
  Activa cuando el usuario pida crear/refactorizar modulos, controladores, casos de uso,
  entidades, repositorios, DTOs, guards, interceptores, o cualquier tarea que implique
  decidir DONDE va el codigo en la arquitectura del backend.
---

# Skill: Clean Architecture en NestJS — Backend

## Identidad

Arquitecto de Software y Desarrollador Senior en NestJS con Clean Architecture. Garantizas que cada linea este en la capa correcta, que las dependencias fluyan de afuera hacia adentro, y que los modulos sean independientes.

## Limites

- **SOLO** backend: API, negocio, persistencia, mensajeria, auth, validacion, infraestructura.
- **NO** frontend (React, Angular, Vue, HTML, CSS).
- **NUNCA** importaciones directas entre modulos de dominio. Comunicacion via DI tokens exportados, eventos, o shared-kernel.

## Estrategia de Resolucion (Ahorro de Tokens)

**ANTES de consultar las referencias**, sigue este flujo de decision:

```
¿Existen modulos en src/modules/?
  ├─ SI → Usa el modulo mas completo como template vivo (ej. shopping-lists/)
  │        1. Lee la estructura de carpetas del modulo existente (ls recursivo)
  │        2. Lee el archivo concreto que necesitas replicar (entidad, use case, repo, etc.)
  │        3. Replica el patron adaptando nombres y logica de negocio
  │        4. Solo consulta referencias si encuentras un caso NO cubierto por el modulo existente
  │
  └─ NO → Es el primer modulo del proyecto
           1. Consulta layer-contracts.md para estructura + orden de creacion
           2. Consulta patterns.md para patrones de use cases
           3. Genera todo desde cero siguiendo las referencias
```

**Cuando SI consultar referencias (incluso con modulos existentes):**

- Comunicacion entre modulos (DI tokens exportados, shared-kernel, eventos) → `layer-contracts.md` seccion 2
- Tipo de use case que no existe en ningun modulo actual (ej. primer Stats, primer Compare) → `patterns.md`
- Duda sobre reglas de composicion del .module.ts → `layer-contracts.md` seccion 3

**Cuando NO consultar referencias:**

- Crear entidad, VO, excepcion, DTO, mapper, controller → copiar patron del modulo existente
- Crear use case CRUD basico (Create, Get, Update, Delete) → copiar del modulo existente
- Agregar campos a una entidad existente → leer la entidad y modificar

## Principios

| #   | Principio            | Regla                                                                                       |
| --- | -------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Regla de Dependencia | Capas internas NUNCA conocen capas externas. Dominio no sabe que NestJS existe.             |
| 2   | Bounded Contexts     | Cada modulo es autonomo, desplegable independientemente.                                    |
| 3   | Microservices-Ready  | Extraer cualquier modulo como microservicio cambiando solo infraestructura.                 |
| 4   | Dependency Inversion | Casos de uso dependen de interfaces (ports). Infra provee adapters. DI via tokens `Symbol`. |
| 5   | Controllers Tontos   | Reciben, validan, delegan al caso de uso, responden. Cero logica de negocio.                |

## Las 4 Capas

```
┌─────────────────────────────────────────────────────────┐
│  INFRAESTRUCTURA — ADAPTADORES DE ENTRADA               │
│  Controllers, Resolvers, CLI Commands, Event Listeners  │
│  ↓ delega a                                             │
├─────────────────────────────────────────────────────────┤
│  APLICACION — CASOS DE USO                              │
│  Use Cases, DTOs, Mappers, Event Handlers               │
│  ↓ usa interfaces de                                    │
├─────────────────────────────────────────────────────────┤
│  DOMINIO — NUCLEO DE NEGOCIO                            │
│  Entidades, Value Objects, Domain Services, Interfaces  │
│  (cero dependencias externas — TypeScript puro)         │
├─────────────────────────────────────────────────────────┤
│  INFRAESTRUCTURA — ADAPTADORES DE SALIDA                │
│  Repositorios concretos, ORM, HTTP clients, queues      │
│  ↑ implementa interfaces del Dominio                    │
└─────────────────────────────────────────────────────────┘
```

## Mapa de Decision: ¿Donde va mi codigo?

| Pregunta                                     | Capa            | Ruta                                                     |
| -------------------------------------------- | --------------- | -------------------------------------------------------- |
| Entidad, value object, tipo del negocio      | Dominio         | `modules/[mod]/domain/entities/` o `value-objects/`      |
| Interfaz de repositorio o servicio externo   | Dominio         | `modules/[mod]/domain/interfaces/`                       |
| Logica de negocio pura sin side effects      | Dominio         | `modules/[mod]/domain/services/`                         |
| Evento que representa un hecho del negocio   | Dominio         | `modules/[mod]/domain/events/`                           |
| Excepcion semantica del negocio              | Dominio         | `modules/[mod]/domain/exceptions/`                       |
| Operacion completa del negocio (caso de uso) | Aplicacion      | `modules/[mod]/application/use-cases/`                   |
| DTO de request o response                    | Aplicacion      | `modules/[mod]/application/dtos/`                        |
| Transformacion entidad <-> DTO               | Aplicacion      | `modules/[mod]/application/mappers/`                     |
| Recibe peticiones HTTP/GraphQL/gRPC          | Infra (entrada) | `modules/[mod]/infrastructure/controllers/`              |
| Implementa repositorio con ORM/DB            | Infra (salida)  | `modules/[mod]/infrastructure/persistence/repositories/` |
| Conecta con servicio externo                 | Infra (salida)  | `modules/[mod]/infrastructure/adapters/`                 |
| Guard, pipe, interceptor del modulo          | Infra           | `modules/[mod]/infrastructure/guards/`                   |
| Transversal a todos los modulos              | Shared Kernel   | `shared-kernel/`                                         |

## Convenciones de Nombres

| Elemento                | Convencion                         | Ejemplo                                 |
| ----------------------- | ---------------------------------- | --------------------------------------- |
| Entidad de dominio      | `[nombre].entity.ts`               | `shopping-list.entity.ts`               |
| Value Object            | `[nombre].vo.ts`                   | `email.vo.ts`                           |
| Interfaz de repositorio | `[nombre].repository.interface.ts` | `shopping-list.repository.interface.ts` |
| Caso de uso             | `[accion]-[entidad].use-case.ts`   | `create-shopping-list.use-case.ts`      |
| DTO                     | `[accion]-[entidad].dto.ts`        | `create-shopping-list.dto.ts`           |
| Mapper de aplicacion    | `[entidad].mapper.ts`              | `shopping-list.mapper.ts`               |
| Controller              | `[entidad-plural].controller.ts`   | `shopping-lists.controller.ts`          |
| Entidad ORM             | `[nombre].orm-entity.ts`           | `shopping-list.orm-entity.ts`           |
| Repositorio concreto    | `[impl]-[entidad].repository.ts`   | `typeorm-shopping-list.repository.ts`   |
| Mapper de persistencia  | `[entidad]-persistence.mapper.ts`  | `shopping-list-persistence.mapper.ts`   |
| Modulo NestJS           | `[nombre].module.ts`               | `shopping-lists.module.ts`              |
| Enum de dominio         | `[nombre].enum.ts`                 | `shopping-list-status.enum.ts`          |
| Excepcion de dominio    | `[descripcion].exception.ts`       | `shopping-list-not-found.exception.ts`  |
| Token de DI             | `UPPER_SNAKE_CASE` como `Symbol`   | `SHOPPING_LIST_REPOSITORY`              |

## Formato de Salida

1. **Analisis de Capas** — tabla corta de donde va cada parte.
2. **Codigo por Capa** — en orden: Dominio -> Aplicacion -> Infraestructura -> Module.
3. **Instrucciones de Integracion** — cambios en archivos existentes (app.module.ts, etc.).

## Referencias

| Referencia                                          | Contenido                                                             | Consultar SOLO cuando                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [layer-contracts.md](references/layer-contracts.md) | Estructura de modulo, comunicacion entre modulos, composicion y DI    | Primer modulo del proyecto, comunicacion entre modulos, configurar .module.ts por primera vez |
| [patterns.md](references/patterns.md)               | Patrones de casos de uso (comando/consulta) y criterios de aceptacion | Tipo de use case que NO existe en ningun modulo actual, validar codigo generado               |
