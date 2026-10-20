<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-spending-insights
description: >-
  Análisis de patrones de gasto e ingreso desde el ledger FinLLM — categorías
  (cuentas EXPENSE), tendencias, recurrentes y comparación de periodos. Usar para
  analizar gastos, dónde se va el dinero, gastos hormiga, top categorías o
  diagnóstico de cashflow.
---

# Insights de gasto (FinLLM)

## Definiciones (producto)

- **Gasto:** movimientos en cuentas **EXPENSE** (debit − credit en libro), excluyendo **transferencias** entre activos propios (`docs/calculations.md`).
- **Ingreso:** cuentas **INCOME** (lógica inversa).
- Solo transacciones **POSTED** cuentan.

## Herramientas

| Herramienta | Uso |
| ----------- | --- |
| `list_accounts` | Identificar cuentas EXPENSE/INCOME y nombres para el informe |
| `list_transactions` | Splits con `accountId`, `debitMinor`, `creditMinor`, `txnDate`, `description` |
| `get_balances` | Saldo acumulado en gasto (contexto; no sustituye sumar periodo) |

**Analytics REST (si el agente puede llamar API):**

- `GET /api/v1/analytics/expenses-by-category?fromDate=&toDate=`
- `GET /api/v1/analytics/net-worth-series?fromDate=&toDate=`

Preferir analytics para totales por categoría en un rango; MCP `list_transactions` no filtra por fecha en el servidor (filtrar en cliente o paginar con `limit` hasta 200).

## Flujo de análisis

### 1. Acotar

- Periodo: fechas ISO `YYYY-MM-DD` (default: mes en curso o el que pida el usuario).
- Moneda: libro único salvo que indiquen FX (`finllm-multi-currency-fx`).

### 2. Obtener datos

1. `list_accounts` → mapa `accountId` → `{ name, type, subtype }`.
2. `list_transactions` con `limit: 200` (repetir si el harness permite y hace falta más historia).
3. Filtrar splits donde `txnDate` ∈ periodo y cuenta es EXPENSE (o INCOME para ingreso).
4. Si hay API analytics y token REST: usar `expenses-by-category` para el mismo rango y **conciliar** con agregados manuales.

### 3. Agregar (sin float)

- Importes en **minor units** (strings); sumar con enteros (bigint) en razonamiento interno; mostrar al usuario en formato legible solo después de sumar.
- Por cuenta EXPENSE: gasto del periodo ≈ `debitMinor − creditMinor` por split (ajustar signo según convención del JSON devuelto).
- **Top categorías:** ordenar por monto absoluto del periodo.

### 4. Patrones a buscar

| Patrón | Señal en datos | Pregunta sugerida al usuario |
| ------ | ---------------- | ---------------------------- |
| Concentración | Una categoría > 40 % del gasto | ¿Es intencional (vivienda) o desbalance? |
| Recurrentes | Misma `description` o monto fijo mensual | ¿Sigue siendo necesario? |
| Gastos hormiga | Muchos montos pequeños en la misma cuenta | ¿Suma anual que valga la pena recortar? |
| Picos | Un día con varios débitos grandes | ¿Compra planificada o imprevisto? |
| Ingreso vs gasto | INCOME vs EXPENSE en el periodo | ¿Superávit o déficit en el libro? |

### 5. Entregar

```markdown
## Gastos — [periodo]
**Alcance:** [N] movimientos analizados; [limitación si truncaste en 200]

| Categoría (cuenta) | Monto | % del total |
| ------------------ | ----- | ----------- |
| … | … | … |

**Total gasto (periodo):** …

## Ingreso (si aplica)
…

## Observaciones
- …

## Para profundizar (coach)
Pasar a `finllm-financial-coach` con 2–3 preguntas sobre la fila que más impacte al usuario.
```

## Reglas

- Citar siempre el rango de fechas y si los datos pueden estar incompletos (límite MCP, sin import reciente).
- No reclasificar movimientos en chat; sugerir corregir **plan de cuentas** o asientos en producto.
- Transferencias entre cuentas propias: no contar como gasto.

## Combinación con web

La vista **Actividad** (filtros, gastos hormiga, drill-down desde gráficos) complementa MCP. Si el usuario ya usa la web, pedir que indiquen el periodo/filtro que ven para alinear la conversación.
