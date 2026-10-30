import React from 'react';
import { RouteData, GoalStat } from '../types';
import { sanitizeNumericInput } from '../services/financialMath';
import { FileDown, Loader2 } from 'lucide-react';

interface KPI {
  id: string;
  label: string;
  unit: string;
  description: string;
}

interface EditableTableProps {
  route: RouteData;
  onUpdate: (updated: RouteData) => void;
  isConsolidated?: boolean;
  role?: 'admin' | 'user';
  kpis?: KPI[];
  onExportPDF?: () => void;
  isExporting?: boolean;
}

interface EditableCellInputProps {
  value: number;
  onCommit: (val: number) => void;
  disabled?: boolean;
  className?: string;
}

const EditableCellInput: React.FC<EditableCellInputProps> = ({
  value,
  onCommit,
  disabled = false,
  className = ""
}) => {
  const [displayValue, setDisplayValue] = React.useState<string>(value.toString());
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Consistently align internal string input state if external numbers change
  React.useEffect(() => {
    // Only update internal display state if we don't have focus
    if (document.activeElement !== inputRef.current) {
      setDisplayValue(value.toString());
    }
  }, [value]);

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  };

  const commitValue = () => {
    const finalVal = sanitizeNumericInput(displayValue, 0);
    setDisplayValue(finalVal.toString());
    onCommit(finalVal);
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
      e.currentTarget.blur();
    }
  };

  return (
    <input 
      ref={inputRef}
      type="number"
      inputMode="decimal"
      min="0" 
      value={displayValue}
      onChange={handleChangeInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={className}
    />
  );
};

export const EditableTable: React.FC<EditableTableProps> = ({ 
  route, 
  onUpdate, 
  isConsolidated, 
  role = 'user',
  kpis = [],
  onExportPDF,
  isExporting
}) => {
  const isAdmin = role === 'admin';

  const handleCommitChange = (field: string, subField: string, numValue: number, isCustomKpi: boolean = false) => {
    if (isConsolidated) return;
    
    // Create deep copy to avoid direct mutation
    const updated = JSON.parse(JSON.stringify(route)) as RouteData;

    if (isCustomKpi) {
      if (!updated.customKpis) {
        updated.customKpis = {};
      }
      if (!updated.customKpis[field]) {
        updated.customKpis[field] = { meta: 0, real: 0 };
      }
      if (subField === 'meta') {
        updated.customKpis[field].meta = numValue;
      } else if (subField === 'real') {
        updated.customKpis[field].real = numValue;
      }
    } else {
      if (field === 'divisas' || field === 'totalClients' || field === 'visitedClients') {
        // @ts-ignore
        updated[field] = numValue;
      } else if (field === 'clients' || field === 'boxes' || field === 'collection') {
        const stat = updated[field as keyof RouteData] as { meta: number, real: number };
        if (subField === 'meta') stat.meta = numValue;
        if (subField === 'real') stat.real = numValue;
      }
    }

    onUpdate(updated);
  };

  // Find non-core KPIs created by admin
  const customKpiDefinitions = kpis.filter(k => !['clients', 'boxes', 'collection'].includes(k.id));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-full w-full p-2.5 sm:p-3 overflow-hidden">
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest leading-none">Ajuste Operativo</h3>
          {!isConsolidated && onExportPDF && (
            <button
              onClick={onExportPDF}
              disabled={isExporting}
              className="flex items-center justify-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-[#2E86C1]/10 text-slate-600 hover:text-[#2E86C1] transition-colors disabled:opacity-50 border border-slate-200"
              title="Descargar Reporte PDF de la Ruta"
            >
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
              <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">PDF</span>
            </button>
          )}
        </div>
        {isConsolidated ? (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] sm:text-xs font-black uppercase tracking-wider animate-pulse">Consolidada (Lectura)</span>
        ) : !isAdmin ? (
          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] sm:text-xs font-bold uppercase tracking-wide">Operador</span>
        ) : (
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] sm:text-xs font-bold uppercase tracking-wide">Admin</span>
        )}
      </div>
      
      {isConsolidated && (
        <div className="bg-amber-50/80 border-b border-amber-100 px-2 py-1 text-[9px] sm:text-xs font-bold text-amber-700 uppercase tracking-wide shrink-0">
          âš ï¸ Resultados globales. Selecciona una ruta para editar.
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-0 no-scrollbar my-1">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-2 py-1.5 text-left text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">KPI</th>
              <th className="px-2 py-1.5 text-center text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider w-[95px]">Meta</th>
              <th className="px-2 py-1.5 text-center text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider w-[95px]">Real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Clientes Core */}
            <tr className="hover:bg-blue-50/30 transition-colors">
              <td className="px-2 py-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-800 block">Clientes</span>
              </td>
              <td className="px-2 py-1.5 text-center">
                <EditableCellInput 
                  value={route.clients?.meta || 0}
                  onCommit={(val) => handleCommitChange('clients', 'meta', val)}
                  disabled={isConsolidated}
                  className="w-[95px] bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded px-2 py-1 text-xs sm:text-sm font-black text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs text-center"
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <EditableCellInput 
                  value={route.clients?.real || 0}
                  onCommit={(val) => handleCommitChange('clients', 'real', val)}
                  disabled={isConsolidated}
                  className="w-[95px] bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded px-2 py-1 text-xs sm:text-sm font-black text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs text-center"
                />
              </td>
            </tr>

            {/* Volumen Core */}
            <tr className="hover:bg-blue-50/30 transition-colors">
              <td className="px-2 py-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-800 block">Cajas</span>
              </td>
              <td className="px-2 py-1.5 text-center">
                <EditableCellInput 
                  value={route.boxes?.meta || 0}
                  onCommit={(val) => handleCommitChange('boxes', 'meta', val)}
                  disabled={isConsolidated}
                  className="w-[95px] bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded px-2 py-1 text-xs sm:text-sm font-black text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs text-center"
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <EditableCellInput 
                  value={route.boxes?.real || 0}
                  onCommit={(val) => handleCommitChange('boxes', 'real', val)}
                  disabled={isConsolidated}
                  className="w-[95px] bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded px-2 py-1 text-xs sm:text-sm font-black text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs text-center"
                />
              </td>
            </tr>

            {/* Cobranza Core */}
            <tr className="hover:bg-blue-50/30 transition-colors">
              <td className="px-2 py-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-800 block">Cobranza ($)</span>
              </td>
              <td className="px-2 py-1.5 text-center">
                <EditableCellInput 
                  value={route.collection?.meta || 0}
                  onCommit={(val) => handleCommitChange('collection', 'meta', val)}
                  disabled={isConsolidated}
                  className="w-[97px] bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded px-2 py-1 text-[13px] font-black text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs text-center"
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <EditableCellInput 
                  value={route.collection?.real || 0}
                  onCommit={(val) => handleCommitChange('collection', 'real', val)}
                  disabled={isConsolidated}
                  className="w-[97px] bg-[#FAF0F0] disabled:bg-[#FAF5FAF]/60 border border-slate-200 rounded px-2 py-1 text-[13px] font-black text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-2xs text-center"
                />
              </td>
            </tr>

            {/* DYNAMIC ADDITIONAL CUSTOM KPIS (Created by admin VerÃ³nica) */}
            {customKpiDefinitions.map(k => {
              const kpiVal = route.customKpis?.[k.id] || { meta: 0, real: 0 };
              return (
                <tr key={k.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-2 py-1.5">
                    <span className="text-xs sm:text-sm font-bold text-purple-800 block truncate" title={k.label}>
                      {k.label} {k.unit ? <span className="text-[9px] sm:text-xs font-black text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100 ml-1">{k.unit}</span> : null}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <EditableCellInput 
                      value={kpiVal.meta}
                      onCommit={(val) => handleCommitChange(k.id, 'meta', val, true)}
                      disabled={isConsolidated}
                      className="w-[95px] bg-slate-50 disabled:bg-slate-100/60 border border-purple-100 rounded px-2 py-1 text-xs sm:text-sm font-black text-[#2E86C1] focus:bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all shadow-2xs text-center"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <EditableCellInput 
                      value={kpiVal.real}
                      onCommit={(val) => handleCommitChange(k.id, 'real', val, true)}
                      disabled={isConsolidated}
                      className="w-[95px] bg-slate-50 disabled:bg-slate-100/60 border border-purple-100 rounded px-2 py-1 text-xs sm:text-sm font-black text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all shadow-2xs text-center"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* BLOQUE DE INDICADORES ADICIONALES APILADO VERTICALMENTE (CARTERA TOTAL Y VISITADOS) */}
      <div className="w-full mt-2 p-2.5 sm:p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col gap-2 shrink-0">
        {/* FILA 1: CARTERA TOTAL */}
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider">CARTERA TOTAL:</span>
          <EditableCellInput 
            value={route.totalClients || 0}
            onCommit={(val) => handleCommitChange('totalClients', '', val)}
            disabled={isConsolidated}
            className="w-28 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs sm:text-sm font-black text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-2xs text-center"
          />
        </div>

        {/* FILA 2: VISITADOS */}
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider">VISITADOS:</span>
          <EditableCellInput 
            value={route.visitedClients || 0}
            onCommit={(val) => handleCommitChange('visitedClients', '', val)}
            disabled={isConsolidated}
            className="w-28 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs sm:text-sm font-black text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-2xs text-center"
          />
        </div>
      </div>
    </div>
  );
};

export default EditableTable;
