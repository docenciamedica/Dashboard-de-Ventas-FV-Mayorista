
import React, { useMemo, useState, useEffect } from 'react';
import { RouteData } from '../types';
import EditableTable from './EditableTable';
import { analyzeRouteData, GeminiAnalysis } from '../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { BrainCircuit, AlertTriangle, Lightbulb, TrendingUp, Target, Users, CheckCircle2, Banknote, Sparkles, Loader2, RefreshCw, LineChart as LucideLineChart, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateRoutePdfReport } from '../services/reportGenerator';
import { calculateClosingRate, calculatePercentage, getCorporateSemaphoreColor } from '../services/financialMath';

interface KPI {
  id: string;
  label: string;
  unit: string;
  description: string;
}

interface CustomChart {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'area';
  kpiId: string;
  scope: string; // 'all' or active route id
}

interface DashboardViewProps {
  route: RouteData;
  onUpdate: (updated: RouteData) => void;
  selectedWeek?: string;
  previousRoute?: RouteData;
  historicalData?: Record<string, RouteData[]>;
  isConsolidated?: boolean;
  role?: 'admin' | 'user';
  kpis?: KPI[];
  customCharts?: CustomChart[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  route, 
  onUpdate, 
  selectedWeek, 
  previousRoute, 
  historicalData, 
  isConsolidated,
  role = 'user',
  kpis = [],
  customCharts = []
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<GeminiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [show8Weeks, setShow8Weeks] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const formatWeekId = (wkId?: string) => {
    if (!wkId) return 'Semana No Especificada';
    const match = wkId.match(/^week-(\d+)-(\d+)$/);
    if (match) return `Semana ${match[1]} de ${match[2]}`;
    return wkId.replace('week-', 'Semana ').replace('-', ' / ');
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = generateRoutePdfReport({
        route,
        previousRoute,
        selectedWeek,
        hasAiAnalysis: Boolean(aiAnalysis),
      });
      const cleanWeekId = selectedWeek ? selectedWeek.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Semana';
      const cleanRouteName = route.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Reporte_FV_${cleanRouteName}_${cleanWeekId}.pdf`);
    } catch (err) {
      console.error("Fallo al exportar reporte PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };
  useEffect(() => {
    // Artificial 400ms delay removed to eliminate interface transition lag
    setIsLoading(false);
  }, [route.id, selectedWeek]);

  // Protocolo de Semáforo: Rojo < 70%, Amarillo 71-90%, Verde > 91%
  const getSemaphoreColor = (real: number, meta: number) => {
    if (meta <= 0) return '#27AE60';
    const percent = (real / meta) * 100;
    if (percent < 70) return '#E74C3C'; // Rojo
    if (percent <= 90) return '#F1C40F'; // Amarillo
    return '#27AE60'; // Verde
  };

  const barData = useMemo(() => {
    const cierreReal = calculateClosingRate(route.clients.real, route.visitedClients);
    let prevCierre = 0;
    let prevCajas = 0;
    let prevCobranza = 0;

    if (previousRoute) {
      prevCierre = calculateClosingRate(previousRoute.clients.real, previousRoute.visitedClients);
      prevCajas = calculatePercentage(previousRoute.boxes.real, previousRoute.boxes.meta);
      prevCobranza = calculatePercentage(previousRoute.collection.real, previousRoute.collection.meta);
    }

    const bReal = calculatePercentage(route.boxes.real, route.boxes.meta);
    const colReal = calculatePercentage(route.collection.real, route.collection.meta);

    const getBarColor = (pct: number, absoluteReal: number, absoluteMeta: number) => {
      return getCorporateSemaphoreColor(pct, absoluteMeta);
    };

    return [
      { 
        name: 'Cierre Ventas', 
        meta: 100, 
        real: cierreReal, 
        prevReal: prevCierre,
        absoluteReal: route.clients.real,
        absoluteMeta: route.visitedClients,
        prevAbsoluteReal: previousRoute ? previousRoute.clients.real : 0,
        prevAbsoluteMeta: previousRoute ? previousRoute.visitedClients : 0,
        isCurrency: false,
        color: getBarColor(cierreReal, route.clients.real, route.visitedClients) 
      },
      { 
        name: 'Cajas', 
        meta: 100, 
        real: bReal, 
        prevReal: prevCajas,
        absoluteReal: route.boxes.real,
        absoluteMeta: route.boxes.meta,
        prevAbsoluteReal: previousRoute ? previousRoute.boxes.real : 0,
        prevAbsoluteMeta: previousRoute ? previousRoute.boxes.meta : 0,
        isCurrency: false,
        color: getBarColor(bReal, route.boxes.real, route.boxes.meta) 
      },
      { 
        name: 'Cobranza', 
        meta: 100, 
        real: colReal, 
        prevReal: prevCobranza,
        absoluteReal: route.collection.real,
        absoluteMeta: route.collection.meta,
        prevAbsoluteReal: previousRoute ? previousRoute.collection.real : 0,
        prevAbsoluteMeta: previousRoute ? previousRoute.collection.meta : 0,
        isCurrency: true,
        color: getBarColor(colReal, route.collection.real, route.collection.meta) 
      },
    ];
  }, [route, previousRoute]);

  const analysis = useMemo(() => {
    // 1. Calculate Core KPIs
    const clientPerf = (route.clients.real / (route.clients.meta || 1)) * 100;
    const boxesPerf = (route.boxes.real / (route.boxes.meta || 1)) * 100;
    const collPerf = (route.collection.real / (route.collection.meta || 1)) * 100;
    
    // 2. Calculate Gaps
    const pendingCollection = route.collection.meta - route.collection.real;
    const pendingBoxes = route.boxes.meta - route.boxes.real;
    const pendingClients = route.clients.meta - route.clients.real;
    const currentDropSize = route.clients.real > 0 ? (route.boxes.real / route.clients.real).toFixed(1) : "0";
    
    let diag = "", pain = "", opp = "";

    // SCENARIO 1: "THE MIRAGE"
    if (collPerf < 80 && boxesPerf > 80) {
      diag = `PELIGRO FINANCIERO: Estás "regalando" mercancía. Tienes ${boxesPerf.toFixed(0)}% en ventas pero tu cobranza está congelada.`;
      pain = `Capital Atrapado: Tienes $${new Intl.NumberFormat('en-US').format(pendingCollection)} en la calle. Esto frena la reposición del almacén.`;
      opp = `ORDEN TÁCTICA: Detén despachos a crédito hoy mismo. Solo libera pedidos contra pago de facturas viejas. Tu prioridad es COBRAR, no vender.`;
    } 
    // SCENARIO 2: "LOGISTIC WASTE"
    else if (clientPerf > 80 && boxesPerf < 70) {
      diag = `INEFICIENCIA LOGÍSTICA: Visitas mucho, vendes poco. Tu drop-size es de solo ${currentDropSize} cajas/cliente.`;
      pain = `Costos Operativos: El gasto de combustible y tiempo por parada está consumiendo tu margen de ganancia.`;
      opp = `ESTRATEGIA DE MIX: No aceptes pedidos de menos de 5 cajas. Ofrece el producto de mayor rotación solo si llevan uno de baja rotación (Venta Cruzada).`;
    }
    // SCENARIO 3: "CONTRACTION"
    else if (clientPerf < 70) {
      diag = `PÉRDIDA DE TERRITORIO: Has dejado de atender a ${pendingClients} clientes meta. La competencia está llenando esos vacíos.`;
      pain = `Riesgo Futuro: Cliente que no visitas hoy, es cliente que compra a la competencia mañana y no recuperas en meses.`;
      opp = `OPERACIÓN RESCATE: Imprime tu lista de inactivos. Ofrece una bonificación o descuento especial solo por "Reactivación" esta semana.`;
    }
    // SCENARIO 4: "LOW PERFORMANCE"
    else if (clientPerf < 70 && boxesPerf < 70 && collPerf < 70) {
      diag = `ALARMA ROJA: Ruta colapsada en todos los indicadores. Tendencia negativa sostenida.`;
      pain = `Viabilidad: Con estos números, la ruta no es rentable para la compañía ni para tus comisiones.`;
      opp = `REINGENIERÍA TOTAL: Olvida la meta mensual. Enfócate en vender ${Math.ceil(pendingBoxes/6)} cajas diarias por los próximos 6 días. Divide y vencerás.`;
    }
    // SCENARIO 5: "STAR PERFORMER"
    else if (clientPerf >= 90 && boxesPerf >= 90 && collPerf >= 90) {
      diag = `EXCELENCIA OPERATIVA: Dominio total de la zona. Has superado las expectativas estándar.`;
      pain = `Abastecimiento: El único riesgo es romper stock debido a la alta demanda generada.`;
      opp = `EXPANSIÓN: Ya cubriste la meta. Usa el tiempo restante para introducir SKUs nuevos que el cliente nunca ha comprado (Innovación).`;
    }
    // DEFAULT SCENARIO
    else {
      diag = `DESEMPEÑO ESTABLE: Estás en el promedio de ventas quincenales, pero te faltan ${pendingBoxes} cajas para acceder a un tramo de porcentaje de comisión superior. En FV MEGAMAYORISTA no ofrecemos bonos de productividad fijos, sino que tu ganancia se rige por un porcentaje de venta específico: a mayor volumen de venta, más alto el porcentaje obtenido.`;
      pain = `Costo de Oportunidad: Estás dejando dinero en la mesa al no ascender al siguiente nivel en la escala de comisiones por volumen de venta.`;
      opp = `PUSH FINAL: Revisa de inmediato los 10 clientes con mayor volumen histórico quincenal y adelanta sus pedidos para ingresar a un tramo de comisión más rentable.`;
    }
    
    // SCENARIO 5 SPECIAL CHECK: Update commission/comisión context as well for Star Performer
    if (clientPerf >= 90 && boxesPerf >= 90 && collPerf >= 90) {
      diag = `EXCELENCIA OPERATIVA: Dominio total de la zona. Has superado las expectativas estándar y maximizado el tramo más alto de tus porcentajes de comisión por venta específica.`;
    }

    // CASH INTELLIGENCE (No set goal, but strictly require 1% minimum cash ratio for vertical liquidity)
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
  }, [route]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeRouteData(route, previousRoute, evolutionData);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    setAiAnalysis(null); // Reset when route changes
  }, [route.id]);

  // Extract historical stats for the line chart considering the bi-weekly frequency (every 15 days, i.e., -2, -4, -6 weeks in retrospect)
  const evolutionData = useMemo(() => {
    const match = selectedWeek?.match(/^week-(\d+)-2026$/);
    const currentW = match ? parseInt(match[1], 10) : 6;
    
    let offsets = [];
    if (show8Weeks) {
      offsets = [-14, -12, -10, -8, -6, -4, -2, 0];
    } else {
      offsets = [-6, -4, -2, 0];
    }
    
    const targetWeekPairs = offsets.map(offset => {
      let w = currentW + offset;
      let yr = 2026;
      if (w < 1) {
        w = 52 + w;
        yr -= 1;
      }
      return { w, yr };
    });

    const getRouteDataForWeek = (weekId: string): RouteData => {
      if (weekId === selectedWeek) {
        return route;
      }
      const weekRoutes = historicalData?.[weekId];
      if (weekRoutes) {
        if (isConsolidated) {
          const sellerName = route.name.replace('Consolidado - ', '');
          const sellerRoutes = (weekRoutes || []).filter(r => {
            const seller = r.name.includes(' - ') ? r.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
            return seller === sellerName;
          });
          if (sellerRoutes.length > 0) {
            return (sellerRoutes as RouteData[]).reduce<RouteData>((acc: RouteData, curr: RouteData) => ({
              id: 'consolidated',
              name: route.name,
              clients: {
                meta: acc.clients.meta + curr.clients.meta,
                real: acc.clients.real + curr.clients.real
              },
              boxes: {
                meta: acc.boxes.meta + curr.boxes.meta,
                real: acc.boxes.real + curr.boxes.real
              },
              collection: {
                meta: acc.collection.meta + curr.collection.meta,
                real: acc.collection.real + curr.collection.real
              },
              divisas: acc.divisas + curr.divisas,
              totalClients: acc.totalClients + curr.totalClients,
              visitedClients: acc.visitedClients + curr.visitedClients
            }), {
              id: 'consolidated',
              name: route.name,
              clients: { meta: 0, real: 0 },
              boxes: { meta: 0, real: 0 },
              collection: { meta: 0, real: 0 },
              divisas: 0,
              totalClients: 0,
              visitedClients: 0
            });
          }
        } else {
          const found = weekRoutes.find(r => r.id === route.id);
          if (found) return found;
        }
      }
      // Fallback representing an uninitialized/saved week structure safely with 0 real results
      return {
        ...route,
        clients: { meta: route.clients.meta, real: 0 },
        boxes: { meta: route.boxes.meta, real: 0 },
        collection: { meta: route.collection.meta, real: 0 },
        divisas: 0,
        visitedClients: 0
      };
    };

    return targetWeekPairs.map(({ w, yr }) => {
      const weekId = `week-${w}-${yr}`;
      
      let hasData = false;
      if (weekId === selectedWeek) {
        hasData = true;
      } else if (historicalData?.[weekId]) {
        if (isConsolidated) {
          const sellerName = route.name.replace('Consolidado - ', '');
          hasData = historicalData[weekId].some((r: any) => {
            const seller = r.name.includes(' - ') ? r.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
            return seller === sellerName;
          });
        } else {
          hasData = historicalData[weekId].some((r: any) => r.id === route.id);
        }
      }

      const rData = getRouteDataForWeek(weekId);
      
      const cierrePerf = rData.visitedClients > 0 ? calculateClosingRate(rData.clients.real, rData.visitedClients) : 0;
      const boxesPerf = rData.boxes.meta > 0 ? Math.round((rData.boxes.real / rData.boxes.meta) * 100) : 0;
      const collectionPerf = rData.collection.meta > 0 ? Math.round((rData.collection.real / rData.collection.meta) * 100) : 0;
      
      return {
        weekNum: w,
        name: `Sem. ${w}`,
        'Cierre de Ventas (%)': hasData ? cierrePerf : null,
        'Cajas Vendidas (%)': hasData ? boxesPerf : null,
        'Cobranza Lograda (%)': hasData ? collectionPerf : null,
      };
    });
  }, [selectedWeek, historicalData, route, show8Weeks]);

  const displayAnalysis = aiAnalysis || analysis;

  return (
    <motion.div
      key={`${route.id}-${selectedWeek}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-[10px] relative"
    >
      {/* Visual Loading Overlay with Backdrop Blur */}
      {isLoading && (
        <div className="absolute inset-x-0 top-0 h-[600px] bg-slate-50/80 backdrop-blur-[1px] z-50 flex flex-col items-center justify-start pt-32 rounded-3xl transition-opacity duration-300">
          <div className="bg-white shadow-xl border border-slate-200/50 p-6 rounded-2xl flex flex-col items-center gap-4 max-w-xs text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-[#2E86C1]/20 border-t-[#2E86C1] rounded-full animate-spin"></div>
              <RefreshCw className="absolute w-4 h-4 text-[#2E86C1] animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Sincronizando Semana</h4>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Cargando métricas de cartera y cierre comercial...</p>
            </div>
          </div>
        </div>
      )}

      {/* Editor Module and Main Visualizations Row */}
      <div className="flex flex-col xl:flex-row gap-[10px] items-stretch mb-0 mt-[-5px] w-full max-w-full">
        
        {/* Module 1: EditableTable (Expanded width to absorb extra space) */}
        <div className="w-full xl:w-[32%] shrink-0 h-[360px]">
          <EditableTable route={route} onUpdate={onUpdate} isConsolidated={isConsolidated} role={role} kpis={kpis} onExportPDF={handleExportPDF} isExporting={isExporting} />
        </div>

        {/* Module 2: Main Bar Chart (Absorbs full available width) */}
        <div className="w-full flex-1 shrink-0 bg-white p-[10px] rounded-xl shadow-sm border border-slate-200 flex flex-col h-[360px] relative overflow-hidden">
          <div className="flex justify-between items-end mb-2 shrink-0 relative">
              <div className="flex flex-col items-start gap-1">
               {barData.some(b => b.color === '#000000') && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-black text-white rounded shadow-sm animate-pulse z-10 w-fit">
                  <span className="text-[8px] font-black uppercase tracking-widest text-rose-400">⚠️ Alerta de Indicador en Negro</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-[#2E86C1] rounded-full"></div>
                <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">Cumplimiento de Objetivos (%)</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              {previousRoute && (
                <button
                  id="comparison-toggle-btn"
                  onClick={() => setShowComparison(!showComparison)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all border ${
                    showComparison 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${showComparison ? 'animate-spin' : ''}`} style={showComparison ? { animationDuration: '4s' } : {}} />
                  <span>{showComparison ? 'Ocultar' : 'Comparar'}</span>
                </button>
              )}
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <div className="w-2.5 h-2.5 rounded-full bg-[#93C5FD]"></div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Meta</span>
                {showComparison && previousRoute && (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A] ml-1.5"></div>
                    <span className="text-[11px] font-bold text-[#1E3A8A] uppercase">Ant.</span>
                  </>
                )}
                <div className="w-2.5 h-2.5 rounded-full bg-[#2E86C1] ml-1.5"></div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Actual</span>
              </div>
            </div>
          </div>
          
          {/* Layout Individual 1 a 1 por Métrica (4 Métricas Principales, NO Scrollbar, totalmente directo y reactivo) */}
          <div className="flex-1 w-full min-h-0 flex flex-col justify-between overflow-hidden gap-2 pt-1">
            {barData.map((data, index) => {
              const formatValue = (val: number, isCurrency?: boolean) => {
                if (isCurrency) {
                  return `$${new Intl.NumberFormat('en-US').format(val || 0)}`;
                }
                return new Intl.NumberFormat('en-US').format(val || 0);
              };

              return (
                <div key={index} className="flex flex-row items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0 h-full">
                  {/* LADO IZQUIERDO (~58% del ancho): Renderiza la barra/gráfico visual de la métrica individual */}
                  <div className="w-[58%] flex flex-col justify-center gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight truncate">{data.name}</span>
                      {showComparison && previousRoute && (
                        <span className="text-sm sm:text-base font-bold text-[#1E3A8A] tracking-wider shrink-0">
                          Ant: {data.prevReal}%
                        </span>
                      )}
                    </div>
                    
                    <div className="w-full flex flex-col gap-1">
                      {/* Barra Actual */}
                      <div className="w-full bg-slate-100 h-3 sm:h-3.5 rounded-full overflow-hidden flex relative">
                        <div 
                          className="h-full rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${Math.min(100, Math.max(0, data.real))}%`, 
                            backgroundColor: data.color 
                          }}
                        />
                      </div>

                      {/* Barra Anterior (Si está habilitada la comparación) */}
                      {showComparison && previousRoute && (
                        <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full rounded-full transition-all duration-300 bg-[#1E3A8A]" 
                            style={{ width: `${Math.min(100, Math.max(0, data.prevReal))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LADO DERECHO (~42% del ancho): Panel de datos crudos estático y directo (SIN SCROLLBAR), alineado */}
                  <div className="w-[42%] shrink-0 flex items-center justify-between gap-2 pl-3 border-l border-slate-200 h-full">
                    <div className="flex flex-col text-[18px] font-black text-slate-700 leading-snug truncate">
                      <span className="truncate">
                        Meta: <span className="font-black text-slate-900">{formatValue(data.absoluteMeta, data.isCurrency)}</span>
                      </span>
                      <span className="truncate">
                        Real: <span className="font-black text-slate-900">{formatValue(data.absoluteReal, data.isCurrency)}</span>
                      </span>
                    </div>
                    
                    <div 
                      className="px-3 py-1 rounded-md text-white text-[30px] font-black leading-none shadow-2xs shrink-0 text-center min-w-[80px] sm:min-w-[95px]"
                      style={{ backgroundColor: data.color }}
                    >
                      {data.real}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4-Week Bi-weekly worked comparison Line Chart */}
      <div className="bg-white p-[10px] rounded-xl shadow-sm border border-slate-200 h-[450px] flex flex-col mb-1 w-full" style={{ marginTop: '2px', marginLeft: '0px' }}>
        <div className="flex justify-between items-center mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 p-1.5 text-blue-600 rounded-lg border border-blue-100/50">
              <LucideLineChart className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-tighter">
                {show8Weeks ? 'Evolución de Ventas (Últimas 8 Semanas Trabajadas)' : 'Evolución de Ventas (Últimas 4 Semanas Trabajadas)'}
              </h3>
              <button
                onClick={() => setShow8Weeks(!show8Weeks)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all border ${
                  show8Weeks 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${show8Weeks ? 'animate-spin' : ''}`} style={show8Weeks ? { animationDuration: '4s' } : {}} />
                <span>{show8Weeks ? 'Cerrar Comparación' : 'Comparación'}</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50/50 border border-blue-100 text-[10px] font-black uppercase text-blue-600 tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>
              <span>Cierre de Ventas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50/50 border border-emerald-100 text-[10px] font-black uppercase text-emerald-600 tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <span>Cajas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-50/50 border border-purple-100 text-[10px] font-black uppercase text-purple-600 tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span>
              <span>Cobranza</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full -mt-2">
          <ResponsiveContainer key={`evolution-chart-${evolutionData.length}`} width="100%" height="100%">
            <LineChart data={evolutionData} margin={{ top: 10, right: 25, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 800}} 
                dy={10}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                width={45}
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 700}}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{stroke: '#f8fafc', strokeWidth: 20}}
                wrapperStyle={{ zIndex: 1000 }}
                content={(props: any) => {
                  const { active, payload, label } = props;
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 min-w-[200px] transform -translate-y-2 relative z-50">
                        <h4 className="text-[14px] font-black text-slate-800 uppercase tracking-wider mb-2">{label}</h4>
                        <div className="flex flex-col gap-2">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{entry.name}</span>
                              <div className="flex items-end justify-between gap-4 pb-0.5">
                                <span className="text-[28px] sm:text-[31px] font-black leading-none text-white tracking-wide py-0.5" style={{ WebkitTextStroke: '1.2px black', color: entry.stroke || entry.color || '#fff' }}>
                                  {entry.value}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                name="Cierre de Ventas"
                type="monotone" 
                dataKey="Cierre de Ventas (%)" 
                stroke="#3B82F6" 
                strokeWidth={3.5} 
                activeDot={{ r: 8 }} 
                dot={{ stroke: '#3B82F6', strokeWidth: 2, r: 4, fill: '#fff' }}
                connectNulls={true}
              />
              <Line 
                name="Cajas Vendidas"
                type="monotone" 
                dataKey="Cajas Vendidas (%)" 
                stroke="#10B981" 
                strokeWidth={3.5} 
                activeDot={{ r: 8 }}
                dot={{ stroke: '#10B981', strokeWidth: 2, r: 4, fill: '#fff' }}
                connectNulls={true}
              />
              <Line 
                name="Cobranza Lograda"
                type="monotone" 
                dataKey="Cobranza Lograda (%)" 
                stroke="#8B5CF6" 
                strokeWidth={3.5} 
                activeDot={{ r: 8 }}
                dot={{ stroke: '#8B5CF6', strokeWidth: 2, r: 4, fill: '#fff' }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dynamic Custom Charts Panel (Created by admin Verónica) */}
      {customCharts && customCharts.length > 0 && (
        <div id="dynamic-charts-section" className="space-y-6">
          <div className="flex items-center gap-3 border-l-4 border-purple-500 pl-6 py-1">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              Gráficos Estadísticos Adicionales
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              (Estructura dinámica de gerencia)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {customCharts.map(chart => {
              // Calculate chart data based on scope and KPIs
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const chartData = useMemo(() => {
                const isCore = ['clients', 'boxes', 'collection'].includes(chart.kpiId);
                
                if (chart.scope === 'all') {
                  // Across all routes in the current week
                  let weekRoutes = (selectedWeek && historicalData?.[selectedWeek]) || [];
                  if (weekRoutes.length === 0) {
                    weekRoutes = [route];
                  } else {
                    weekRoutes = weekRoutes.map(r => r.id === route.id ? route : r);
                  }

                  return weekRoutes.map(r => {
                    let meta = 0;
                    let real = 0;
                    if (chart.kpiId === 'clients') {
                      meta = r.clients?.meta || 0;
                      real = r.clients?.real || 0;
                    } else if (chart.kpiId === 'boxes') {
                      meta = r.boxes?.meta || 0;
                      real = r.boxes?.real || 0;
                    } else if (chart.kpiId === 'collection') {
                      meta = r.collection?.meta || 0;
                      real = r.collection?.real || 0;
                    } else {
                      const custom = r.customKpis?.[chart.kpiId];
                      meta = custom?.meta || 0;
                      real = custom?.real || 0;
                    }
                    return {
                      name: r.name.includes(' - ') ? r.name.split(' - ')[1] : r.name,
                      'Meta Objetivo': meta,
                      'Valor Real': real
                    };
                  });
                } else {
                  // Historical evolution for a single specific route
                  const trId = chart.scope;
                  const match = selectedWeek?.match(/^week-(\d+)-2026$/);
                  const currentW = match ? parseInt(match[1], 10) : 6;
                  const targetWeeks = [currentW - 6, currentW - 4, currentW - 2, currentW].filter(w => w >= 1);

                  return targetWeeks.map(w => {
                    const wId = `week-${w}-2026`;
                    let wRoutes = historicalData?.[wId] || [];
                    if (wId === selectedWeek) {
                      wRoutes = [route];
                    }
                    const targetRoute = wRoutes.find(r => r.id === trId);
                    
                    let meta = 0;
                    let real = 0;
                    if (targetRoute) {
                      if (chart.kpiId === 'clients') {
                        meta = targetRoute.clients?.meta || 0;
                        real = targetRoute.clients?.real || 0;
                      } else if (chart.kpiId === 'boxes') {
                        meta = targetRoute.boxes?.meta || 0;
                        real = targetRoute.boxes?.real || 0;
                      } else if (chart.kpiId === 'collection') {
                        meta = targetRoute.collection?.meta || 0;
                        real = targetRoute.collection?.real || 0;
                      } else {
                        const custom = targetRoute.customKpis?.[chart.kpiId];
                        meta = custom?.meta || 0;
                        real = custom?.real || 0;
                      }
                    }
                    return {
                      name: `Sem. ${w}`,
                      'Meta Objetivo': targetRoute ? meta : null,
                      'Valor Real': targetRoute ? real : null
                    };
                  });
                }
              }, [chart, selectedWeek, historicalData, route]);

              const kpiLabel = kpis.find(k => k.id === chart.kpiId)?.label || chart.kpiId;

              return (
                <div key={chart.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#2E86C1] tracking-widest block">Gráfico Estadístico</span>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter mt-0.5">{chart.title}</h4>
                    </div>
                    <div className="flex gap-1">
                      <span className="text-[9px] font-black uppercase bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                        {chart.type}
                      </span>
                      <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 truncate max-w-[120px]">
                        KPI: {kpiLabel}
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                          <YAxis width={40} tick={{fill: '#94a3b8', fontSize: 10}} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value: number) => [<span style={{fontSize: '19px', fontWeight: '900'}}>{value}</span>]} />
                          <Bar name="Meta" dataKey="Meta Objetivo" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                          <Bar name="Real" dataKey="Valor Real" fill={chart.color || "#8B5CF6"} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : chart.type === 'line' ? (
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                          <YAxis width={40} tick={{fill: '#94a3b8', fontSize: 10}} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value: number) => [<span style={{fontSize: '19px', fontWeight: '900'}}>{value}</span>]} />
                          <Line name="Meta" type="monotone" dataKey="Meta Objetivo" stroke="#93C5FD" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={true} />
                          <Line name="Real" type="monotone" dataKey="Valor Real" stroke={chart.color || "#8B5CF6"} strokeWidth={2.5} dot={{ r: 4 }} connectNulls={true} />
                        </LineChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                          <YAxis width={40} tick={{fill: '#94a3b8', fontSize: 10}} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value: number) => [<span style={{fontSize: '19px', fontWeight: '900'}}>{value}</span>]} />
                          <Area name="Meta" type="monotone" dataKey="Meta Objetivo" fill="#93C5FD" stroke="#93C5FD" fillOpacity={0.15} connectNulls={true} />
                          <Area name="Real" type="monotone" dataKey="Valor Real" fill={chart.color || "#8B5CF6"} stroke={chart.color || "#8B5CF6"} fillOpacity={0.25} connectNulls={true} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Feedback Panel - Gerente Virtual */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none scale-150 origin-top-right">
          <BrainCircuit className="w-64 h-64" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-white/10">
            <div className="flex items-center gap-5">
              <div className="bg-blue-500 p-4 rounded-2xl shadow-xl shadow-blue-500/20">
                <BrainCircuit className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">Análisis de Gerencia Virtual</h2>
                <p className="text-sm font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">Feedback Estratégico Senior</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isAnalyzing ? 'Analizando...' : 'Consultar Gemini'}
              </button>
              <div className="flex items-center gap-2 px-5 py-2 bg-white/5 rounded-full border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {aiAnalysis ? 'IA Generativa Activa' : 'Algoritmo Verificado'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-blue-400 mb-5">
                <TrendingUp className="w-6 h-6" />
                <h4 className="text-base font-black uppercase tracking-widest">Diagnóstico Actual</h4>
              </div>
              <p className="text-slate-300 text-xl leading-relaxed font-medium">
                {displayAnalysis.diagnostic}
              </p>
            </div>

            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-rose-400 mb-5">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="text-base font-black uppercase tracking-widest">Punto de Fricción</h4>
              </div>
              <p className="text-slate-300 text-xl leading-relaxed font-medium">
                {displayAnalysis.painPoint}
              </p>
            </div>

            <div className="bg-[#2E86C1]/20 p-8 rounded-3xl border border-[#2E86C1]/30 hover:bg-[#2E86C1]/30 transition-colors group">
              <div className="flex items-center gap-3 text-emerald-400 mb-5">
                <Lightbulb className="w-6 h-6 group-hover:animate-bounce" />
                <h4 className="text-base font-black uppercase tracking-widest">Consejo de Ventas</h4>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-white text-xl leading-relaxed font-bold italic">
                  "{displayAnalysis.opportunity}"
                </p>
              </div>
            </div>

            <div className="bg-emerald-900/20 p-8 rounded-3xl border border-emerald-500/30 hover:bg-emerald-900/30 transition-colors">
              <div className="flex items-center gap-3 text-emerald-400 mb-5">
                <Banknote className="w-6 h-6" />
                <h4 className="text-base font-black uppercase tracking-widest">Efectividad Divisas</h4>
              </div>
              <p className="text-slate-300 text-xl leading-relaxed font-medium">
                {displayAnalysis.cashInsight}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MetricCard: React.FC<{ 
  label: string, 
  value: number, 
  meta: number, 
  icon: React.ReactNode, 
  color: string,
  isCurrency?: boolean,
  unit?: string,
  previousValue?: number,
  previousMeta?: number
}> = ({ label, value, meta, icon, color, isCurrency, unit, previousValue, previousMeta }) => {
  const percent = meta > 0 ? Math.round((value / meta) * 100) : 0;
  
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-[#2E86C1]/10 group-hover:text-[#2E86C1] transition-colors">
          {icon}
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{label}</span>
          <div className="flex items-center justify-end gap-2 mt-2">
             <div className="w-3 h-3 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: color }}></div>
             <span className="text-5xl font-black text-slate-800 leading-none">{percent}%</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-end justify-between bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Resultado</p>
          <p className="text-3xl font-black text-slate-700">
            {isCurrency ? `$${new Intl.NumberFormat('en-US').format(value)}` : value}
            <span className="text-sm font-bold text-slate-400 ml-1 uppercase">{unit}</span>
          </p>
        </div>
        <div className="text-right border-l border-slate-200 pl-6">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Meta</p>
          <p className="text-lg font-bold text-slate-400">
            {isCurrency ? `$${new Intl.NumberFormat('en-US').format(meta)}` : meta}
          </p>
        </div>
      </div>
      
      <div className="mt-8 w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg" 
          style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
        ></div>
      </div>

      {previousValue !== undefined && previousMeta !== undefined && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-black">
          <span className="text-slate-400 uppercase tracking-[0.1em]">Semana Anterior:</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">
              {isCurrency ? `$${new Intl.NumberFormat('en-US').format(previousValue)}` : previousValue}
              {unit && <span className="text-[9px] text-slate-400 font-black ml-0.5">{unit}</span>}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{(previousMeta > 0 ? Math.round((previousValue / previousMeta) * 100) : 0)}%</span>
            {(() => {
              const currentPct = percent;
              const prevPct = previousMeta > 0 ? Math.round((previousValue / previousMeta) * 100) : 0;
              const diffPct = currentPct - prevPct;
              if (diffPct > 0) {
                return (
                  <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full text-[9px]">
                    ▲ +{diffPct}%
                  </span>
                );
              } else if (diffPct < 0) {
                return (
                  <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full text-[9px]">
                    ▼ {diffPct}%
                  </span>
                );
              } else {
                return (
                  <span className="bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-full text-[9px]">
                    = 0%
                  </span>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
