import Decimal from 'decimal.js';
import { RouteData, Analysis } from '../types';

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
 * - Menor de 50% (< 50%): Negro (#000000) - Alerta Crítica
 * - De 50% a 80%: Amarillo (#F1C40F) - En Progreso / Alerta Moderada
 * - De 81% a 100% (o superior): Verde (#27AE60) - Óptimo / Éxito
 */
export function getCorporateSemaphoreColor(pct: number, meta: number = 100): string {
  if (meta <= 0) return '#27AE60';
  if (pct < 50) return '#000000'; // Menor de 50% negro
  if (pct <= 80) return '#F1C40F'; // De 50 a 80% amarillo
  return '#27AE60'; // De 81 al 100% verde
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

/**
 * Generates situational commercial analysis based on route metrics.
 * Evaluates performance scenarios, financial cash bottlenecks, and sales closing efficiency.
 */
export function calculateSituationalAnalysis(route: RouteData): Analysis {
  const clientPerf = route.visitedClients > 0
    ? (route.clients.real / route.visitedClients) * 100
    : (route.clients.real / (route.clients.meta || 1)) * 100;
  const boxesPerf = (route.boxes.real / (route.boxes.meta || 1)) * 100;
  const collPerf = (route.collection.real / (route.collection.meta || 1)) * 100;

  const pendingCollection = Math.max(0, route.collection.meta - route.collection.real);
  const pendingBoxes = Math.max(0, route.boxes.meta - route.boxes.real);
  const pendingClients = Math.max(0, (route.visitedClients || route.clients.meta) - route.clients.real);
  const currentDropSize = route.clients.real > 0 ? (route.boxes.real / route.clients.real).toFixed(1) : "0";

  let diag = "";
  let pain = "";
  let opp = "";

  if (collPerf < 80 && boxesPerf > 80) {
    diag = `PELIGRO FINANCIERO: Estás "regalando" mercancía. Tienes ${boxesPerf.toFixed(0)}% en ventas pero tu cobranza está congelada.`;
    pain = `Capital Atrapado: Tienes ${formatCurrency(pendingCollection)} en la calle. Esto frena la reposición del almacén.`;
    opp = `ORDEN TÁCTICA: Detén despachos a crédito hoy mismo. Solo libera pedidos contra pago de facturas viejas. Tu prioridad es COBRAR, no vender.`;
  } else if (clientPerf > 80 && boxesPerf < 70) {
    diag = `INEFICIENCIA LOGÍSTICA: Visitas mucho, vendes poco. Tu drop-size es de solo ${currentDropSize} cajas/cliente.`;
    pain = `Costos Operativos: El gasto de combustible y tiempo por parada está consumiendo tu margen de ganancia.`;
    opp = `ESTRATEGIA DE MIX: No aceptes pedidos de menos de 5 cajas. Ofrece el producto de mayor rotación solo si llevan uno de baja rotación (Venta Cruzada).`;
  } else if (clientPerf < 70 && boxesPerf < 70 && collPerf < 70) {
    diag = `ALARMA ROJA: Ruta colapsada en todos los indicadores. Tendencia negativa sostenida.`;
    pain = `Viabilidad: Con estos números, la ruta no es rentable para la compañía ni para tus comisiones.`;
    opp = `REINGENIERÍA TOTAL: Olvida la meta mensual. Enfócate en vender ${Math.ceil(pendingBoxes / 6)} cajas diarias por los próximos 6 días. Divide y vencerás.`;
  } else if (clientPerf < 70) {
    diag = `PÉRDIDA DE TERRITORIO: Has dejado de atender a ${pendingClients} clientes meta. La competencia está llenando esos vacíos.`;
    pain = `Riesgo Futuro: Cliente que no visitas hoy, es cliente que compra a la competencia mañana y no recuperas en meses.`;
    opp = `OPERACIÓN RESCATE: Imprime tu lista de inactivos. Ofrece una bonificación o descuento especial solo por "Reactivación" esta semana.`;
  } else if (clientPerf >= 90 && boxesPerf >= 90 && collPerf >= 90) {
    diag = `EXCELENCIA OPERATIVA: Dominio total de la zona. Has superado las expectativas estándar y maximizado el tramo más alto de tus porcentajes de comisión por venta específica.`;
    pain = `Abastecimiento: El único riesgo es romper stock debido a la alta demanda generada.`;
    opp = `EXPANSIÓN: Ya cubriste la meta. Usa el tiempo restante para introducir SKUs nuevos que el cliente nunca ha comprado (Innovación).`;
  } else {
    diag = `DESEMPEÑO ESTABLE: Estás en el promedio de ventas quincenales, pero te faltan ${pendingBoxes} cajas para acceder a un tramo de porcentaje de comisión superior. En FV MEGAMAYORISTA no ofrecemos bonos de productividad fijos, sino que tu ganancia se rige por un porcentaje de venta específico: a mayor volumen de venta, más alto el porcentaje obtenido.`;
    pain = `Costo de Oportunidad: Estás dejando dinero en la mesa al no ascender al siguiente nivel en la escala de comisiones por volumen de venta.`;
    opp = `PUSH FINAL: Revisa de inmediato los 10 clientes con mayor volumen histórico quincenal y adelanta sus pedidos para ingresar a un tramo de comisión más rentable.`;
  }

  const cashRatio = route.collection.real > 0 ? (route.divisas / route.collection.real) * 100 : 0;
  let cashMsg = "";
  if (cashRatio < 1) {
    cashMsg = "CRÍTICO DE ALTA PRIORIDAD: Recaudación de efectivo inferior al 1% mínimo requerido por norma administrativa. Es obligatorio exigir al menos un 1% mínimo de divisas físicas en cada punto de venta para garantizar la liquidez de caja de la vertical de negocios y asegurar la reposición ágil con grandes fabricantes.";
  } else if (cashRatio < 15) {
    cashMsg = "ALERTA DE FLUJO: Estás cumpliendo el mínimo normativo del 1%, pero la recaudación de divisas físicas sigue siendo baja. Fomenta el pago en moneda extranjera para optimizar cobros y evitar costos de devaluación cambiaria.";
  } else {
    cashMsg = "LIQUIDEZ OPERATIVA EN ORDEN: Excelente captación de divisas físicas por encima del límite de seguridad. Cumple con holgura la exigencia de un 1% mínimo para la liquidez de divisas de la vertical de negocios, favoreciendo la compra de inventario inmediato.";
  }

  return { diagnostic: diag, painPoint: pain, opportunity: opp, cashInsight: cashMsg };
}

export default {
  sanitizeNumericInput,
  calculateClosingRate,
  calculatePercentage,
  calculateCashRatio,
  getCorporateSemaphoreColor,
  calculateSituationalAnalysis,
  formatCurrency,
  formatInteger,
};
