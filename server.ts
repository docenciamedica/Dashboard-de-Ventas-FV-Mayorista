import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Body parser limit increased to support batch route lists
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Route Analysis API proxy (migrating client-side analytics to server-side)
  app.post("/api/gemini/analyze", async (req, res): Promise<any> => {
    try {
      const { routeData, previousRouteData, evolutionData } = req.body;
      if (!routeData) {
        return res.status(400).json({ error: "No route data provided" });
      }

      const prompt = `
        Eres un Asesor Comercial Estratégico Senior experto en el mercado de distribución masiva y venta de licores en VENEZUELA. Tu cliente es "FV MEGAMAYORISTA", distribuidor líder de rones (ej. rones añejos DOC de Venezuela como Santa Teresa, Cacique, Pampero), cervezas (ej. cerveza Polar, Regional), licores secos o nacionales y espirituosos premium importados a licorerías tradicionales, bodegones, supermercados, minimarkets y locales de consumo.
        
        Debes realizar un análisis comercial de alta relevancia, totalmente alineado con los datos de las tablas y gráficos proporcionados. El análisis debe estar impregnado de realismo socioeconómico venezolano actual (alta dolarización transaccional, inflación, picos de venta según la quincena laboral, escasez logística de combustible, falta absoluta de crédito bancario institucional, etc.).
        
        DATOS ACTUALES DE LA JORNADA/RUTA:
        - Nombre de la Ruta: ${routeData.name}
        - Cobertura de Clientes: Real ${routeData.clients?.real ?? 0} atendidos de una meta de ${routeData.clients?.meta ?? 0} (Clientes totales de cartera activa: ${routeData.totalClients ?? 0}, Clientes realmente visitados en esta jornada: ${routeData.visitedClients ?? 0})
        - Volumen Vendido (Cajas): Real ${routeData.boxes?.real ?? 0} cajas de una meta planificada de ${routeData.boxes?.meta ?? 0} cajas.
        - Cobranza Lograda ($ USD): Real $${routeData.collection?.real ?? 0} de una meta de cobranza de $${routeData.collection?.meta ?? 0}.
        - Divisas Captadas (Efectivo USD): $${routeData.divisas ?? 0} en cash / billetes norteamericanos. (Porcentaje de liquidez en efectivo: ${routeData.collection?.real > 0 ? Math.round(((routeData.divisas ?? 0) / routeData.collection.real) * 100) : 0}%)

        ${previousRouteData ? `
        COMPARACIÓN CON LA ANTERIOR JORNADA TRABAJADA (-15 DÍAS):
        - Ruta visitada y trabajada hace exactamente 15 días (debido a la frecuencia quincenal establecida para licorerías y bodegones).
        - Clientes atendidos anteriores: ${previousRouteData.clients?.real ?? 0}
        - Cajas vendidas anteriores: ${previousRouteData.boxes?.real ?? 0}
        - Cobranza anterior: $${previousRouteData.collection?.real ?? 0}
        - Divisas en efectivo anteriores: $${previousRouteData.divisas ?? 0}
        ` : ''}

        ${evolutionData && evolutionData.length > 0 ? `
        TENDENCIA HISTÓRICA BI-SEMANAL (Últimas semanas trabajadas según historial de frecuencia quincenal):
        ${JSON.stringify(evolutionData, null, 2)}
        ` : ''}

        DIRECTRICES SOCIOECONÓMICAS Y COMERCIALES PARA ENRIQUECER EL ANÁLISIS (MERCADO DE LICORES DE VENEZUELA):
        1. Frecuencia Quincenal (Ruta trabajada cada 15 días): La rotación de marcas y el abastecimiento en bodegones y licorerías tradicionales se rige bajo la "quincena del asalariado" en Venezuela (fines de semana del 15 y 30/31). No cubrir la visita quincenal de manera óptima deja un vacío enorme que aprovechan de inmediato los camiones mayoristas paralelos independientes o licores de contrabando sin aranceles.
        2. Liquidación en Divisas Físicas ($ Efectivo) y Liquidez de la Vertical: Para la liquidez de divisas de la vertical de los negocios de licores, no establezca una meta específica o fija de divisas físicas (como exigir 50% arbitrariamente). Sin embargo, siempre se debe exigir un porcentaje mínimo de 1% en divisas físicas (efectivo $) sobre el total de la cobranza quincenal para garantizar la liquidez básica, lo cual es obligatorio para reponer lotes ágiles con fabricantes nacionales y cubrir aranceles.
        3. Clientes Inactivos y Territorio: Si los clientes atendidos caen por debajo de la meta, en Venezuela se asocia a: dificultades de transporte/combustible (gasolina o gasoil para recorrer la ruta), migración/cierre temporal de bodegas de licores de barrio, o la pérdida de cuentas tradicionales ante distribuidores informales paralelos de bajo costo. 
        4. El Flujo de Caja (Cobranza): Al no haber créditos bancarios, FV MEGAMAYORISTA y el promotor financian el ciclo de licores con cobranza activa. Si la cobranza real está por debajo de los objetivos, la distribución se paraliza completamente ya que no se puede renovar stock a los productores.
        5. Ganancias por Comisión de Ventas y Exclusión de Bonos: Importante: En FV MEGAMAYORISTA NO se ofrecen ni existen bonos fijos recurrentes por productividad. Las ganancias de los promotores y vendedores se rigen única y exclusivamente por un porcentaje de comisión sobre la venta específica lograda. A mayor volumen y valor de la venta generada, corresponde un tramo de porcentaje de ganancia directa superior (comisión escalonada/progresiva). Enmarca el análisis estratégico bajo esta realidad: superarse significa subir de tramo porcentual.

        CONSTRUYE EL MENSAJE:
        - Léxico comercial y local: Usa términos realistas de la industria de licores venezolana como "bodegón", "licorería tradicional de zona", "tasa del BCV", "IGTF bancario", "quincena de ventas", "combos quincenales", "rótulo de marcas", "ruptura de stock en anaquel", "ron premium DOC", "comisiones de venta", "porcentaje de ganancia escalonada".
        - Alineación con cifras: Se sumamente preciso. Compara las cajas, clientes, cobranza y divisas reales de hoy contra lo recolectado hace 15 días y evalúa las líneas de tendencia de las últimas 4 visitas del historial.
        
        ESTRUCTURA DE RESPUESTA:
        Responde única y estrictamente en formato JSON con las llaves detalladas abajo. NO incluyas markdown, texto adicional explicativo ni prefijos exteriores a las llaves. Solo el JSON plano:
        {
          "diagnostic": "Un resumen ejecutivo detallado conectando la cobertura de clientes, el volumen de cajas de licores despachadas y la cobranza de esta jornada. Señala el progreso de ventas analizando cómo maximiza su porcentaje de comisión escalonada (ganancia basada en volumen de venta, sin bonos fijos quincenales), comparado con la quincena anterior.",
          "painPoint": "El obstáculo operativo o financiero más evidente de esta ruta lincado directamente a la fluctuación del mercado de licores en Venezuela o deficiencias en el barrido o cobro.",
          "opportunity": "Acción estratégica e inmediata llave en mano para capturar más volumen y escalar el porcentaje de venta obtenido. Ejemplo: combos de marcas de licores de alta y baja rotación, promociones de quincena en rones premium o rutas de rescate de cuentas inactivas.",
          "cashInsight": "Estrategia de tesorería y liquidez evaluando el efectivo captado ($ divisas físicas) contra el total de cobranza. Exige siempre el cumplimiento de la norma administrativa del 1% mínimo de efectivo para blindar la liquidez de divisas de la vertical comercial de licores de FV, sin imponer metas rígidas de divisas superiores."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnostic: { type: Type.STRING },
              painPoint: { type: Type.STRING },
              opportunity: { type: Type.STRING },
              cashInsight: { type: Type.STRING },
            },
            required: ["diagnostic", "painPoint", "opportunity", "cashInsight"],
          },
        },
      });

      if (!response.text) {
        throw new Error("No text response from Gemini");
      }

      res.json(JSON.parse(response.text.trim()));
    } catch (e: any) {
      // Gracefully handle 503s due to high demand
      if (e?.status === 503 || e?.message?.includes("503") || e?.message?.includes("UNAVAILABLE")) {
         console.warn("Gemini analyze proxy: High demand (503). Falling back to client logic.");
         return res.status(503).json({ error: "High demand" });
      }
      console.error("Gemini route analysis error:", e);
      res.status(500).json({ error: e.message || "Route analysis failed" });
    }
  });

  // Data COHERENCE checks BEFORE saving (The core function requested by user)
  app.post("/api/gemini/validate", async (req, res): Promise<any> => {
    try {
      const { routes, selectedWeek } = req.body;
      if (!routes || !Array.isArray(routes)) {
        return res.status(400).json({ error: "Invalid routes data body" });
      }

      const prompt = `
        Eres un Analista y Evaluador Financiero/Auditor Senior de "FV MEGAMAYORISTA", el holding de ventas líder en distribución de cerveza, rones premium y licores en el territorio venezolano.
        Tu tarea prioritaria consiste en escanear el lote de datos quincenales ingresados para la semana '${selectedWeek}' y detectar inconsistencias lógicas (ej: "dedazos" al escribir números, bizarros desbalances operacionales). Emitirás advertencias con sugerencias lógicas si el volumen vendido o clientes no cuadran con las cobranzas logradas.

        DATOS DE LAS RUTAS REPORTADAS A RESPALDAR:
        ${JSON.stringify(routes, null, 2)}

        INCONSISTENCIAS Y PATRONES PROBLEMÁTICOS A IDENTIFICAR:
        1. Volumen Desmesurado vs. Baja Cobranza (Crítico): Si una ruta registra un volumen vendido enorme (ej: más de 250 cajas de licores) pero una cobranza ridículamente baja (ej: menos de $100), es un error de tipeo cantado, o representa un volumen entregado sin cobranza real que pone en peligro de default la logística. (Exceptuar si las metas de cobranza ya eran originalmente $0 y es una ruta de solo reposición, pero igual reportar).
        2. Cobranza desmesurada vs. Cajas vendidas: Un cobro de miles de dólares pero con 0 o 1 caja vendida. Esto ocurre si se están cobrando facturas viejas en mora (válido), pero es prudente advertir para confirmar si se trata de cobranza histórica o error de captura.
        3. Cobro en Efectivo (Divisas) Mayor que Cobranza Total (Imposible): El dinero obtenido en divisas físicas ($ efectivo captado) NO PUEDE ser estrictamente mayor que el monto de la "cobranza lograda real". Si divisas > collection.real, hay un error contable insalvable en los números.
        4. Clientes atendidos mayores que lo visitado/existente: Si real atendidos ("clients.real") es mayor que visitados ("visitedClients") o meta de cobertura, o es mayor que los clientes totales asignados de la cartera activa ("totalClients"), es un error físico imposible.
        5. Cero clientes pero con volumen físico o cobranza cargada.
        6. Metas y reales con números incoherentes o negativos.

        INSTRUCCIONES DE RESPUESTA:
        Debes responder única y estrictamente un objeto JSON. NO uses markdown, ni bloques de código de triple acento grave (\`\`\`), ni explicaciones fuera del JSON.
        El esquema del JSON debe ser el siguiente:
        {
          "hasInconsistencies": true, // Pon true si encuentras algún error o desbalance sospechoso. De lo contrario, pon false.
          "warnings": [
            {
              "type": "error", // Usa "error" si es imposible (ej: divisas > cobranza), o "warning" si es inusual comercialmente (ej: 400 cajas vendidas pero $10 de cobranza)
              "routeId": "ID_DE_LA_RUTA_NIVEL_COMPONENTE",
              "routeName": "Nombre del Vendedor de la Ruta",
              "field": "boxes", // Puede ser "boxes", "collection", "clients", "divisas", o "general"
              "message": "Mensaje en español claro, profesional y empático para el operador.",
              "recommendation": "Sugerencia amable de qué número revisar o corregir antes de dar por guardado."
            }
          ]
        }

        Nota de seguridad: Si todos los datos hacen perfecto sentido lógico matemático comercial, responde con hasInconsistencies = false y warnings = []. No catalogues alertas inexistentes si las proporciones son saludables. Redacta los mensajes enfocándote en la distribución masiva de licores en Venezuela con cordialidad.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasInconsistencies: { type: Type.BOOLEAN },
              warnings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "severity: error or warning" },
                    routeId: { type: Type.STRING },
                    routeName: { type: Type.STRING },
                    field: { type: Type.STRING },
                    message: { type: Type.STRING, description: "Detailed summary of logical mismatch in Spanish" },
                    recommendation: { type: Type.STRING, description: "Actionable fix recommendation in Spanish" }
                  },
                  required: ["type", "routeId", "routeName", "field", "message", "recommendation"]
                }
              }
            },
            required: ["hasInconsistencies", "warnings"]
          }
        }
      });

      if (!response.text) {
        throw new Error("No validator response from Gemini");
      }

      res.json(JSON.parse(response.text.trim()));
    } catch (e: any) {
      // Gracefully handle 503s due to high demand without crashing the logs
      if (e?.status === 503 || e?.message?.includes("503") || e?.message?.includes("UNAVAILABLE")) {
         console.warn("Gemini validation proxy: High demand (503). Falling back to client logic.");
         return res.status(503).json({ error: "High demand" });
      }
      console.error("Gemini coherence validation error:", e);
      res.status(500).json({ error: e.message || "Data validation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
