import Decimal from 'decimal.js';

// Configure standard financial rounding: ROUND_HALF_UP (arithmetic rounding)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Sanitizes numeric input: guarantees non-negative, finite numbers.
 * Protects against negative values, NaN, null, and undefined.
 */
export function sanitizeNumericInput(val: unknown, fallback: number = 0): number {
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val) || val < 0) return fallback;
    return val;
  }
  if (typeof val === 'string') {
    const cleanStr = val.trim();
    if (!cleanStr) return fallback;
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }
  return fallback;
}

/**
 * Calculates Sales Closing Effectiveness (% Efectividad de Cierre de Ventas):
 * Formula: (attendedClients / visitedClients) * 100
 * Exact Decimal.js computation with ROUND_HALF_UP.
 */
export function calculateClosingRate(attendedClients: number, visitedClients: number): number {
  const attended = sanitizeNumericInput(attendedClients);
  const visited = sanitizeNumericInput(visitedClients);

  if (visited <= 0) return 0;
  if (attended <= 0) return 0;

  try {
    const rate = new Decimal(attended)
      .dividedBy(new Decimal(visited))
      .times(100)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return rate.toNumber();
  } catch {
    return 0;
  }
}

/**
 * Calculates General KPI Achievement (% Cumplimiento de Objetivo):
 * Formula: (real / meta) * 100
 */
export function calculatePercentage(real: number, meta: number): number {
  const r = sanitizeNumericInput(real);
  const m = sanitizeNumericInput(meta);

  if (m <= 0) return 0;
  if (r <= 0) return 0;

  try {
    const pct = new Decimal(r)
      .dividedBy(new Decimal(m))
      .times(100)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return pct.toNumber();
  } catch {
    return 0;
  }
}

/**
 * Calculates Cash Liquidity Ratio (% Divisas en Efectivo sobre Cobranza):
 * Formula: (divisas / collectionReal) * 100
 */
export function calculateCashRatio(divisas: number, collectionReal: number): number {
  const d = sanitizeNumericInput(divisas);
  const c = sanitizeNumericInput(collectionReal);

  if (c <= 0) return 0;
  if (d <= 0) return 0;

  try {
    const ratio = new Decimal(d)
      .dividedBy(new Decimal(c))
      .times(100)
      .toDecimalPlaces(1, Decimal.ROUND_HALF_UP);
    return ratio.toNumber();
  } catch {
    return 0;
  }
}

/**
 * Returns corporate semaphore color for KPI achievement:
 * Red: < 70%
 * Yellow: 70% - 90%
 * Green: > 90%
 * Black: Critical warning (< 45% when meta > 0)
 */
export function getCorporateSemaphoreColor(pct: number, meta: number = 100): string {
  if (meta > 0 && pct < 45) return '#000000'; // Black critical indicator
  if (pct < 70) return '#E74C3C'; // Red
  if (pct <= 90) return '#F1C40F'; // Yellow
  return '#27AE60'; // Emerald Green
}

/**
 * Formats financial currency in USD with thousands separators: $12,500.00
 */
export function formatCurrency(amount: number): string {
  const sanitized = sanitizeNumericInput(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(sanitized);
}

/**
 * Formats integer with thousands separators: 1,500
 */
export function formatInteger(val: number): string {
  const sanitized = Math.round(sanitizeNumericInput(val));
  return new Intl.NumberFormat('en-US').format(sanitized);
}

export default {
  sanitizeNumericInput,
  calculateClosingRate,
  calculatePercentage,
  calculateCashRatio,
  getCorporateSemaphoreColor,
  formatCurrency,
  formatInteger,
};
