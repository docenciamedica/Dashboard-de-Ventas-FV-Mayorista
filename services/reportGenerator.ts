import { jsPDF } from 'jspdf';
import { RouteData } from '../types';
import { calculateClosingRate, calculatePercentage, formatCurrency, formatInteger } from './financialMath';

export interface GeneratePdfOptions {
  route: RouteData;
  previousRoute?: RouteData;
  selectedWeek?: string;
  hasAiAnalysis?: boolean;
}

const PRIMARY_COLOR: [number, number, number] = [46, 134, 193]; // #2E86C1
const DARK_COLOR: [number, number, number] = [33, 47, 61];       // #212F3D
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const SUCCESS_COLOR: [number, number, number] = [39, 174, 96];   // #27AE60 (81-100% verde)
const WARNING_COLOR: [number, number, number] = [241, 196, 15];  // #F1C40F (50-80% amarillo)
const CRITICAL_COLOR: [number, number, number] = [0, 0, 0];       // #000000 (<50% negro)

function formatWeekLabel(wkId?: string): string {
  if (!wkId) return 'Semana No Especificada';
  const match = wkId.match(/^week-(\d+)-(\d+)$/);
  if (match) return `Semana ${match[1]} de ${match[2]}`;
  return wkId.replace('week-', 'Semana ').replace('-', ' / ');
}

export function generateRoutePdfReport({
  route,
  previousRoute,
  selectedWeek,
  hasAiAnalysis = false,
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  let y = 15;

  const checkAndAddPage = (requiredHeight: number) => {
    if (y + requiredHeight > 255) {
      doc.addPage();
      doc.setFillColor(...PRIMARY_COLOR);
      doc.rect(15, 12, 185.9, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('FV MEGAMAYORISTA  |  INFORME EJECUTIVO DE VENTAS (CONTINUACIÓN)', 18, 17.5);

      y = 28;
    }
  };

  // 1. Encabezado Corporativo Oficial
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(15, y, 185.9, 11, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FV MEGAMAYORISTA  |  INFORME EJECUTIVO DE DESEMPEÑO COMERCIAL', 18, y + 7.5);
  y += 15;

  // 2. Ficha de Metadatos del Vendedor y Ruta
  doc.setFillColor(...LIGHT_BG);
  doc.rect(15, y, 185.9, 24, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(15, y, 185.9, 24, 'S');

  const isSplit = route.name.includes(' - ');
  const seller = isSplit ? route.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
  const routeName = isSplit ? route.name.split(' - ')[1] : route.name;

  doc.setTextColor(...DARK_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Promotor / Vendedor: ${seller}`, 19, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ruta Comercial: ${routeName}`, 19, y + 11.5);
  doc.text(`Período Contable: ${formatWeekLabel(selectedWeek)}`, 19, y + 16.5);
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Fecha y Hora de Emisión: ${dateStr} - ${timeStr}`, 19, y + 21);

  // Insignia de Certificación Digital
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(142, y + 4, 52, 16, 'S');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ESTADO DEL SISTEMA', 145, y + 8);
  doc.setFontSize(8.5);
  doc.text('DATOS CERTIFICADOS', 145, y + 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(hasAiAnalysis ? 'SUPERVISADO CON IA' : 'REGLAS DEVSECOPS ACTIVAS', 145, y + 15.5);

  y += 28;

  // 3. Resumen Ejecutivo de Dirección
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('I. DIRECTRICES Y RESUMEN ESTRATÉGICO', 15, y);
  y += 4;

  doc.setFillColor(...LIGHT_BG);
  doc.rect(15, y, 185.9, 21, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(15, y, 185.9, 21, 'S');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const summaryText = `Informe comercial consolidado correspondiente a la jornada quincenal de FV MEGAMAYORISTA. Las remuneraciones y comisiones se rigen exclusivamente bajo el sistema progresivo por volumen y cobranza efectiva recuperada, sin bonos fijos recurrentes. Se audita de forma obligatoria el cumplimiento del umbral mínimo del 1% de divisas en efectivo para blindar la liquidez cambiaria y reposición inmediata con productores nacionales.`;
  const splitSummary = doc.splitTextToSize(summaryText, 175);
  doc.text(splitSummary, 19, y + 5);

  y += 26;

  // 4. Tríada Estratégica de Cumplimiento de Objetivos (Sustitución de Clientes por Cierre de Ventas)
  checkAndAddPage(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('II. TRÍADA ESTRATÉGICA DE CUMPLIMIENTO (% LOGRADO)', 15, y);
  y += 5;

  // Cálculos matemáticos exactos
  const cierreActual = calculateClosingRate(route.clients.real, route.visitedClients);
  const cajasActual = calculatePercentage(route.boxes.real, route.boxes.meta);
  const cobranzaActual = calculatePercentage(route.collection.real, route.collection.meta);

  let prevCierre = 0;
  let prevCajas = 0;
  let prevCobranza = 0;

  if (previousRoute) {
    prevCierre = calculateClosingRate(previousRoute.clients.real, previousRoute.visitedClients);
    prevCajas = calculatePercentage(previousRoute.boxes.real, previousRoute.boxes.meta);
    prevCobranza = calculatePercentage(previousRoute.collection.real, previousRoute.collection.meta);
  }

  const getColor = (pct: number): [number, number, number] => {
    if (pct < 50) return CRITICAL_COLOR; // Menor de 50% negro
    if (pct <= 80) return WARNING_COLOR; // De 50 a 80% amarillo
    return SUCCESS_COLOR; // De 81 al 100% verde
  };

  const drawKpiCard = (
    x: number,
    cardY: number,
    width: number,
    height: number,
    title: string,
    pctNow: number,
    pctBefore: number,
    realStr: string,
    metaStr: string,
    accentColor: [number, number, number]
  ) => {
    doc.setFillColor(...LIGHT_BG);
    doc.rect(x, cardY, width, height, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.rect(x, cardY, width, height, 'S');

    // Borde superior de acento
    doc.setFillColor(...accentColor);
    doc.rect(x, cardY, width, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_COLOR);
    doc.text(title, x + 4, cardY + 5.5);

    doc.setFontSize(14);
    doc.setTextColor(...accentColor);
    doc.text(`${pctNow}%`, x + 4, cardY + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Base: ${metaStr}`, x + 4, cardY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Real: ${realStr}`, x + 4, cardY + 23);

    // Comparativa Quincena Anterior
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Q. Anterior: ${pctBefore}%`, x + width - 32, cardY + 12.5);

    const diff = pctNow - pctBefore;
    const diffColor = diff >= 0 ? SUCCESS_COLOR : CRITICAL_COLOR;
    doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
    doc.text(`${diff >= 0 ? '+' : ''}${diff}%`, x + width - 32, cardY + 18);
  };

  const cardW = 59;
  const cardH = 26;

  // 1. Cierre de Ventas
  drawKpiCard(
    15,
    y,
    cardW,
    cardH,
    'CIERRE DE VENTAS',
    cierreActual,
    prevCierre,
    `${formatInteger(route.clients.real)} Clientes`,
    `${formatInteger(route.visitedClients)} Visitas`,
    getColor(cierreActual)
  );

  // 2. Volumen de Cajas
  drawKpiCard(
    78.4,
    y,
    cardW,
    cardH,
    'VOLUMEN (CAJAS)',
    cajasActual,
    prevCajas,
    `${formatInteger(route.boxes.real)} Cjs`,
    `${formatInteger(route.boxes.meta)} Cjs`,
    getColor(cajasActual)
  );

  // 3. Cobranza Lograda
  drawKpiCard(
    141.9,
    y,
    cardW,
    cardH,
    'COBRANZA TOTAL',
    cobranzaActual,
    prevCobranza,
    formatCurrency(route.collection.real),
    formatCurrency(route.collection.meta),
    getColor(cobranzaActual)
  );

  y += cardH + 8;

  // 5. Contexto Logístico y Liquidación en Divisas Físicas
  checkAndAddPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('III. LOGÍSTICA DE CAMPO Y LIQUIDEZ CAMBIARIA', 15, y);
  y += 4;

  doc.setFillColor(...LIGHT_BG);
  doc.rect(15, y, 185.9, 22, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.rect(15, y, 185.9, 22, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DARK_COLOR);

  const divisasPct = route.collection.real > 0
    ? ((route.divisas / route.collection.real) * 100).toFixed(1)
    : '0.0';

  doc.text(`• Cartera Activa Asignada: ${formatInteger(route.totalClients)} clientes registrados en territorio.`, 19, y + 5.5);
  doc.text(`• Cobertura de Visitas: ${formatInteger(route.visitedClients)} puntos visitados en esta jornada de cobranza quincenal.`, 19, y + 10.5);
  doc.text(`• Divisas en Efectivo Captadas: ${formatCurrency(route.divisas)} (${divisasPct}% de liquidez física en USD).`, 19, y + 15.5);

  const cashCompliant = Number(divisasPct) >= 1.0;
  const cashColor = cashCompliant ? SUCCESS_COLOR : CRITICAL_COLOR;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cashColor[0], cashColor[1], cashColor[2]);
  doc.text(
    cashCompliant ? '✓ Cumple con el mínimo administrativo del 1% en divisas.' : '⚠ Alerta: Porcentaje de efectivo por debajo de la norma mínima (1%).',
    19,
    y + 19.5
  );

  // Pie de Página con Copyright y Paginación
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('© 2026 FV MEGAMAYORISTA - Todos los derechos reservados. Documento de control interno inmutable.', 15, 270);
    doc.text(`Página ${i} de ${pageCount}`, 180, 270);
  }

  return doc;
}

export default generateRoutePdfReport;
