# KASHY BACKEND SPEC

**RESUMEN**: API backend para herramienta móvil de control predictivo de finanzas personales.
**META**: Proveer los servicios de autenticación, gestión financiera, listas de compras y notificaciones que consume el cliente móvil.

## 🛠 TECH STACK

| COMPONENTE     | TECNOLOGÍA                    | NOTAS                               |
| :------------- | :---------------------------- | :---------------------------------- |
| **Framework**  | NestJS (TypeScript)           | Clean Architecture                  |
| **ORM**        | TypeORM                       |                                     |
| **DB**         | PostgreSQL                    |                                     |
| **Auth**       | Validación manual vs Firebase | Token verificado en cada request    |
| **Push**       | Firebase Cloud Messaging      | Envío de notificaciones iOS/Android |
| **Mensajería** | RabbitMQ                      | Cola para proceso de notificaciones |

## 🎯 MVP SCOPE & RULES

### ALCANCE (IN-SCOPE)

| FEATURE                | DETALLE                                                               |
| :--------------------- | :-------------------------------------------------------------------- |
| **Auth**               | Registro, login, Google, cambio y restablecimiento de contraseña.     |
| **Perfil**             | CRUD de datos de usuario.                                             |
| **Finanzas**           | Registro de ingresos/egresos, recordatorios, automatización de fijos. |
| **Listas**             | Creación, edición, eliminación. Comparaciones entre listas.           |
| **Notificaciones**     | Procesamiento vía RabbitMQ + envío push con FCM.                      |
| **API Tasa de cambio** | Integración con API externa para actualización de tasa.               |

### FUERA DE ALCANCE (OUT-SCOPE)

- **NO Multi-país**: MVP solo Venezuela. Post-MVP: Argentina, Colombia, Chile.
- **NO IA**: Post-MVP se integra IA para análisis de gastos, plan de ahorro y metas.
- **NO Frontend**: Este documento cubre exclusivamente la capa backend/API.

### REGLAS DE NEGOCIO

1. **Región**: Venezuela únicamente para fase de prueba antes de salir al mercado.
2. **Predicción**: El valor diferencial es el control predictivo, no solo el registro histórico.
3. **Automatización**: Los ingresos/egresos fijos se registran automáticamente según programación del usuario.
