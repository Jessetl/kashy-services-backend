# 📐 Business Rules — Kashy

> Reglas de negocio para monedas, conversiones, cálculos financieros e IVA.
> Cualquier IA o desarrollador debe consultar este archivo antes de implementar lógica de cálculos o manipulación de montos.

---

## 💱 Moneda y Tasa de Cambio

### Reglas generales

| Regla                    | Detalle                                                                                                    |
| :----------------------- | :--------------------------------------------------------------------------------------------------------- |
| **Moneda local MVP**     | Bolívar (VES).                                                                                             |
| **Moneda de referencia** | Dólar estadounidense (USD).                                                                                |
| **Fuente de tasa**       | DolarAPI — tasa oficial BCV (`/v1/dolares/oficial`).                                                       |
| **Dual currency**        | Todo monto se almacena en moneda local **y** en USD.                                                       |
| **Quién calcula**        | El frontend calcula la conversión para UX inmediata. El backend valida la conversión al recibir los datos. |

### Regla de validación en backend

El backend recibe `amount_local`, `amount_usd` y la tasa de cambio. Al validar, aplica una tolerancia de ±1% para cubrir diferencias por redondeo o microsegundos de desfase en la tasa.

```
expected_usd = amount_local / exchange_rate
tolerance = expected_usd * 0.01

if abs(amount_usd - expected_usd) > tolerance:
    return 422 "Los montos no son consistentes con la tasa de cambio"
```

> Si la validación falla, el backend devuelve `422 Unprocessable Entity` con el detalle del campo inconsistente. Nunca corrige silenciosamente — el frontend debe enviar valores coherentes.

### Escalabilidad multi-país (Post-MVP)

| Campo           | Propósito                                                       |
| :-------------- | :-------------------------------------------------------------- |
| `country_code`  | Determina la moneda local y las reglas fiscales del usuario.    |
| `currency_code` | Código ISO de la moneda local (ej: `VES`, `ARS`, `COP`, `CLP`). |

Cuando se agreguen nuevos países, la fuente de tasa de cambio se resuelve por `country_code`:

| País         | Moneda | Fuente                 |
| :----------- | :----- | :--------------------- |
| 🇻🇪 Venezuela | VES    | DolarAPI — BCV oficial |
| 🇦🇷 Argentina | ARS    | Por definir (Post-MVP) |
| 🇨🇴 Colombia  | COP    | Por definir (Post-MVP) |
| 🇨🇱 Chile     | CLP    | Por definir (Post-MVP) |

> DolarAPI ya soporta Argentina, Colombia y Chile. Se puede reutilizar como proveedor para el Post-MVP.

---

## 🧾 IVA (Impuesto al Valor Agregado)

### Reglas del MVP

| Regla                  | Detalle                                                                          |
| :--------------------- | :------------------------------------------------------------------------------- |
| **Tasa IVA Venezuela** | 16% fijo.                                                                        |
| **Aplica a**           | Listas de compras (`shopping_lists`).                                            |
| **Activación**         | Campo `iva_enabled` en la lista. Si es `true`, el IVA se calcula sobre el total. |
| **Cálculo**            | El IVA se calcula sobre la suma de los items, no por item individual.            |
| **Almacenamiento**     | El IVA no se almacena como campo — se calcula al mostrar.                        |

### Fórmulas

```
subtotal_local = Σ (unit_price_local × quantity) para cada item
iva_amount_local = subtotal_local × 0.16  (si iva_enabled = true, sino 0)
total_local = subtotal_local + iva_amount_local

subtotal_usd = Σ (unit_price_usd × quantity) para cada item
iva_amount_usd = subtotal_usd × 0.16  (si iva_enabled = true, sino 0)
total_usd = subtotal_usd + iva_amount_usd
```

### Escalabilidad multi-país (Post-MVP)

| País         | IVA |
| :----------- | :-- |
| 🇻🇪 Venezuela | 16% |
| 🇦🇷 Argentina | 21% |
| 🇨🇴 Colombia  | 19% |
| 🇨🇱 Chile     | 19% |

> Cuando se agreguen países, la tasa de IVA se resuelve por `country_code`. Considerar una tabla de configuración `tax_rates` en el Post-MVP.

---

## 📸 Exchange Rate Snapshot

### Reglas

| Regla                 | Detalle                                                                                                              |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Cuándo se captura** | Al momento de crear la lista de compras.                                                                             |
| **Inmutable**         | Una vez creada la lista, el `exchange_rate_snapshot` **no cambia**, ni siquiera si se edita la lista.                |
| **Propósito**         | Garantizar que las comparaciones entre listas reflejen la tasa vigente al momento de cada compra, no la tasa actual. |
| **Fuente**            | Campo `promedio` del endpoint `/v1/dolares/oficial` de DolarAPI.                                                     |

### ¿Por qué es inmutable?

Si dos listas se crearon en fechas diferentes con tasas diferentes, la comparadora debe reflejar lo que el usuario realmente pagó en cada momento. Si el snapshot se actualizara, se perderían los precios reales y las métricas serían incorrectas.

---

## 💰 Registros Financieros — Cálculos

### Ingreso de montos

| Regla                     | Detalle                                                                     |
| :------------------------ | :-------------------------------------------------------------------------- |
| **Quién elige la moneda** | El usuario elige si ingresa en VES o USD.                                   |
| **Conversión**            | El frontend calcula el monto en la otra moneda usando la tasa actual.       |
| **Almacenamiento**        | Se guardan ambos: `amount_local` y `amount_usd`.                            |
| **Validación backend**    | El backend valida la consistencia entre ambos montos con tolerancia de ±1%. |

### Balance mensual

```
total_income_local = Σ amount_local donde type = INCOME y date dentro del mes
total_expense_local = Σ amount_local donde type = EXPENSE y date dentro del mes
net_balance_local = total_income_local - total_expense_local

total_income_usd = Σ amount_usd donde type = INCOME y date dentro del mes
total_expense_usd = Σ amount_usd donde type = EXPENSE y date dentro del mes
net_balance_usd = total_income_usd - total_expense_usd
```

> El balance se calcula siempre sobre registros del mes consultado. Incluye registros recurrentes ya generados.

### Recurrencia

| Regla                  | Detalle                                                                                                |
| :--------------------- | :----------------------------------------------------------------------------------------------------- |
| **Día de recurrencia** | `recurrence_day` (1-31). Si el mes tiene menos días, se usa el último día del mes.                     |
| **Generación**         | Cron job diario genera el registro del mes siguiente cuando `recurrence_day` del mes actual ha pasado. |
| **Monto**              | Se copia `amount_local` y `amount_usd` del registro original. No se recalcula con tasa actual.         |
| **Notificación**       | Se crea automáticamente una notificación 1 día antes de la fecha del nuevo registro.                   |

### Prioridad

| Valor    | Uso sugerido                                                        |
| :------- | :------------------------------------------------------------------ |
| `HIGH`   | Gastos críticos: alquiler, servicios, deudas.                       |
| `MEDIUM` | Gastos importantes pero postergables: suscripciones, seguros.       |
| `LOW`    | Gastos opcionales: entretenimiento, compras no esenciales.          |
| `null`   | Sin prioridad asignada (ingresos generalmente no tienen prioridad). |

### Tasa de interés

| Regla        | Detalle                                                                             |
| :----------- | :---------------------------------------------------------------------------------- |
| **Campo**    | `interest_rate` (Decimal, nullable).                                                |
| **Uso**      | Informativo para el usuario. Aplica a egresos tipo deuda/préstamo.                  |
| **Cálculo**  | El MVP no calcula interés compuesto ni proyecciones. Es solo un dato de referencia. |
| **Post-MVP** | La IA de plan de ahorro usará este campo para proyecciones financieras.             |

---

## 🛒 Listas de Compras — Cálculos

### Totales de una lista

```
subtotal_local = Σ (unit_price_local × quantity) para items con is_checked = true
subtotal_usd = Σ (unit_price_usd × quantity) para items con is_checked = true

// Solo si iva_enabled = true
iva_local = subtotal_local × 0.16
iva_usd = subtotal_usd × 0.16

total_local = subtotal_local + iva_local
total_usd = subtotal_usd + iva_usd
```

> Los totales se calculan solo sobre items marcados como comprados (`is_checked = true`).

### Comparadora de listas

| Regla                          | Detalle                                                                                                                                                       |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Match de productos**         | Por `product_name` (case-insensitive, trim).                                                                                                                  |
| **Diferencia de precio**       | Se calcula tanto en moneda local como en USD.                                                                                                                 |
| **Cada lista con su snapshot** | Cada lista usa su propio `exchange_rate_snapshot`. Las comparaciones en USD son directas. Las comparaciones en local son relativas al momento de cada compra. |
| **Recomendación**              | El campo `recommended` indica cuál lista es más económica basándose en la suma de precios USD de los productos que hicieron match.                            |

---

## 📌 Reglas Transversales

| Regla                  | Detalle                                                                       |
| :--------------------- | :---------------------------------------------------------------------------- |
| **Decimales**          | Todos los montos se almacenan con 2 decimales.                                |
| **Redondeo**           | Redondeo estándar (half-up): 0.005 → 0.01.                                    |
| **Montos negativos**   | No permitidos. Todos los montos son >= 0.                                     |
| **Moneda por defecto** | Si el usuario no especifica `currency_code`, se infiere de su `country_code`. |
| **Zona horaria**       | Todas las fechas en UTC. El frontend convierte a la zona horaria del usuario. |
