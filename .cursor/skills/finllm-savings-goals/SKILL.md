<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->

---
name: finllm-savings-goals
description: >-
  Metas de ahorro y fondo de emergencia usando saldos y gasto del ledger FinLLM
  — plazos, montos objetivo y seguimiento sin inventar progreso. Usar para
  ahorrar más, fondo de emergencia, meta de compra o reducir deuda visible en
  pasivos.
---

# Metas de ahorro (FinLLM)

## Cuándo usar

- Fondo de emergencia, meta de compra, ahorro mensual, “¿cuánto puedo apartar?”
- Seguimiento de **cuentas de ahorro** o pasivos (deuda) en el plan de cuentas

## Datos

1. `get_balances` — activos líquidos, pasivos, patrimonio neto.
2. `list_accounts` — cuentas ASSET (ahorro), LIABILITY (deuda).
3. Gasto mensual de referencia: derivar de `finllm-spending-insights` (último mes completo) o preguntar al usuario si el ledger no refleja gasto de vida real (efectivo no registrado).

## Metodología

### Fondo de emergencia

1. Estimar **gasto esencial mensual** (del ledger o declarado por el usuario).
2. Meta típica: 3–6 × ese gasto (explicar como rango, no mandato).
3. Comparar con saldo en cuentas ASSET marcadas como ahorro/efectivo (`list_accounts`).
4. Brecha = meta − saldo actual (solo si ambos números están definidos).

### Meta con fecha

1. Usuario define **monto objetivo** y **fecha**.
2. Meses restantes → ahorro mensual ≈ brecha / meses (enteros, redondeo conservador).
3. Contrastar con superávit observado (ingreso − gasto en ledger) si existe; si no, preguntar capacidad de ahorro.

### Deuda (pasivos)

1. Saldos LIABILITY desde `get_balances`.
2. Preguntar tasa/interés solo como contexto del usuario (no calcular amortización legal/fiscal).
3. Priorización: usuario elige avalancha vs bola de nieve; el coach lista opciones sin juzgar.

## Preguntas útiles

- ¿Esta meta es **flexible** en fecha o **fija** (boda, colegiatura)?
- ¿El dinero debe estar **líquido** o puede estar en inversión (`finllm-investments` — solo lectura)?
- ¿Qué cuenta del libro es el “sobre” de ahorro oficial?

## Seguimiento en sesiones futuras

Al reabrir el tema:

1. Volver a `get_balances` en la cuenta objetivo.
2. Comparar con cifra de la sesión anterior **solo si** la diste tú con datos de esa sesión.
3. Celebrar avance o replantear meta sin culpa.

## Límites

- No prometer rendimientos de inversión.
- No sustituir planificación fiscal → `finllm-taxes-advisory`.
- Registrar traspasos al ahorro en ledger solo con `finllm-ledger-mutations` + confirmación.

## Enlace

Para hábitos y preguntas de comportamiento → `finllm-financial-coach`.
