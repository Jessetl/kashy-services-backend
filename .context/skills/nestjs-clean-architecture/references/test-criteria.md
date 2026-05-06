# Test Criteria — Criterios de Aceptación

> Test cases para validar que el código generado cumple con la arquitectura.
> Usar como checklist al revisar código generado por cualquier IA.

---

## TC-1: Ubicación Correcta por Capa

**Prompt:** "Crea un módulo de órdenes con entidad, repositorio, caso de uso y endpoint REST."

**Criterios:**

- Entidad en `domain/entities/` sin imports de `@nestjs/`, `typeorm`, `class-validator`.
- Interfaz `IOrderRepository` en `domain/interfaces/repositories/` con `Symbol` token.
- Use case en `application/use-cases/`, implementa `UseCase<Input, Output>`, recibe repo vía `@Inject(TOKEN)`.
- DTO en `application/dtos/` con decoradores de `class-validator`.
- Repositorio concreto en `infrastructure/repositories/`, implementa la interfaz.
- Controller en `infrastructure/controllers/`, solo delega al use case.
- Module conecta interfaz → implementación con `{ provide: TOKEN, useClass: Impl }`.

---

## TC-2: Aislamiento entre Módulos

**Prompt:** "El módulo de órdenes necesita validar que el usuario existe antes de crear una orden."

**Criterios:**

- Órdenes NO importa `UsersModule` ni archivos de `src/modules/users/` directamente.
- Se define interfaz `IUserLookup` en `shared-kernel/` o en `domain/interfaces/services/` del consumidor.
- Users provee implementación de `IUserLookup`.
- Conexión vía DI tokens, no imports directos.
- Alternativa: evento de dominio o message pattern.

---

## TC-3: Regla de Dependencia

**Prompt:** "Agrega un servicio para calcular el total con descuentos por volumen."

**Criterios:**

- Lógica de cálculo es función pura o domain service en `domain/services/`.
- No usa `@Injectable()`, ni `fetch`, ni side effects.
- Si descuentos vienen de fuente externa, se obtienen vía interfaz de repositorio.
- Use case orquesta: obtener datos → calcular con domain service → persistir.
- Controller NO contiene lógica de cálculo.

---

## TC-4: Inyección de Dependencias y Testabilidad

**Prompt:** "Crea GetUserByIdUseCase testeable con mocks."

**Criterios:**

- Recibe `IUserRepository` vía `@Inject(USER_REPOSITORY)`.
- Instanciable en test: `new GetUserByIdUseCase(mockRepo)`.
- Test NO requiere levantar módulo NestJS completo.
- Test verifica caso exitoso y caso "no encontrado".

---

## TC-5: Preparación para Microservicios

**Prompt:** "Prepara el módulo de notificaciones como microservicio con RabbitMQ."

**Criterios:**

- Dominio y use cases NO cambian respecto a versión monolítica.
- Adaptador de entrada en `infrastructure/` escucha RabbitMQ con `@EventPattern()`.
- Controller HTTP se mantiene opcional.
- Configuración de transporte en infraestructura, no en dominio.
- Alternar monolito/microservicio cambiando solo `main.ts` y root module.

---

## TC-6: Manejo de Errores por Capas

**Prompt:** "Implementa manejo de errores para crear un producto."

**Criterios:**

- Excepciones de dominio en `domain/exceptions/`, NO extienden `HttpException`.
- Use case lanza excepciones de dominio.
- `DomainExceptionFilter` en `shared-kernel/filters/` traduce a HTTP.
- Controller NO tiene try/catch.
- DTOs inválidos se rechazan vía `ValidationPipe` antes del use case.

---

## TC-7: Código Generado Compila

**Prompt:** Cualquier código generado por la skill.

**Criterios:**

- Compila sin errores de tipos (tsconfig strict).
- Imports correctos con rutas relativas válidas.
- Decoradores de NestJS solo en capas permitidas (application e infraestructura).
- Tipos de retorno explícitamente declarados.

---

## Checklist Rápido

Antes de dar por terminado cualquier código generado, verificar:

| #   | Verificación                                                         | ✅  |
| :-- | :------------------------------------------------------------------- | :-: |
| 1   | ¿La entidad tiene 0 imports de frameworks?                           |     |
| 2   | ¿La interfaz del repositorio tiene `Symbol` token?                   |     |
| 3   | ¿El use case recibe repositorios vía `@Inject(TOKEN)`?               |     |
| 4   | ¿El use case retorna DTO, no entidad?                                |     |
| 5   | ¿El controller solo delega al use case?                              |     |
| 6   | ¿El controller no tiene try/catch?                                   |     |
| 7   | ¿Las excepciones son de dominio, no HttpException?                   |     |
| 8   | ¿Ningún dominio importa de otro dominio directamente?                |     |
| 9   | ¿El input del use case incluye `userId` para ownership?              |     |
| 10  | ¿El module conecta interfaz → implementación con `provide/useClass`? |     |
