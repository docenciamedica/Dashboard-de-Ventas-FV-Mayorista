import { generateSeniorTerritorialAnalysis } from './territorialIntelligence';

export interface GeminiAnalysis {
  diagnostic: string;
  painPoint: string;
  opportunity: string;
  cashInsight: string;
}

export interface GeminiWarning {
  type: 'error' | 'warning';
  routeId: string;
  routeName: string;
  field: string;
  message: string;
  recommendation: string;
}

export interface GeminiValidationResult {
  hasInconsistencies: boolean;
  warnings: GeminiWarning[];
}

export async function analyzeRouteData(
  routeData: any,
  previousRouteData?: any,
  evolutionData?: any[]
): Promise<GeminiAnalysis> {
  try {
    const response = await fetch("/api/gemini/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        routeData,
        previousRouteData,
        evolutionData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (!error.message?.includes('503')) {
      console.warn("Falling back to local analyze data due to API warning:", error.message);
    }
      // High-precision senior territorial intelligence engine
    return generateSeniorTerritorialAnalysis(routeData, previousRouteData);
  }
}

export async function validateWeekData(
  routes: any[],
  selectedWeek: string
): Promise<GeminiValidationResult> {
  try {
    const response = await fetch("/api/gemini/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        routes,
        selectedWeek,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (!error.message?.includes('503')) {
      console.warn("Falling back to local validation due to API warning:", error.message);
    }
    // Default client-side validation logic if server-side Gemini is offline or fails
    const warnings: GeminiWarning[] = [];
    
    for (const route of routes) {
      const isLargeVolumeLowCollection = (route.boxes?.real > 100) && (route.collection?.real < 50);
      const isDivisasLargerThanCollection = (route.divisas ?? 0) > (route.collection?.real ?? 0);
      const isVisitedFewerThanAttended = (route.clients?.real ?? 0) > (route.visitedClients ?? 0);

      if (isLargeVolumeLowCollection) {
        warnings.push({
          type: "warning",
          routeId: route.id,
          routeName: route.name,
          field: "boxes",
          message: `La ruta de '${route.name}' reporta un volumen de ventas física desproporcionadamente alto (${route.boxes?.real} cajas) pero una cobranza extremadamente baja ($${route.collection?.real}).`,
          recommendation: "Por favor revisa si las cajas o la cobranza fueron digitadas incorrectamente."
        });
      }
      if (isDivisasLargerThanCollection) {
        warnings.push({
          type: "error",
          routeId: route.id,
          routeName: route.name,
          field: "divisas",
          message: `Error matemático en '${route.name}': Las divisas físicas ($${route.divisas}) exceden la cobranza total lograda ($${route.collection?.real}).`,
          recommendation: "Corrige el campo de divisas o incrementa la cobranza lograda total."
        });
      }
      if (isVisitedFewerThanAttended) {
        warnings.push({
          type: "error",
          routeId: route.id,
          routeName: route.name,
          field: "clients",
          message: `Incoherencia de cobertura en '${route.name}': Los clientes atendidos reales (${route.clients?.real}) superan a los clientes visitados hoy o de total de cartera.`,
          recommendation: "Ajusta los clientes atendidos o visitados de la ruta para mantener consistencia física."
        });
      }
    }

    return {
      hasInconsistencies: warnings.length > 0,
      warnings
    };
  }
}
