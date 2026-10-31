import { jsPDF } from 'jspdf';
import { RouteData, Analysis } from '../types';
import {
  calculateClosingRate,
  calculatePercentage,
  calculateCashRatio,
  calculateSituationalAnalysis,
  formatCurrency,
  formatInteger,
} from './financialMath';

export interface GeneratePdfOptions {
  route: RouteData;
  previousRoute?: RouteData;
  selectedWeek?: string;
  hasAiAnalysis?: boolean;
  analysis?: Analysis;
}

// Corporative palette: FV MEGAMAYORISTA
const PRIMARY_COLOR: [number, number, number] = [46, 134, 193]; // #2E86C1 (Azul FV Comercial)
const DARK_COLOR: [number, number, number] = [33, 47, 61];       // #212F3D (Pizarra Ejecutivo)
const LIGHT_BG: [number, number, number] = [248, 249, 250];     // Fondo suave
const BORDER_ACCENT: [number, number, number] = [220, 224, 230];// Bordes contenedores
const CARD_BG: [number, number, number] = [248, 250, 252];      // Fondo tarjetas
const CARD_BORDER: [number, number, number] = [218, 224, 235];  // Borde tarjetas

// Semáforo Oficial FV MEGAMAYORISTA:
// < 50% Negro, 50-80% Amarillo, 81-100% (o superior) Verde
const SUCCESS_COLOR: [number, number, number] = [39, 174, 96];   // #27AE60 (81-100% Verde)
const WARNING_COLOR: [number, number, number] = [241, 196, 15];  // #F1C40F (50-80% Amarillo)
const CRITICAL_COLOR: [number, number, number] = [0, 0, 0];       // #000000 (<50% Negro)

function formatWeekLabel(wkId?: string): string {
  if (!wkId) return 'Semana No Especificada';
  const match = wkId.match(/^week-(\d+)-(\d+)$/);
  if (match) return `Semana ${match[1]} de ${match[2]}`;
  return wkId.replace('week-', 'Semana ').replace('-', ' / ');
}

/**
 * Genera el documento oficial PDF 'FV_Reporte_Ejecutivo'
 * Rescata la estructura de 2 páginas con branding corporativo, 
 * tríada estratégica de KPIs (Cierre de Ventas, Cajas, Cobranza), 
 * contexto logístico referencial, conciliación de divisas, retroalimentación
 * gerencial virtual y firma de la Gerente Administrativo.
 */
export function generateRoutePdfReport({
  route,
  previousRoute,
  selectedWeek,
  hasAiAnalysis = false,
  analysis,
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const getColor = (pct: number): [number, number, number] => {
    if (pct < 50) return CRITICAL_COLOR; // Menor de 50% negro
    if (pct <= 80) return WARNING_COLOR; // De 50 a 80% amarillo
    return SUCCESS_COLOR;                // De 81 a 100% (o superior) verde
  };

  const isSplit = route.name.includes(' - ');
  const seller = isSplit ? route.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
  const rName = isSplit ? route.name.split(' - ')[1] : route.name;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Cálculos matemáticos exactos
  const cierreReal = calculateClosingRate(route.clients.real, route.visitedClients);
  const pctBoxes = calculatePercentage(route.boxes.real, route.boxes.meta);
  const pctCollection = calculatePercentage(route.collection.real, route.collection.meta);

  let prevCierre = 0;
  let prevCajas = 0;
  let prevCobranza = 0;

  if (previousRoute) {
    prevCierre = calculateClosingRate(previousRoute.clients.real, previousRoute.visitedClients);
    prevCajas = calculatePercentage(previousRoute.boxes.real, previousRoute.boxes.meta);
    prevCobranza = calculatePercentage(previousRoute.collection.real, previousRoute.collection.meta);
  }

  const colCierre = getColor(cierreReal);
  const colBoxes = getColor(pctBoxes);
  const colCollection = getColor(pctCollection);

  // ==========================================
  // PÁGINA 1: RESUMEN, TRÍADA DE KPIS Y LIQUIDEZ
  // ==========================================

  // 1. Encabezado Branding Superior
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(15, 15, 185.9, 11, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FV MEGAMAYORISTA  |  REPORTE EJECUTIVO CENTRALIZADO', 20, 22.5);

  // 2. Ficha de Metadatos del Vendedor y Ruta
  doc.setFillColor(...LIGHT_BG);
  doc.rect(15, 29, 185.9, 25, 'F');
  doc.setDrawColor(...BORDER_ACCENT);
  doc.rect(15, 29, 185.9, 25, 'S');

  doc.setTextColor(...DARK_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Vendedor: ${seller}`, 20, 35.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(110, 120, 130);
  doc.text(`Ruta Comercial: ${rName}`, 20, 41.5);
  doc.text(`Período Contable: ${formatWeekLabel(selectedWeek)}`, 20, 46.5);
  doc.text(`Fecha de Emisión: ${dateStr} ${timeStr}`, 20, 51.5);

  // Insignia Derecha de Certificación Digital
  doc.setFillColor(235, 244, 250);
  doc.rect(142, 33, 52, 17, 'F');
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.rect(142, 33, 52, 17, 'S');

  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ESTADO DEL SISTEMA', 145, 37);
  doc.setFontSize(9);
  doc.text('AUDITORÍA DIGITAL', 145, 41.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(hasAiAnalysis ? 'ANALIZADO CON IA (GEMINI)' : 'REGLAS GENERALES ACTIVAS', 145, 45.5);

  // 3. I. RESUMEN EJECUTIVO DE DIRECCIÓN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('I. RESUMEN EJECUTIVO DE DIRECCIÓN', 15, 59.5);

  doc.setFillColor(245, 247, 250);
  doc.rect(15, 63.5, 185.9, 20.5, 'F');
  doc.setDrawColor(...BORDER_ACCENT);
  doc.rect(15, 63.5, 185.9, 20.5, 'S');

  doc.setTextColor(60, 70, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const executiveSummary = 'Este informe quincenal estructurado consolida el estatus del desempeño y metas del vendedor seleccionado para reuniones gerenciales. Conforme a las directrices de FV MEGAMAYORISTA, las ganancias se rigen puramente bajo el sistema de comisiones de venta específicas escalonadas (beneficios proporcionales al volumen de transacciones cobrado, sin bonos fijos recurrentes). Adicionalmente, se audita el indicador clave del 1% de efectivo ($ divisas físicas) sobre la cobranza para garantizar la liquidez cambiaria básica de la vertical de negocios.';
  const splitSummary = doc.splitTextToSize(executiveSummary, 175);
  doc.text(splitSummary, 20, 68.5);

  // 4. II. CUMPLIMIENTO COMPARATIVO DE OBJETIVOS (CUMPLIMIENTO %)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('II. CUMPLIMIENTO COMPARATIVO DE OBJETIVOS (CUMPLIMIENTO %)', 15, 89.5);

  const drawComparativeKpiCard = (
    xPos: number,
    cardY: number,
    w: number,
    h: number,
    title: string,
    pctActual: number,
    pctPrev: number,
    realVal: string,
    metaVal: string,
    graphCol: [number, number, number],
    isWide: boolean = false
  ) => {
    // Fondo y borde
    doc.setFillColor(...CARD_BG);
    doc.rect(xPos, cardY, w, h, 'F');
    doc.setDrawColor(...CARD_BORDER);
    doc.rect(xPos, cardY, w, h, 'S');

    // Borde superior de acento con color del semáforo
    doc.setFillColor(...graphCol);
    doc.rect(xPos, cardY, w, 1.2, 'F');

    // Título de la tarjeta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...DARK_COLOR);
    doc.text(title, xPos + 4, cardY + 4.5);

    // Porcentaje grande actual
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...graphCol);
    doc.text(`${pctActual}%`, xPos + 4, cardY + 11);

    // Meta y Real
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 110, 120);
    doc.text(`Meta: ${metaVal}`, xPos + 4, cardY + 17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_COLOR);
    doc.text(`Real: ${realVal}`, xPos + 4, cardY + 22);

    // Columna derecha con barras de progreso comparativo
    const rightColX = xPos + (isWide ? 95 : 38);
    const barW = isWide ? 82 : 44;

    // 1. Barra Quincena Actual
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...DARK_COLOR);
    doc.text(`Q. Actual: ${pctActual}%`, rightColX, cardY + 8.5);

    doc.setFillColor(230, 235, 240);
    doc.rect(rightColX, cardY + 10.5, barW, 2, 'F');
    doc.setFillColor(...graphCol);
    doc.rect(rightColX, cardY + 10.5, Math.min(barW, Math.max(0, (pctActual / 100) * barW)), 2, 'F');

    // 2. Barra Quincena Previa
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 110, 120);
    doc.text(`Q. Previa: ${pctPrev}%`, rightColX, cardY + 17);

    doc.setFillColor(230, 235, 240);
    doc.rect(rightColX, cardY + 19, barW, 2, 'F');
    doc.setFillColor(71, 85, 105); // slate-600 para histórico comparativo
    doc.rect(rightColX, cardY + 19, Math.min(barW, Math.max(0, (pctPrev / 100) * barW)), 2, 'F');
  };

  // Fila 1: Efectividad de Cierre de Ventas y Volumen de Despacho (Cajas)
  drawComparativeKpiCard(
    15,
    93.5,
    88,
    26,
    'EFECTIVIDAD DE CIERRE DE VENTAS',
    cierreReal,
    prevCierre,
    `${formatInteger(route.clients.real)} Clientes`,
    `${formatInteger(route.visitedClients)} Visitas`,
    colCierre,
    false
  );

  drawComparativeKpiCard(
    112.9,
    93.5,
    88,
    26,
    'VOLUMEN DE DESPACHO (CAJAS)',
    pctBoxes,
    prevCajas,
    `${formatInteger(route.boxes.real)} Cjs`,
    `${formatInteger(route.boxes.meta)} Cjs`,
    colBoxes,
    false
  );

  // Fila 2: Cobranza de Cartera Activa (Tarjeta ancha completa)
  drawComparativeKpiCard(
    15,
    122.5,
    185.9,
    26,
    'COBRANZA DE CARTERA ACTIVA',
    pctCollection,
    prevCobranza,
    `${formatCurrency(route.collection.real)} USD`,
    `${formatCurrency(route.collection.meta)} USD`,
    colCollection,
    true
  );

  // Cuadro Referencial de Estructura Logística de Visitas
  doc.setFillColor(...LIGHT_BG);
  doc.rect(15, 151.5, 185.9, 11, 'F');
  doc.setDrawColor(...BORDER_ACCENT);
  doc.rect(15, 151.5, 185.9, 11, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_COLOR);
  doc.text(
    `Estructura Logística de Visitas: ${formatInteger(route.clients.real)} clientes servidos de ${formatInteger(route.visitedClients)} visitados (${cierreReal}% efectividad de cierre)`,
    18,
    158.5
  );

  // 5. III. ESTRUCTURA DE LIQUIDEZ POR DETALLE DE DIVISAS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('III. ESTRUCTURA DE LIQUIDEZ POR DETALLE DE DIVISAS', 15, 169.5);

  doc.setFillColor(...LIGHT_BG);
  doc.rect(15, 173.5, 185.9, 32, 'F');
  doc.setDrawColor(...BORDER_ACCENT);
  doc.rect(15, 173.5, 185.9, 32, 'S');

  doc.setTextColor(...DARK_COLOR);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO DE ENTRADA DE FLUJO', 20, 181.5);

  const transferVal = Math.max(0, route.collection.real - route.divisas);
  const divisasRatio = route.collection.real > 0
    ? Math.round((route.divisas / route.collection.real) * 100)
    : 0;
  const transferRatio = Math.max(0, 100 - divisasRatio);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`• Total Liquidado en Facturación:  ${formatCurrency(route.collection.real)} USD`, 20, 187.5);
  doc.text(`• Recaudación Efectivo Divisas ($):   ${formatCurrency(route.divisas)} USD   (${divisasRatio}% del Recaudo)`, 20, 193.5);
  doc.text(`• Transferencia / Conciliación:         ${formatCurrency(transferVal)} USD   (${transferRatio}% del Recaudo)`, 20, 199.5);

  // Barra gráfica combinada Efectivo / Banco
  const barBoxX = 130;
  const barBoxY = 183.5;
  const barBoxW = 55;
  const barBoxH = 6;
  const cashBarW = (divisasRatio / 100) * barBoxW;

  doc.setFillColor(39, 174, 96);
  doc.rect(barBoxX, barBoxY, barBoxW, barBoxH, 'F');
  doc.setFillColor(52, 152, 219);
  doc.rect(barBoxX + cashBarW, barBoxY, barBoxW - cashBarW, barBoxH, 'F');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 110, 120);
  doc.text(`Efectivo: ${divisasRatio}%`, barBoxX, barBoxY + 11);
  doc.text(`Banco: ${transferRatio}%`, barBoxX + 22, barBoxY + 11);

  // ==========================================
  // PÁGINA 2: COMPLIANCE, ESTRATEGIAS Y FIRMA
  // ==========================================
  doc.addPage();

  // 1. Encabezado de Continuación
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(15, 15, 185.9, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FV MEGAMAYORISTA  |  REPORTE EJECUTIVO CENTRALIZADO (CONTINUACIÓN)', 20, 21.5);

  // 2. IV. CONCILIACIÓN DE DIVISAS Y COMPLIANCE OPERATIVO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('IV. CONCILIACIÓN DE DIVISAS Y COMPLIANCE OPERATIVO', 15, 31);

  doc.setFillColor(255, 255, 255);
  doc.rect(15, 35, 185.9, 22, 'F');
  doc.setDrawColor(...BORDER_ACCENT);
  doc.rect(15, 35, 185.9, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_COLOR);
  doc.text('AUDITORÍA RESTRICCIÓN DE DIVISAS ($ EFECTIVO) - MÍNIMO INTERNO 1%', 18, 40);

  const minCashRequired = Math.max(0, route.collection.real * 0.01);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Efectivo ($) Recaudado: ${formatCurrency(route.divisas)} USD`, 18, 45);
  doc.text(`Mínimo 1% Requerido:  ${formatCurrency(minCashRequired)} USD`, 18, 49);
  doc.text(`Porcentaje Realizado:  ${divisasRatio}% sobre total cobranza`, 18, 53);

  // Insignia Derecha de Estado de Compliance de Liquidez
  const hasMetMinCash = divisasRatio >= 1;
  const badgeCol: [number, number, number] = hasMetMinCash ? [39, 174, 96] : [231, 76, 60];
  const badgeBg: [number, number, number] = hasMetMinCash ? [240, 253, 244] : [254, 242, 242];
  const badgeText = hasMetMinCash ? 'LIQUIDEZ CUMPLIDA (OK)' : 'ALERTA REQUISITO MÍNIMO';

  doc.setFillColor(...badgeBg);
  doc.rect(118, 38, 76, 16, 'F');
  doc.setDrawColor(...badgeCol);
  doc.rect(118, 38, 76, 16, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...badgeCol);
  doc.text('ESTADO COMPLIANCE LIQUIDEZ:', 121, 42);
  doc.setFontSize(8.5);
  doc.text(badgeText, 121, 46);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 120, 130);
  doc.text(
    hasMetMinCash
      ? 'Suficiente efectivo captado para el soporte comercial.'
      : 'Compromiso de liquidez requiere min 1% en $.',
    121,
    49.5
  );

  // 3. V. RETROALIMENTACIÓN DE "GERENCIA VIRTUAL" ESTRATEGIAS COMERCIALES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('V. RETROALIMENTACIÓN DE "GERENCIA VIRTUAL" ESTRATEGIAS COMERCIALES', 15, 63.5);

  // Obtenemos análisis situacional con fallback determinista financiero enfocado por zona
  const finalAnalysis = analysis || calculateSituationalAnalysis(route, previousRoute);

  let currentBoxY = 66;

  const renderAnalysisBox = (
    title: string,
    content: string,
    rColor: [number, number, number]
  ) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    const splitText = doc.splitTextToSize(content, 174);
    const textHeight = splitText.length * 3.6;
    const boxH = Math.max(18, 7.5 + textHeight);

    doc.setFillColor(248, 250, 252);
    doc.rect(15, currentBoxY, 185.9, boxH, 'F');
    doc.setDrawColor(...BORDER_ACCENT);
    doc.rect(15, currentBoxY, 185.9, boxH, 'S');

    // Barra vertical de acento color
    doc.setFillColor(...rColor);
    doc.rect(15, currentBoxY, 2.5, boxH, 'F');

    // Título
    doc.setTextColor(...rColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title, 20.5, currentBoxY + 5);

    // Contenido
    doc.setTextColor(50, 60, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.text(splitText, 20.5, currentBoxY + 9.5);

    currentBoxY += boxH + 3;
  };

  renderAnalysisBox('DIAGNÓSTICO SITUACIONAL OPERATIVO', finalAnalysis.diagnostic, [46, 134, 193]);
  renderAnalysisBox('PUNTO DE FRICCIÓN / COSTRICCIÓN DE MERCADO', finalAnalysis.painPoint, [231, 76, 60]);
  renderAnalysisBox('CONSEJO ACTIVO COMERCIAL Y VENTA CRUZADA', finalAnalysis.opportunity, [39, 174, 96]);
  renderAnalysisBox('ESTRATEGIA FINANCIERA DE MONEDAS', finalAnalysis.cashInsight, [142, 68, 173]);

  // 4. VI. FIRMA DE RESPONSABILIDAD ADMINISTRATIVA
  const signBaseY = Math.min(235, Math.max(currentBoxY + 4, 170));
  doc.setDrawColor(200, 205, 210);
  doc.setLineWidth(0.5);
  doc.line(65, signBaseY + 14, 145, signBaseY + 14);

  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(11);
  doc.setTextColor(46, 134, 193);
  doc.text('Verónica Jauregui', 105, signBaseY + 9, { align: 'center' });

  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Verónica Jauregui', 105, signBaseY + 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 120, 130);
  doc.text('Gerente Administrativo, División Mayorista, FV Grupo Empresarial', 105, signBaseY + 23, { align: 'center' });
  doc.text('Administradora del Sistema', 105, signBaseY + 26.5, { align: 'center' });

  // ==========================================
  // PIE DE PÁGINA EN TODAS LAS HOJAS
  // ==========================================
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 160, 170);
    doc.text(
      'CONFIDENCIAL • SISTEMA DE GESTIÓN DE INFORMACIÓN INTEGRAL S.I.G. FV MEGAMAYORISTA • CONTROL INTERNO',
      20,
      268
    );
    doc.text(
      'Generado mecánicamente por el módulo Virtual Executive Advisor. Todos los derechos reservados 2026.',
      20,
      272
    );
    doc.text(`Página ${i} de ${pageCount}`, 175, 272);
  }

  return doc;
}

export default generateRoutePdfReport;
