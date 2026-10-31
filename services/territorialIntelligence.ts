import { RouteData, Analysis } from '../types';
import {
  calculateClosingRate,
  calculatePercentage,
  calculateCashRatio,
  formatCurrency,
  formatInteger,
} from './financialMath';

export interface ZoneProfile {
  id: string;
  name: string;
  region: string;
  marketType: string;
  tradeDynamics: string;
  logisticsChallenge: string;
  liquidityProfile: string;
  tacticalDirectives: string[];
}

/**
 * Catálogo Maestro de Inteligencia Territorial de FV MEGAMAYORISTA
 * Contiene los perfiles de mercado, desafíos logísticos, dinámicas de cobro
 * y patrones de consumo para cada zona comercial atendida en Venezuela.
 */
export const ZONE_PROFILES: Record<string, ZoneProfile> = {
  GUANARE: {
    id: 'GUANARE',
    name: 'Guanare (Casco Central y Corredores)',
    region: 'Portuguesa (Centro-Sur)',
    marketType: 'Comercio Urbano-Tradicional y Bodegones de Paso',
    tradeDynamics: 'Mercado central con alta rotación en licorerías de barrio y bodegones en corredores hacia Barinas. Consumo masivo de cerveza retornable y rones añejos en fines de semana quincenales.',
    logisticsChallenge: 'Paradas urbanas cercanas pero alta rotación de inventario en clientes pequeños. Riesgo de acumulación de facturas viejas por exceso de confianza.',
    liquidityProfile: 'Flujo mixto de pago móvil, transferencias inmediatas y divisas en efectivo ($). La captación de cash físico es clave para la reposición ágil con destilerías.',
    tacticalDirectives: [
      'Detener despachos a crédito sin cancelar saldo vencido de la quincena anterior.',
      'Activar combos de rones añejos DOC (Santa Teresa, Cacique) con cerveza de alta rotación para elevar el ticket.',
      'Exigir al menos el 1% administrativo en divisas físicas en cada punto de venta.',
    ],
  },
  LA_PUERTA: {
    id: 'LA_PUERTA',
    name: 'La Puerta Guanare (Corredor Periurbano)',
    region: 'Portuguesa (Periurbana)',
    marketType: 'Paradas de Carretera, Estaderos y Licorerías de Paso',
    tradeDynamics: 'Puntos de venta de alto flujo de paso hacia la zona alta. Venta masiva de cerveza fría y licores de consumo rápido para fin de semana.',
    logisticsChallenge: 'Ruta lineal donde cada parada debe estar bien abastecida de frío para no perder ventas ante depósitos de paso.',
    liquidityProfile: 'Buen flujo de divisas en efectivo ($) por compras rápidas de viajeros y transportistas.',
    tacticalDirectives: [
      'Garantizar stock de cajas completas de cerveza en lata y rones listos para consumo.',
      'Cero tolerancia a créditos abiertos en paradas de carretera: cobro contra entrega.',
      'Captar divisas físicas en billetes limpios para alimentar la caja matriz.',
    ],
  },
  BOCONO: {
    id: 'BOCONO',
    name: 'Boconó (Jardín de Venezuela / Ruta Andina)',
    region: 'Trujillo (Alta Montaña)',
    marketType: 'Comercio Andino Tradicional y Bodegas de Altura',
    tradeDynamics: 'Mercado montañoso con comercios familiares de alto arraigo. Consumo acentuado de rones añejos, licores secos y espirituosos para clima templado-frío.',
    logisticsChallenge: 'Topografía escarpada con alto costo de transporte, desgaste de flota y consumo de combustible. Cada parada no convertida encarece el flete.',
    liquidityProfile: 'Alta circulación de divisas en efectivo ($) resguardadas como valor refugio por comerciantes andinos.',
    tacticalDirectives: [
      'Exigir pedido mínimo de 8 a 10 cajas por parada para rentabilizar el flete andino.',
      'Venta cruzada de rones de alta graduación y licores tradicionales de consumo invernal.',
      'Captar un alto porcentaje de divisas físicas aprovechando la liquidez en cash del comerciante andino.',
    ],
  },
  VALERA: {
    id: 'VALERA',
    name: 'Valera (Capital Comercial de Trujillo)',
    region: 'Trujillo (Eje Metropolitano)',
    marketType: 'Bodegones Modernos, Cadenas y Mayoristas Competitivos',
    tradeDynamics: 'Mercado urbano denso con alta rivalidad comercial. Fuerte presencia de mayoristas foráneos de Lara y Zulia. Exige marcas líderes y rones premium.',
    logisticsChallenge: 'Velocidad de despacho crítica; si el cliente se queda sin producto, acude al distribuidor competidor en menos de 24 horas.',
    liquidityProfile: 'Transferencias bancarias y divisas en efectivo en bodegones céntricos de alto poder adquisitivo.',
    tacticalDirectives: [
      'Priorizar la atención a bodegones líderes con ofertas de volumen quincenal.',
      'Control riguroso de cuentas por cobrar para no financiar a clientes que trabajan con la competencia.',
      'Proteger la presencia de anaquel de las marcas exclusivas de FV MEGAMAYORISTA.',
    ],
  },
  ACARIGUA_CENTRO: {
    id: 'ACARIGUA_CENTRO',
    name: 'Acarigua Centro (Eje Mayorista y Agroindustrial)',
    region: 'Portuguesa (Norte)',
    marketType: 'Mayoristas, Bodegones de Gran Escala y Licorerías Céntricas',
    tradeDynamics: 'Epicentro comercial e industrial más competido de Portuguesa. Compradores expertos que comparan precios por caja entre distribuidores paralelos.',
    logisticsChallenge: 'Rotación acelerada. La falta de stock puntual provoca pérdida inmediata del espacio comercial.',
    liquidityProfile: 'Cuentas bancarias de empresas y transferencias; el efectivo debe incentivarse comercialmente.',
    tacticalDirectives: [
      'Amarrar la venta de cerveza masiva con rones DOC nacionales para preservar el margen de ganancia.',
      'Plazo máximo de cobro de 7 días: no dejar capital atrapado en la calle.',
      'Revisar inventarios quincenales de los 10 clientes de mayor volumen de la zona.',
    ],
  },
  ACARIGUA_SUR: {
    id: 'ACARIGUA_SUR',
    name: 'Acarigua Zona Sur (Circuito Popular Urbano)',
    region: 'Portuguesa (Urbano-Popular)',
    marketType: 'Licorerías Tradicionales de Barriada y Depósitos Populares',
    tradeDynamics: 'Consumo masivo de cerveza y licores secos de rotación diaria. Sensible a los días de cobro de nómina obrera.',
    logisticsChallenge: 'Riesgo de micro-créditos incobrables. Clientes que intentan operar con mercancía fiada.',
    liquidityProfile: 'Pago móvil masivo y divisas fraccionadas ($1 a $20).',
    tacticalDirectives: [
      'Despacho estrictamente contra pago de factura anterior: no extender crédito informal.',
      'Estandarizar drop-size en cajas cerradas de rotación rápida para agilizar las entregas.',
      'Verificar autenticidad de divisas físicas en baja denominación.',
    ],
  },
  BARINAS_SOCOPO: {
    id: 'BARINAS_SOCOPO',
    name: 'Barinas - Socopó (Troncal 5 / Eje Ganadero)',
    region: 'Barinas (Piedemonte / Troncal 5)',
    marketType: 'Licorerías de Carretera, Tascas y Bodegones Ganaderos',
    tradeDynamics: 'Economía vigorosa impulsada por el ganado, queso y madera. Clientes de gran capacidad de compra y consumo sostenido.',
    logisticsChallenge: 'Ruta de 90 km sobre la Troncal 5; requiere cubicaje eficiente del camión para evitar devoluciones.',
    liquidityProfile: 'Abundancia de dólares en efectivo provenientes del sector pecuario; máxima facilidad para captar divisas.',
    tacticalDirectives: [
      'Exigir entre 10% y 25% de la cobranza en divisas físicas ($ efectivo) aprovechando el flujo de la zona.',
      'Colocar rones extra añejos y espirituosos de gama media-alta demandados por productores pecuarios.',
      'Sincronizar visitas de cobro con días de subastas ganaderas y ferias locales.',
    ],
  },
  BARINAS_BARINITAS: {
    id: 'BARINAS_BARINITAS',
    name: 'Barinas - Barinitas (Puerta del Llano)',
    region: 'Barinas (Norte)',
    marketType: 'Bodegones Familiares y Licorerías Metropolitanas',
    tradeDynamics: 'Conexión urbana entre Barinas y el piedemonte. Buena aceptación de combos promocionales y licores para reuniones de fin de semana.',
    logisticsChallenge: 'Distribución ágil combinando clientes del casco urbano con paradas en ascenso hacia Barinitas.',
    liquidityProfile: 'Equilibrio entre transacciones bancarias electrónicas y divisas en billetes.',
    tacticalDirectives: [
      'Lanzar combos quincenales para locales de fin de semana.',
      'Reactivar licorerías tradicionales inactivas en el circuito Barinitas.',
      'Mantener disciplina en el cumplimiento del 1% obligatorio de efectivo.',
    ],
  },
  SAN_CARLOS: {
    id: 'SAN_CARLOS',
    name: 'San Carlos - San Rafael (Eje Troncal Cojedes)',
    region: 'Cojedes / Portuguesa',
    marketType: 'Licorerías de Poblado y Bodegas Semi-rurales',
    tradeDynamics: 'Comunidades donde la licorería cumple rol social. Consumo concentrado en quincenas de empleados y productores locales.',
    logisticsChallenge: 'Distancias intermedias sobre la troncal; visitas sin venta elevan el costo operativo unitario.',
    liquidityProfile: 'Transferencias bancarias electrónicas y pago en divisas en puntos céntricos.',
    tacticalDirectives: [
      'Elevar la efectividad de cierre de ventas al 75%+ coordinando pedidos previos vía telefónica.',
      'No soltar despachos a crédito prolongado en clientes alejados de la troncal principal.',
      'Fomentar la compra de cajas completas de cerveza y ron para asegurar volumen por parada.',
    ],
  },
  TUREN: {
    id: 'TUREN',
    name: 'Turén (Granero Agrícola de Venezuela)',
    region: 'Portuguesa (Eje Agrícola Oriental)',
    marketType: 'Bodegones Agroindustriales y Licorerías de Productores',
    tradeDynamics: 'Economía de cultivo altamente dolarizada (maíz, arroz, girasol). Clientes con fuerte solvencia y preferencia por rones de alta gama y volumen en cajas.',
    logisticsChallenge: 'Ruta agrícola con accesos de tierra; priorizar paradas con drop-size superior a 15 cajas.',
    liquidityProfile: 'Excelente captación de divisas en efectivo ($) por liquidaciones de cosecha de productores.',
    tacticalDirectives: [
      'Colocación prioritaria de rones DOC de reserva y licores premium en bodegones de Turén.',
      'Captar al menos 15% a 20% en divisas físicas gracias a la solvencia en cash de la zona.',
      'Ofrecer incentivos por compra de lotes de 20+ cajas para maximizar cada viaje del camión.',
    ],
  },
  YARACUY: {
    id: 'YARACUY',
    name: 'Yaracuy (San Felipe - Chivacoa - Yaritagua)',
    region: 'Yaracuy (Centro-Occidente)',
    marketType: 'Bodegones de Corredor y Licorerías Urbanas',
    tradeDynamics: 'Mercado dinámico con fuerte flujo vehicular y proximidad a Barquisimeto. Rotación constante de rones líderes y cervezas.',
    logisticsChallenge: 'Amenaza de distribuidores foráneos; se requiere abastecimiento continuo y puntualidad quincenal.',
    liquidityProfile: 'Predominio de medios electrónicos bancarios, con flujo moderado de dólares en efectivo.',
    tacticalDirectives: [
      'Blindar anaqueles con promociones quincenales antes de que entre la competencia foránea.',
      'Asegurar el cumplimiento estricto del 1% de efectivo en cada entrega.',
      'Venta cruzada con rones de alta calidad para elevar la rentabilidad por caja.',
    ],
  },
  SABANETA: {
    id: 'SABANETA',
    name: 'Sabaneta - Dolores (Llano Adentro)',
    region: 'Barinas (Sur-Este)',
    marketType: 'Comercios Tradicionales Llaneros y Licorerías de Pueblo',
    tradeDynamics: 'Poblaciones llaneras de tradición agropecuaria. Demanda concentrada en cervezas bien frías, rones estándar y licores secos.',
    logisticsChallenge: 'Recorridos largos entre Sabaneta y Dolores; cobrar en el sitio es imperativo para no quemar viajes.',
    liquidityProfile: 'Efectivo en billetes de productores campesinos y pago móvil.',
    tacticalDirectives: [
      'Despachos únicamente contra cobro inmediato: cero cartera vencida en el llano profundo.',
      'Combos de volumen de licores secos y cervezas para las licorerías principales del casco.',
      'Verificar billetes de divisas en efectivo en puntos alejados.',
    ],
  },
  OSPINO: {
    id: 'OSPINO',
    name: 'Ospino - Río Acarigua - Guanarito',
    region: 'Portuguesa (Rural-Agrícola)',
    marketType: 'Licorerías Rurales y Paradas Agroproductivas',
    tradeDynamics: 'Rutas agrícolas extensas con clientes leales pero dispersos. Rotación condicionada al calendario de cosechas.',
    logisticsChallenge: 'Alto consumo de combustible por parada; indispensable que cada visita se traduzca en factura emitida.',
    liquidityProfile: 'Efectivo físico estacional y transferencias locales.',
    tacticalDirectives: [
      'Concentrar el recorrido en los clientes de mayor volumen para amortizar el flete.',
      'Exigir pedidos mínimos de 5 cajas por parada: no hacer entregas fraccionadas.',
      'Captar divisas físicas en efectivo para proteger el flujo de caja matriz.',
    ],
  },
};

/**
 * Identifica y extrae el perfil de zona a partir del nombre de la ruta.
 */
export function getZoneProfile(routeName: string): ZoneProfile {
  const upper = routeName.toUpperCase();

  if (upper.includes('LA PUERTA')) return ZONE_PROFILES.LA_PUERTA;
  if (upper.includes('BOCONO')) return ZONE_PROFILES.BOCONO;
  if (upper.includes('VALERA')) return ZONE_PROFILES.VALERA;
  if (upper.includes('ACARIGUA') && (upper.includes('CENTRO') || upper.includes('CASCO'))) return ZONE_PROFILES.ACARIGUA_CENTRO;
  if (upper.includes('ACARIGUA') && (upper.includes('SUR') || upper.includes('ZONA SUR'))) return ZONE_PROFILES.ACARIGUA_SUR;
  if (upper.includes('SOCOPO') || (upper.includes('BARINAS') && upper.includes('SOCOPO'))) return ZONE_PROFILES.BARINAS_SOCOPO;
  if (upper.includes('BARINITAS') || (upper.includes('BARINAS') && upper.includes('BARINITAS'))) return ZONE_PROFILES.BARINAS_BARINITAS;
  if (upper.includes('SAN CARLOS') || upper.includes('SAN RAFAEL')) return ZONE_PROFILES.SAN_CARLOS;
  if (upper.includes('TUREN')) return ZONE_PROFILES.TUREN;
  if (upper.includes('YARACUY')) return ZONE_PROFILES.YARACUY;
  if (upper.includes('SABANETA') || upper.includes('DOLORES')) return ZONE_PROFILES.SABANETA;
  if (upper.includes('OSPINO') || upper.includes('RIO ACARIGUA') || upper.includes('GUANARITO')) return ZONE_PROFILES.OSPINO;
  if (upper.includes('BARINAS')) return ZONE_PROFILES.BARINAS_SOCOPO;
  if (upper.includes('ACARIGUA')) return ZONE_PROFILES.ACARIGUA_CENTRO;
  if (upper.includes('GUANARE')) return ZONE_PROFILES.GUANARE;

  // Perfil por defecto adaptativo
  return {
    id: 'GENERAL',
    name: upper.includes(' - ') ? upper.split(' - ')[1] : upper,
    region: 'Territorio Comercial FV',
    marketType: 'Distribución Mayorista de Licores y Cervezas',
    tradeDynamics: 'Circuito de distribución quincenal a bodegones y licorerías tradicionales en Venezuela.',
    logisticsChallenge: 'Optimización de ruta de reparto y control de drop-size por cliente atendido.',
    liquidityProfile: 'Flujo mixto bancario y divisas en efectivo ($).',
    tacticalDirectives: [
      'Priorizar cobranza de facturas vencidas antes de descargar pedidos nuevos.',
      'Amarrar venta de cerveza masiva con rones añejos DOC para elevar el margen promedio.',
      'Auditar el cumplimiento del 1% mínimo en divisas físicas ($ efectivo).',
    ],
  };
}

/**
 * Motor de Inferencia Estratégica Senior por Zona y Resultados Específicos
 * Genera diagnósticos y recomendaciones comerciales hiperenfocadas,
 * eliminando plantillas genéricas y personalizando según el territorio.
 */
export function generateSeniorTerritorialAnalysis(
  route: RouteData,
  previousRoute?: RouteData
): Analysis {
  const zone = getZoneProfile(route.name);
  const isSplit = route.name.includes(' - ');
  const seller = isSplit ? route.name.split(' - ')[0] : 'Promotor FV';

  // Cálculos matemáticos exactos
  const attended = route.clients?.real ?? 0;
  const visited = route.visitedClients > 0 ? route.visitedClients : (route.clients?.meta ?? 1);
  const cierreRate = calculateClosingRate(attended, visited);
  const boxesReal = route.boxes?.real ?? 0;
  const boxesMeta = route.boxes?.meta ?? 1;
  const boxesPerf = calculatePercentage(boxesReal, boxesMeta);
  const collReal = route.collection?.real ?? 0;
  const collMeta = route.collection?.meta ?? 1;
  const collPerf = calculatePercentage(collReal, collMeta);

  const pendingCollection = Math.max(0, collMeta - collReal);
  const pendingBoxes = Math.max(0, boxesMeta - boxesReal);
  const unconverted = Math.max(0, visited - attended);
  const dropSize = attended > 0 ? (boxesReal / attended).toFixed(1) : '0';
  const cashRatio = calculateCashRatio(route.divisas ?? 0, collReal);
  const minCashRequired = Math.max(0, collReal * 0.01);
  const cashShortfall = Math.max(0, minCashRequired - (route.divisas ?? 0));

  // Comparativa con quincena anterior si existe
  let prevBoxes = 0;
  let prevColl = 0;
  let prevCierre = 0;
  if (previousRoute) {
    prevBoxes = previousRoute.boxes?.real ?? 0;
    prevColl = previousRoute.collection?.real ?? 0;
    prevCierre = calculateClosingRate(previousRoute.clients?.real ?? 0, previousRoute.visitedClients ?? 1);
  }

  // ========================================================
  // 1. DIAGNÓSTICO SITUACIONAL OPERATIVO / ACTUAL POR ZONA
  // ========================================================
  let diag = '';
  if (collPerf < 80 && boxesPerf >= 80) {
    diag = `RUPTURA DE FLUJO EN ${zone.name.toUpperCase()}: La gestión de ${seller} muestra alta penetración de volumen con ${boxesPerf}% en cajas (${formatInteger(boxesReal)} Cjs), pero la cobranza se congeló en ${collPerf}% (${formatCurrency(collReal)} USD). En el mercado de ${zone.region}, vender sin cobrar equivale a transferir el capital de trabajo de FV al anaquel del cliente sin respaldo financiero. El drop-size promedio se situó en ${dropSize} cajas/cliente, requiriendo alineación inmediata para que el volumen despachado no comprometa el tramo superior de comisión escalonada.`;
  } else if (cierreRate >= 75 && boxesPerf < 70) {
    diag = `INEFICIENCIA DE TICKET EN ${zone.name.toUpperCase()}: Alta cobertura de ruta por parte de ${seller} alcanzando un ${cierreRate}% de cierre (${attended} clientes de ${visited} visitados), pero con una entrega promedio de solo ${dropSize} cajas/cliente en ${zone.region}. Se visitó con éxito el territorio pero se pulverizó el flete en pedidos pequeños. Faltaron ${formatInteger(pendingBoxes)} cajas para alcanzar la meta quincenal de ${formatInteger(boxesMeta)} Cjs, afectando el ingreso proyectado por comisiones progresivas.`;
  } else if (cierreRate < 50 && boxesPerf < 70 && collPerf < 70) {
    diag = `ALERTA DE CONTRACCIÓN EN ${zone.name.toUpperCase()}: Ruta en zona crítica de desempeño con ${cierreRate}% de cierre, ${boxesPerf}% en cajas y ${collPerf}% en cobranza. En ${zone.name}, donde la dinámica comercial de licores requiere presencia constante en anaquel, se dejaron sin atender o sin convertir a ${unconverted} clientes visitados. Con ${formatCurrency(pendingCollection)} USD pendientes de cobranza, se pone en riesgo la cuota asignada y el ascenso al siguiente tramo de comisión por volumen.`;
  } else if (boxesPerf >= 90 && collPerf >= 90 && cierreRate >= 80) {
    diag = `DESPLIEGUE SOBRESALIENTE EN ${zone.name.toUpperCase()}: Ejecución comercial de alto calibre por parte de ${seller}. Cumplimiento del ${boxesPerf}% en cajas (${formatInteger(boxesReal)} Cjs) y ${collPerf}% en cobranza (${formatCurrency(collReal)} USD), con un cierre de ventas del ${cierreRate}% en ${zone.region}. El drop-size de ${dropSize} cajas/cliente confirma dominio sobre licorerías y bodegones clave, maximizando el tramo más alto de comisión por venta efectiva sin bonos fijos recurrentes.`;
  } else {
    diag = `OPERACIÓN ESTABLE CON MARGEN DE EXPANSIÓN EN ${zone.name.toUpperCase()}: ${seller} registra ${boxesPerf}% de cumplimiento en volumen (${formatInteger(boxesReal)} Cjs) y ${collPerf}% en recaudación (${formatCurrency(collReal)} USD), con una tasa de cierre de ${cierreRate}% sobre ${visited} visitas en ${zone.region}. La ruta mantiene estabilidad en clientes tradicionales, pero restan ${formatInteger(pendingBoxes)} cajas para superar el umbral quincenal y acceder a un porcentaje de comisión por venta superior en FV MEGAMAYORISTA.`;
  }

  // ========================================================
  // 2. PUNTO DE FRICCIÓN / COSTRICCIÓN DE MERCADO POR ZONA
  // ========================================================
  let pain = '';
  if (pendingCollection > 0 && collPerf < 80) {
    pain = `CAPITAL ATRAPADO EN ${zone.name.toUpperCase()}: Existen ${formatCurrency(pendingCollection)} USD retenidos en la calle entre licorerías y bodegones del circuito ${zone.region}. En el entorno comercial de Venezuela, donde el crédito bancario es inexistente y FV autofinancia el inventario, esta brecha congela la reposición inmediata ante cerveceras y productores de ron, además de exponer la cartera a riesgos de morosidad.`;
  } else if (unconverted > 0 && cierreRate < 70) {
    pain = `DESCONEXIÓN EN VISITAS DE CAMPO: Se registraron ${unconverted} clientes visitados que no concretaron compra en ${zone.name}. En una ruta de ${zone.region}, cada parada sin pedido emitido incrementa el costo logístico de combustible y transporte por caja entregada, cediendo espacio en anaquel a distribuidores foráneos e informales.`;
  } else if (parseFloat(dropSize) < 6.0 && boxesPerf < 85) {
    pain = `PULVERIZACIÓN DE DROP-SIZE: Promedio de entrega de apenas ${dropSize} cajas por punto atendido en ${zone.name}. La geografía y los costos de flete en ${zone.region} exigen pedidos consolidados; atender clientes con 1 o 2 cajas encarece la operación logística y resta tiempo para negociar con cuentas de mayor escala.`;
  } else {
    pain = `PRESIÓN COMPETITIVA EN TERRITORIO: En ${zone.name}, el principal desafío es la velocidad de rotación. Si no se asegura la reposición quincenal en bodegones de ${zone.region}, la competencia mayorista local ocupa los espacios de exhibición prioritarios en cervezas y rones líderes.`;
  }

  // ========================================================
  // 3. CONSEJO ACTIVO COMERCIAL Y VENTA CRUZADA POR ZONA
  // ========================================================
  let opp = '';
  if (collPerf < 80 && boxesPerf >= 80) {
    opp = `ORDEN TÁCTICA DE COBRANZA EN ${zone.name.toUpperCase()}: Suspender de inmediato nuevos despachos a crédito en clientes con facturas vencidas de la quincena anterior en ${zone.region}. Condicionar la entrega del producto de alta rotación (cerveza Polar/Regional) a la liquidación del 100% de la deuda vieja: "Primero cobro, luego despacho". Tu comisión depende de la cobranza efectiva lograda.`;
  } else if (parseFloat(dropSize) < 8.0) {
    opp = `ESTRATEGIA DE COMBO Y PEDIDO MÍNIMO: Fijar un piso mínimo de 6 a 8 cajas por despacho en ${zone.name} para amortizar el flete en ${zone.region}. Implementar venta atada: cada 5 cajas de cerveza masiva deben acompañarse obligatoriamente de 1 caja de ron añejo DOC nacional (Santa Teresa, Cacique, Pampero) o espirituoso premium, elevando el margen de la ruta.`;
  } else if (unconverted > 5) {
    opp = `PLAN DE RESCATE EN ${zone.name.toUpperCase()}: Revisar de inmediato la lista de los ${unconverted} clientes que no compraron en la última jornada de ${zone.region}. Llamar antes de la visita para levantar la orden de reposición de fin de semana y activar un descuento especial por pronto pago o compra por volumen para reactivar la cuenta.`;
  } else {
    opp = `PUSH ESTRATÉGICO EN ${zone.name.toUpperCase()}: Auditar los 10 clientes de mayor facturación en ${zone.region} y ofrecerles acuerdos de abastecimiento quincenal exclusivo. Colocar las líneas de rones de alta gama y licores importados para cerrar las ${formatInteger(pendingBoxes)} cajas faltantes y maximizar el tramo de comisión más alto.`;
  }

  // ========================================================
  // 4. ESTRATEGIA FINANCIERA DE MONEDAS Y LIQUIDEZ POR ZONA
  // ========================================================
  let cash = '';
  if (cashRatio < 1.0) {
    cash = `CRÍTICO DE ALTA PRIORIDAD EN ${zone.name.toUpperCase()}: Recaudación en divisas físicas ($ efectivo) de apenas ${formatCurrency(route.divisas ?? 0)} USD (${cashRatio}% del recaudo), por debajo de la norma administrativa del 1% mínimo obligatorio (${formatCurrency(minCashRequired)} USD). En ${zone.region}, con el dinamismo comercial existente, es inadmisible no captar efectivo en billetes. El promotor debe exigir al menos el 1% de cada factura en cash para garantizar la liquidez cambiaria de FV ante los fabricantes nacionales.`;
  } else if (cashRatio < 10.0) {
    cash = `LIQUIDEZ BÁSICA CUMPLIDA CON POTENCIAL EN ${zone.name.toUpperCase()}: Se captaron ${formatCurrency(route.divisas ?? 0)} USD en efectivo (${cashRatio}% del total), superando el mínimo normativo del 1%. No obstante, la economía de ${zone.region} permite captar una mayor proporción en divisas físicas; incentivar el pago en cash reduce el costo transaccional bancario y agiliza compras de contado en planta.`;
  } else {
    cash = `EXCELENCIA EN LIQUIDEZ TERRITORIAL EN ${zone.name.toUpperCase()}: Sólida captación de divisas físicas por ${formatCurrency(route.divisas ?? 0)} USD, representando el ${cashRatio}% de la cobranza total en ${zone.region}. Esta liquidez en moneda dura fortalece la tesorería de FV MEGAMAYORISTA, excede con holgura el piso administrativo del 1% y permite compras oportunas de inventario ante grandes destilerías.`;
  }

  return {
    diagnostic: diag,
    painPoint: pain,
    opportunity: opp,
    cashInsight: cash,
  };
}

export default {
  ZONE_PROFILES,
  getZoneProfile,
  generateSeniorTerritorialAnalysis,
};
