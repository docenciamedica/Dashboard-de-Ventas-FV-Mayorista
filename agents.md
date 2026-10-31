# Protocolo de Contexto Local y Gobernanza — FV MEGAMAYORISTA

## 1. Identidad Corporativa y Branding
- **Empresa**: FV MEGAMAYORISTA (Holding de distribución y venta de cervezas, rones añejos DOC y licores premium en Venezuela).
- **Colores Corporativos**:
  - Color Primario Comercial: `#2E86C1` (Azul FV Comercial).
  - Color Secundario Ejecutivo: `#212F3D` (Gris Oscuro / Pizarra Profundo).
  - Acentos de Cumplimiento (Semáforo Oficial Actualizado):
    - Verde Éxito (81% a 100% o superior): `#27AE60` / `#10B981`.
    - Amarillo Alerta / En Progreso (50% a 80%): `#F1C40F` / `#F59E0B`.
    - Negro Crítico (Menor de 50%): `#000000`.
- **Copyright Oficial**: `© 2026 FV MEGAMAYORISTA - Todos los derechos reservados.`
- **Tipografía**: Inter / Sans-serif de alta legibilidad con alineación numérica tabular (`tabular-nums`).

---

## 2. Reglas de Negocio Comerciales y Financieras
1. **Tríada Estratégica de KPIs en Pantalla**:
   - **Efectividad de Cierre de Ventas (%)**: Clientes reales atendidos divididos entre clientes visitados en la jornada (`route.clients.real / route.visitedClients * 100`).
   - **Volumen de Despacho (Cajas)**: Cajas reales vendidas vs Meta de cajas asignada (`route.boxes.real / route.boxes.meta * 100`).
   - **Cobranza Lograda (USD)**: Recaudación real en dólares vs Meta de cobranza (`route.collection.real / route.collection.meta * 100`).
2. **Histórico Bi-semanal de Cierre de Ventas**:
   - La serie azul en el gráfico de evolución temporal representa exclusivamente la **Efectividad de Cierre de Ventas (%)** de todas las visitas quincenales registradas en el historial.
3. **Liquidez y Divisas Físicas ($ Efectivo)**:
   - Se audita el cumplimiento de la norma administrativa del mínimo 1% de efectivo sobre el total recaudado para blindar la tesorería quincenal.
4. **Política Salarial y Comisiones**:
   - En FV MEGAMAYORISTA **no existen bonos fijos recurrentes** por productividad.
   - Las ganancias de los promotores y vendedores se rigen únicamente por un porcentaje de comisión escalonada/progresiva según el volumen y valor de la venta efectivamente cobrada.
5. **Aritmética Decimal Exacta**:
   - Prohibido usar punto flotante nativo IEEE-754 de JavaScript para dinero, porcentajes, divisas o metas. Uso estricto de `decimal.js` con redondeo `ROUND_HALF_UP`.

---

## 3. Coexistencia de los 11 Agentes Especializados
- `@Orquestador`: Coordinación global y prevención de colisiones.
- `@Finanzas`: Motor matemático `financialMath.ts`, comisiones y cuadre de divisas.
- `@Dashboards`: Gráficos interactivos de 3 KPIs y líneas históricas con Recharts.
- `@Documentos`: Motor de exportación PDF y Word con branding oficial y paginación ejecutiva.
- `@Frontend`: Componentes modulares con doble exportación y consumo resiliente.
- `@Backend`: Servidor Express 5 seguro, rate limiting y reglas Firestore con control de acceso.
- `@UX`: Adaptabilidad multiplataforma garantizada (desde 375px y botones mínimo 44x44px).
- `@QA`: Auditoría estática TypeScript (`tsc --noEmit`), empaquetado de producción (`build`) y pruebas de estrés.
- `@CRM`: Preparación de interoperabilidad quincenal y WhatsApp en formato E.164.
- `@RRHH`: Validación de tramos de comisión quincenales sin bonos fijos.
- `@OCR`: Módulo inactivo a solicitud de la dirección.
