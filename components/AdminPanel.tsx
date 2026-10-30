import React, { useState } from 'react';
import { RouteData, GoalStat } from '../types';
import { verifyAdminPin } from '../services/authService';
import { 
  PlusCircle, Trash2, Edit3, Award, Users, TableProperties, LineChart, Hash, 
  MapPin, UserCheck, Shield, Sparkles, TrendingUp, Check, RefreshCw, ArrowUp, ArrowDown,
  Eye, EyeOff, History, X, Save
} from 'lucide-react';

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
  color?: string;
}

interface UserPin {
  pin: string;
  name: string;
  role: 'admin' | 'user';
}

interface AppConfig {
  routesTemplate: RouteData[];
  kpis: KPI[];
  customCharts: CustomChart[];
  users: UserPin[];
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  description: string;
}

interface AdminPanelProps {
  appConfig: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onRefreshAllData: () => void;
  auditLogs?: AuditLog[];
  addAuditLog?: (action: string, description: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  appConfig, 
  onUpdateConfig, 
  onRefreshAllData,
  auditLogs = [],
  addAuditLog
}) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'routes' | 'users' | 'charts' | 'history'>('routes');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showUserPins, setShowUserPins] = useState<Record<string, boolean>>({});

  // --- Security Verification State ---
  const [pendingAction, setPendingAction] = useState<{
    onConfirm: () => void;
    message: string;
  } | null>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // --- State for KPI Creation (KPIs Tab) ---
  const [kpiLabel, setKpiLabel] = useState('');
  const [kpiUnit, setKpiUnit] = useState('');
  const [kpiDesc, setKpiDesc] = useState('');

  // --- State for KPI Creation (GrÃ¡ficos Tab - Access RÃ¡pido) ---
  const [chartKpiLabel, setChartKpiLabel] = useState('');
  const [chartKpiUnit, setChartKpiUnit] = useState('');
  const [chartKpiDesc, setChartKpiDesc] = useState('');

  // --- State for Routes/Sellers Creation ---
  const [newRouteId, setNewRouteId] = useState('');
  const [newSellerName, setNewSellerName] = useState('');
  const [newSubRouteName, setNewSubRouteName] = useState('');
  const [newRouteMetaClients, setNewRouteMetaClients] = useState(40);
  const [newRouteMetaBoxes, setNewRouteMetaBoxes] = useState(500);
  const [newRouteMetaCollection, setNewRouteMetaCollection] = useState(15000);

  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingRouteName, setEditingRouteName] = useState<string>('');

  // --- State for User/PIN Creation ---
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');

  // --- State for Chart Creation ---
  const [chartTitle, setChartTitle] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [chartKpiId, setChartKpiId] = useState('clients');
  const [chartScope, setChartScope] = useState('all');
  const [chartColor, setChartColor] = useState('#8B5CF6');

  const PRESET_COLORS = [
    { value: '#3B82F6', name: 'Azul Comercial' },
    { value: '#10B981', name: 'Esmeralda Real' },
    { value: '#8B5CF6', name: 'Violeta Immersive' },
    { value: '#EC4899', name: 'Rosa Vibrante' },
    { value: '#F59E0B', name: 'Ãmbar CÃ¡lido' },
    { value: '#06B6D4', name: 'Cian Profundo' },
    { value: '#EF4444', name: 'Rojo Alerta' },
    { value: '#64748B', name: 'Pizarra' }
  ];

  const [notif, setNotif] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3500);
  };

  // --- Security Interceptor helper ---
  const handleActionWithAuth = (onConfirm: () => void, message: string) => {
    setPendingAction({ onConfirm, message });
    setAdminPinInput('');
    setPinError('');
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPinInput) {
      setPinError('Debe ingresar su PIN/Clave.');
      return;
    }

    const isValid = verifyAdminPin(adminPinInput);
    
    if (isValid) {
      const actorName = 'VerÃ³nica Jauregui (Master Admin)';

      if (pendingAction) {
        if (addAuditLog) {
          addAuditLog('AcciÃ³n Administrativa', `${actorName} autorizÃ³: ${pendingAction.message}`);
        }
        pendingAction.onConfirm();
      }
      setPendingAction(null);
      setAdminPinInput('');
      setPinError('');
    } else {
      setPinError('Clave de administrador incorrecta. Acceso denegado.');
    }
  };

  // --- KPI CRUD functions ---
  const handleAddKPI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiLabel) return;
    const cleanId = kpiLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-");
    
    // Check duplication
    if (appConfig.kpis.some(k => k.id === cleanId)) {
      showNotification('âš ï¸ Ya existe un KPI con un ID similar o idÃ©ntico.');
      return;
    }

    handleActionWithAuth(() => {
      const newKpi: KPI = {
        id: cleanId,
        label: kpiLabel,
        unit: kpiUnit || 'U',
        description: kpiDesc || `MediciÃ³n de ${kpiLabel}`
      };

      const updatedConfig = {
        ...appConfig,
        kpis: [...appConfig.kpis, newKpi]
      };
      onUpdateConfig(updatedConfig);
      setKpiLabel('');
      setKpiUnit('');
      setKpiDesc('');
      showNotification(`âœ… KPI "${newKpi.label}" agregado exitosamente.`);
    }, `Agregar nuevo KPI estructural "${kpiLabel}"`);
  };

  const handleDeleteKPI = (id: string) => {
    const kpiLabelText = appConfig.kpis.find(k => k.id === id)?.label || id;
    handleActionWithAuth(() => {
      const updatedConfig = {
        ...appConfig,
        kpis: appConfig.kpis.filter(k => k.id !== id),
        // Clean charts using deleted KPI too
        customCharts: appConfig.customCharts.filter(c => c.kpiId !== id)
      };
      onUpdateConfig(updatedConfig);
      showNotification(`ðŸ—‘ï¸ KPI "${kpiLabelText}" eliminado exitosamente.`);
    }, `Eliminar permanentemente el KPI "${kpiLabelText}"`);
  };

  // --- Fast/Manual KPI Creation from GrÃ¡ficos Tab ---
  const handleAddKpiFromChartsTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartKpiLabel) return;
    const cleanId = chartKpiLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-");

    // Check duplication
    if (appConfig.kpis.some(k => k.id === cleanId)) {
      showNotification('âš ï¸ Ya existe un KPI con un ID similar.');
      return;
    }

    handleActionWithAuth(() => {
      const newKpi: KPI = {
        id: cleanId,
        label: chartKpiLabel,
        unit: chartKpiUnit || 'U',
        description: chartKpiDesc || `MediciÃ³n de ${chartKpiLabel}`
      };

      const updatedConfig = {
        ...appConfig,
        kpis: [...appConfig.kpis, newKpi]
      };
      onUpdateConfig(updatedConfig);
      setChartKpiLabel('');
      setChartKpiUnit('');
      setChartKpiDesc('');
      showNotification(`âœ… KPI "${newKpi.label}" agregado exitosamente desde la pestaÃ±a de GrÃ¡ficos.`);
    }, `Agregar KPI manual "${chartKpiLabel}" desde secciÃ³n de grÃ¡ficos`);
  };

  // --- Routes CRUD functions ---
  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName || !newSubRouteName) {
      showNotification('âš ï¸ Nombre de Vendedor y Sub-Ruta requeridos.');
      return;
    }

    const combinedName = `${newSellerName} - ${newSubRouteName}`;
    const cleanId = newRouteId || combinedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-");

    if (appConfig.routesTemplate.some(r => r.id === cleanId)) {
      showNotification('âš ï¸ Ya existe una ruta con este ID o Nombre.');
      return;
    }

    handleActionWithAuth(() => {
      const newRoute: RouteData = {
        id: cleanId,
        name: combinedName,
        clients: { meta: Number(newRouteMetaClients) || 0, real: 0 },
        boxes: { meta: Number(newRouteMetaBoxes) || 0, real: 0 },
        collection: { meta: Number(newRouteMetaCollection) || 0, real: 0 },
        divisas: 0,
        totalClients: Math.round(Number(newRouteMetaClients) * 1.5),
        visitedClients: 0
      };

      const updatedConfig = {
        ...appConfig,
        routesTemplate: [...appConfig.routesTemplate, newRoute]
      };
      onUpdateConfig(updatedConfig);
      setNewRouteId('');
      setNewSellerName('');
      setNewSubRouteName('');
      showNotification(`âœ… Ruta "${newRoute.name}" creada exitosamente.`);
    }, `Crear nueva ruta y vendedor: "${combinedName}"`);
  };

  const handleStartEditRoute = (id: string, currentName: string) => {
    setEditingRouteId(id);
    setEditingRouteName(currentName);
  };

  const handleSaveRouteName = (id: string) => {
    if (!editingRouteName.trim()) {
      showNotification('ðŸš« El nombre no puede estar vacÃ­o');
      return;
    }
    const routeName = appConfig.routesTemplate.find(r => r.id === id)?.name || id;
    if (editingRouteName === routeName) {
      setEditingRouteId(null);
      return;
    }
    handleActionWithAuth(() => {
      const updatedConfig = {
        ...appConfig,
        routesTemplate: appConfig.routesTemplate.map(r => r.id === id ? { ...r, name: editingRouteName.trim() } : r)
      };
      onUpdateConfig(updatedConfig);
      setEditingRouteId(null);
      showNotification(`âœ… Ruta renombrada a "${editingRouteName}" exitosamente.`);
    }, `Renombrar ruta de venta de "${routeName}" a "${editingRouteName}"`);
  };

  const handleCancelEditRoute = () => {
    setEditingRouteId(null);
    setEditingRouteName('');
  };

  const handleDeleteRoute = (id: string) => {
    if (appConfig.routesTemplate.length <= 1) {
      showNotification('ðŸš« Debe quedar al menos una ruta en el sistema.');
      return;
    }
    const routeName = appConfig.routesTemplate.find(r => r.id === id)?.name || id;

    handleActionWithAuth(() => {
      const updatedConfig = {
        ...appConfig,
        routesTemplate: appConfig.routesTemplate.filter(r => r.id !== id)
      };
      onUpdateConfig(updatedConfig);
      showNotification(`ðŸ—‘ï¸ Ruta "${routeName}" eliminada exitosamente.`);
    }, `Eliminar permanentemente la ruta de venta "${routeName}"`);
  };

  const handleMoveRouteUp = (index: number) => {
    if (index === 0) return;
    const routeName = appConfig.routesTemplate[index].name;
    handleActionWithAuth(() => {
      const updatedList = [...appConfig.routesTemplate];
      const temp = updatedList[index];
      updatedList[index] = updatedList[index - 1];
      updatedList[index - 1] = temp;
      
      onUpdateConfig({
        ...appConfig,
        routesTemplate: updatedList
      });
      showNotification('âœ… Orden de ruta subido con Ã©xito.');
    }, `Reordenar y desplazar hacia arriba la ruta "${routeName}"`);
  };

  const handleMoveRouteDown = (index: number) => {
    if (index === appConfig.routesTemplate.length - 1) return;
    const routeName = appConfig.routesTemplate[index].name;
    handleActionWithAuth(() => {
      const updatedList = [...appConfig.routesTemplate];
      const temp = updatedList[index];
      updatedList[index] = updatedList[index + 1];
      updatedList[index + 1] = temp;
      
      onUpdateConfig({
        ...appConfig,
        routesTemplate: updatedList
      });
      showNotification('âœ… Orden de ruta bajado con Ã©xito.');
    }, `Reordenar y desplazar hacia abajo la ruta "${routeName}"`);
  };

  // --- User Operator/PIN CRUD functions ---
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserPin) {
      showNotification('âš ï¸ Nombre y PIN requeridos.');
      return;
    }
    if (!/^\d{4}$/.test(newUserPin)) {
      showNotification('âš ï¸ El PIN de acceso debe ser de exactamente 4 dÃ­gitos numÃ©ricos.');
      return;
    }
    if (newUserPin === '1111' && appConfig.users.some(u => u.pin === '1111') && newUserName === 'Demo') {
      // Allow re-adding or overwrite
    } else if (appConfig.users.some(u => u.pin === newUserPin)) {
      showNotification('âš ï¸ Este PIN ya estÃ¡ siendo utilizado por otro operador.');
      return;
    }

    handleActionWithAuth(() => {
      const newUser: UserPin = {
        pin: newUserPin,
        name: newUserName,
        role: 'user'
      };

      // Remove duplicates if readding
      const filteredUsers = appConfig.users.filter(u => u.pin !== newUserPin);

      const updatedConfig = {
        ...appConfig,
        users: [...filteredUsers, newUser]
      };
      onUpdateConfig(updatedConfig);
      setNewUserName('');
      setNewUserPin('');
      showNotification(`âœ… Operador "${newUser.name}" registrado con PIN ${newUser.pin}.`);
    }, `Habilitar operador de ventas "${newUserName}" con PIN ${newUserPin}`);
  };

  const handleDeleteUser = (pin: string) => {
    const userName = appConfig.users.find(u => u.pin === pin)?.name || pin;
    handleActionWithAuth(() => {
      const updatedConfig = {
        ...appConfig,
        users: appConfig.users.filter(u => u.pin !== pin)
      };
      onUpdateConfig(updatedConfig);
      showNotification(`ðŸ—‘ï¸ Acceso al operador "${userName}" revocado.`);
    }, `Eliminar operador "${userName}" (PIN de acceso: ${pin})`);
  };

  // --- Custom Charts CRUD functions ---
  const handleAddChart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartTitle) {
      showNotification('âš ï¸ Ingrese un tÃ­tulo para el grÃ¡fico.');
      return;
    }

    handleActionWithAuth(() => {
      const cleanCharId = 'chart-' + Date.now();
      const newChart: CustomChart = {
        id: cleanCharId,
        title: chartTitle,
        type: chartType,
        kpiId: chartKpiId,
        scope: chartScope,
        color: chartColor
      };

      const updatedConfig = {
        ...appConfig,
        customCharts: [...appConfig.customCharts, newChart]
      };
      onUpdateConfig(updatedConfig);
      setChartTitle('');
      setChartColor('#8B5CF6');
      showNotification(`âœ… GrÃ¡fico personalizado "${newChart.title}" agregado.`);
    }, `Instanciar nuevo grÃ¡fico personalizado "${chartTitle}"`);
  };

  const handleDeleteChart = (id: string) => {
    const chartTitleStr = appConfig.customCharts.find(c => c.id === id)?.title || id;
    handleActionWithAuth(() => {
      const updatedConfig = {
        ...appConfig,
        customCharts: appConfig.customCharts.filter(c => c.id !== id)
      };
      onUpdateConfig(updatedConfig);
      showNotification(`ðŸ—‘ï¸ GrÃ¡fico "${chartTitleStr}" removido.`);
    }, `Remover indicador visual de grÃ¡fico "${chartTitleStr}"`);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans mt-4">
      
      {/* Admin header */}
      <div className="bg-slate-900 text-white px-6 py-6 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#2E86C1] p-2.5 rounded-xl shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wider uppercase flex items-center gap-2">
              PestaÃ±a Administrativa - Control de Acceso y Estructura
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-blue-500/30">
                VerÃ³nica Jauregui
              </span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5 font-bold uppercase tracking-wider">
              Control estructural total (KPIs, Rutas, Vendedores, Pines de Seguridad y Representaciones de GrÃ¡ficos)
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshAllData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white border border-slate-700 text-xs font-black uppercase tracking-widest transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sincronizar Plantilla</span>
        </button>
      </div>

      {/* Selector Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-1 px-4 pt-3">
        
        <button
          onClick={() => setActiveTab('routes')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'routes' 
              ? 'border-[#2E86C1] text-[#2E86C1] bg-white rounded-t-xl font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Rutas de Venta
        </button>

        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'kpis' 
              ? 'border-[#2E86C1] text-[#2E86C1] bg-white rounded-t-xl font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Indicadores (KPIs)
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users' 
              ? 'border-[#2E86C1] text-[#2E86C1] bg-white rounded-t-xl font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Operadores (PINes 4D)
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'charts' 
              ? 'border-[#2E86C1] text-[#2E86C1] bg-white rounded-t-xl font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LineChart className="w-4 h-4" />
          GrÃ¡ficos Personalizados
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'border-[#2E86C1] text-[#2E86C1] bg-white rounded-t-xl font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Cambios
        </button>
      </div>

      {/* Notifications Alert banner */}
      {notif && (
        <div className="bg-slate-950 text-white text-xs font-extrabold uppercase tracking-widest px-8 py-3 text-center transition-all animate-pulse">
          {notif}
        </div>
      )}

      {/* Tab Panels */}
      <div className="p-6 md:p-8">
        
        {/* TAB 1: GESTION RUTAS */}
        {activeTab === 'routes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create form */}
            <div className="lg:border-r lg:border-slate-100 lg:pr-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#2E86C1]" />
                Registrar Nueva Ruta / Vendedor
              </h3>
              
              <form onSubmit={handleAddRoute} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ID Ãšnico de Ruta (Opcional)</label>
                  <input
                    type="text"
                    value={newRouteId}
                    onChange={(e) => setNewRouteId(e.target.value)}
                    placeholder="ej. luis-caracas"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nombre del Vendedor (Socio)</label>
                  <input
                    type="text"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                    placeholder="ej. VerÃ³nica Jauregui"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nombre de la Sub-Ruta o RegiÃ³n</label>
                  <input
                    type="text"
                    value={newSubRouteName}
                    onChange={(e) => setNewSubRouteName(e.target.value)}
                    placeholder="ej. BARINAS-SUR"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metas Iniciales (Default Semanal)</p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Clientes Meta</label>
                      <input
                        type="number"
                        value={newRouteMetaClients}
                        onChange={(e) => setNewRouteMetaClients(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cajas Meta</label>
                      <input
                        type="number"
                        value={newRouteMetaBoxes}
                        onChange={(e) => setNewRouteMetaBoxes(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cobranza ($)</label>
                      <input
                        type="number"
                        value={newRouteMetaCollection}
                        onChange={(e) => setNewRouteMetaCollection(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#2E86C1] hover:bg-[#20699b] text-white text-xs font-black uppercase py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  <PlusCircle className="w-4 h-4" />
                  Agregar Ruta
                </button>
              </form>
            </div>

            {/* List and CRUD */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                PadrÃ³n de Sub-Rutas Vigentes ({appConfig.routesTemplate.length})
              </h3>
              
              <div className="overflow-x-auto max-h-[420px] scrollbar-thin">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">ID Ruta</th>
                      <th className="px-4 py-3">Nombre Consolidado (Vendedor - Ruta)</th>
                      <th className="px-4 py-3 text-center">Clientes</th>
                      <th className="px-4 py-3 text-center">Cajas</th>
                      <th className="px-4 py-3 text-center">Cobranza ($)</th>
                      <th className="px-4 py-3 text-center">PosiciÃ³n</th>
                      <th className="px-4 py-3 text-right">AcciÃ³n</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-xs text-slate-700">
                    {appConfig.routesTemplate.map((r, index) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-slate-400">{r.id}</td>
                        <td className="px-4 py-3 font-black text-slate-900">
                          {editingRouteId === r.id ? (
                            <input
                              type="text"
                              value={editingRouteName}
                              onChange={(e) => setEditingRouteName(e.target.value)}
                              className="w-full bg-white border border-[#2E86C1] rounded px-3 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#2E86C1]/50"
                              autoFocus
                            />
                          ) : (
                            r.name
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{r.clients.meta}</td>
                        <td className="px-4 py-3 text-center">{r.boxes.meta}</td>
                        <td className="px-4 py-3 text-center">${new Intl.NumberFormat().format(r.collection.meta)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMoveRouteUp(index)}
                              disabled={index === 0}
                              className={`p-1 rounded-md border transition-all ${index === 0 ? 'text-slate-200 border-slate-100 cursor-not-allowed bg-slate-50/30' : 'text-[#2E86C1] border-blue-200 hover:bg-blue-50 active:scale-95 bg-white'}`}
                              title="Subir posiciÃ³n (Solicita PIN)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRouteDown(index)}
                              disabled={index === appConfig.routesTemplate.length - 1}
                              className={`p-1 rounded-md border transition-all ${index === appConfig.routesTemplate.length - 1 ? 'text-slate-200 border-slate-100 cursor-not-allowed bg-slate-50/30' : 'text-[#2E86C1] border-blue-200 hover:bg-blue-50 active:scale-95 bg-white'}`}
                              title="Bajar posiciÃ³n (Solicita PIN)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5 w-full">
                            {editingRouteId === r.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveRouteName(r.id)}
                                  className="p-1 px-[0.4rem] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-[10px] uppercase font-black tracking-widest transition-colors flex items-center gap-1"
                                  title="Guardar Cambios"
                                >
                                  <Save className="w-3 h-3" />
                                  Guardar
                                </button>
                                <button
                                  onClick={handleCancelEditRoute}
                                  className="p-1 px-[0.4rem] bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-[10px] uppercase font-black tracking-widest transition-colors flex items-center gap-1"
                                  title="Cancelar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditRoute(r.id, r.name)}
                                  className="p-1 px-[0.4rem] bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] uppercase font-black tracking-widest transition-colors flex items-center gap-1"
                                  title="Editar nombre"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteRoute(r.id)}
                                  className="p-1 px-[0.4rem] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] uppercase font-black tracking-widest transition-colors flex items-center gap-1"
                                  title="Remover ruta"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GESTION KPIS */}
        {activeTab === 'kpis' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create KPI Form */}
            <div className="lg:border-r lg:border-slate-100 lg:pr-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                Definir Nuevo KPI Metas/Real
              </h3>
              
              <form onSubmit={handleAddKPI} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nombre / Etiqueta del KPI</label>
                  <input
                    type="text"
                    value={kpiLabel}
                    onChange={(e) => setKpiLabel(e.target.value)}
                    placeholder="ej. Nuevos Clientes, RotaciÃ³n"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unidad de Medida (Corta)</label>
                  <input
                    type="text"
                    value={kpiUnit}
                    onChange={(e) => setKpiUnit(e.target.value)}
                    placeholder="ej. Pts, Cjs, %, USD"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Breve DescripciÃ³n Informativa</label>
                  <textarea
                    value={kpiDesc}
                    onChange={(e) => setKpiDesc(e.target.value)}
                    placeholder="ej. Nuevas cuentas comerciales abiertas e integradas a la red."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#27AE60] hover:bg-emerald-600 text-white text-xs font-black uppercase py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                >
                  <PlusCircle className="w-4 h-4" />
                  Agregar KPI
                </button>
              </form>
            </div>

            {/* List and CRUD */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                Estructura de KPIs Vigentes
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appConfig.kpis.map(k => {
                  const isCore = ['clients', 'boxes', 'collection'].includes(k.id);
                  return (
                    <div 
                      key={k.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between h-36 ${
                        isCore 
                          ? 'bg-slate-50/80 border-slate-200' 
                          : 'bg-white border-slate-250 hover:shadow-md'
                      } transition-all`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{k.label}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-500 lowercase">
                            id: {k.id}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Unidad: {k.unit}</p>
                        <p className="text-[11px] text-slate-600 font-medium leading-normal mt-1.5 line-clamp-2">
                          {k.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                        {isCore ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            Esencial Requerido
                          </span>
                        ) : null}
                        <button
                          onClick={() => handleDeleteKPI(k.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest transition-all flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GESTION OPERADORES (GEN PIN DE 4 DIGITOS) */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:border-r lg:border-slate-100 lg:pr-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Registrar Operador EstÃ¡ndar
              </h3>
              
              <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nombre Completo del Operador</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="ej. Daniel MartÃ­nez"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">CÃ³digo PIN (Exacto 4 DÃ­gitos)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="ej. 5566"
                    required
                    className="w-full tracking-widest text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-lg py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/50">
                  <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed">
                    âš ï¸ NOTA: Los operadores ingresan con este PIN y solo pueden capturar avances. No pueden alterar metas mensuales o modificar sub-rutas.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15"
                >
                  <UserCheck className="w-4 h-4" />
                  Habilitar Operador 4D
                </button>
              </form>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                Operadores y Credenciales Autorizadas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admin is hardcoded so we display it nicely */}
                <div className="p-4 rounded-xl border border-[#2E86C1]/30 bg-blue-50/50 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-black text-slate-800 block uppercase">VerÃ³nica Jauregui</span>
                    <span className="text-[9px] font-black uppercase text-[#2E86C1] tracking-widest">Rol: Administrador Maestro</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase">PIN / CÃ³digo</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-xs font-black text-slate-700">
                        {showAdminPin ? '102030fv.' : 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setShowAdminPin(prev => !prev)}
                        className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                        title="Mostrar / Ocultar PIN"
                      >
                        {showAdminPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {appConfig.users.map(u => (
                  <div key={u.pin} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between hover:shadow-xs transition-shadow">
                    <div>
                      <span className="text-xs font-black text-slate-800 block uppercase">{u.name}</span>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Rol: Operador de Datos</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-300 uppercase block">PIN</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-black text-slate-700">
                            {showUserPins[u.pin] ? u.pin : 'â€¢â€¢â€¢â€¢'}
                          </span>
                          <button 
                            type="button"
                            onClick={() => {
                              setShowUserPins(prev => ({
                                ...prev,
                                [u.pin]: !prev[u.pin]
                              }));
                            }}
                            className="text-slate-400 hover:text-slate-500 transition-colors focus:outline-none"
                            title="Mostrar / Ocultar PIN"
                          >
                            {showUserPins[u.pin] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteUser(u.pin)}
                        className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] uppercase font-black transition-colors"
                        title="Eliminar acceso"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DISEÃ‘O GRAFICOS PERSONALIZADOS */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:border-r lg:border-slate-100 lg:pr-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-purple-600" />
                Configurar GrÃ¡fico DinÃ¡mico
              </h3>
              
              <form onSubmit={handleAddChart} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">TÃ­tulo del GrÃ¡fico</label>
                  <input
                    type="text"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                    placeholder="ej. EvoluciÃ³n Mensual de Volumen"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estructura del GrÃ¡fico</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold uppercase cursor-pointer"
                  >
                    <option value="bar">GrÃ¡fico de Barras</option>
                    <option value="line">GrÃ¡fico Lineal de EvoluciÃ³n</option>
                    <option value="area">GrÃ¡fico de Ãrea Immersive</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">KPI a Evaluar</label>
                  <select
                    value={chartKpiId}
                    onChange={(e) => setChartKpiId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold uppercase cursor-pointer"
                  >
                    {appConfig.kpis.map(k => (
                      <option key={k.id} value={k.id}>{k.label} ({k.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Enfoque / Scope</label>
                  <select
                    value={chartScope}
                    onChange={(e) => setChartScope(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold uppercase cursor-pointer"
                  >
                    <option value="all">Consolidado Total de Empresa</option>
                    {appConfig.routesTemplate.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Color del GrÃ¡fico (Paleta o Libre)</label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                    {PRESET_COLORS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setChartColor(p.value)}
                        className={`group relative h-7 rounded-lg border flex items-center justify-center transition-all ${chartColor === p.value ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full transition-transform group-hover:scale-110" 
                          style={{ backgroundColor: p.value }}
                        />
                        {chartColor === p.value && (
                          <Check className="w-2.5 h-2.5 text-white absolute bg-purple-600 rounded-full p-0.5 -top-1 -right-1" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <input
                      type="color"
                      value={chartColor}
                      onChange={(e) => setChartColor(e.target.value)}
                      className="cursor-pointer w-6 h-6 rounded border-0 p-0 overflow-hidden"
                      id="custom-chart-color-picker"
                      title="SelecciÃ³n de color libre"
                    />
                    <label htmlFor="custom-chart-color-picker" className="text-[9px] font-black text-slate-500 uppercase cursor-pointer flex-1">
                      Personalizado: <span className="font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 ml-1">{chartColor}</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/15"
                >
                  <TrendingUp className="w-4 h-4" />
                  Instanciar GrÃ¡fico
                </button>
              </form>

              {/* Manual KPI Creation Card - Dynamic quick access for GrÃ¡ficos */}
              <div className="border-t border-slate-150 pt-6 mt-6">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  Crear Nuevo KPI Manualmente
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4 leading-relaxed">
                  Agrega nuevos KPIs manuales que estarÃ¡n listos para ser seleccionados en la configuraciÃ³n del grÃ¡fico.
                </p>

                <form onSubmit={handleAddKpiFromChartsTab} className="flex flex-col gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-405 uppercase tracking-widest block mb-1">Nombre / Etiqueta del KPI</label>
                    <input
                      type="text"
                      value={chartKpiLabel}
                      onChange={(e) => setChartKpiLabel(e.target.value)}
                      placeholder="ej. Clientes Nuevos, Rechazos"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-405 uppercase tracking-widest block mb-1">Unidad</label>
                      <input
                        type="text"
                        value={chartKpiUnit}
                        onChange={(e) => setChartKpiUnit(e.target.value)}
                        placeholder="ej. Cjs, Pts, %"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-405 uppercase tracking-widest block mb-1">ID (Auto)</label>
                      <input
                        type="text"
                        disabled
                        value={chartKpiLabel ? chartKpiLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-") : ''}
                        placeholder="ej. clientes-nuevos"
                        className="w-full bg-slate-100 border border-slate-100 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest block mb-1">DescripciÃ³n corta</label>
                    <textarea
                      value={chartKpiDesc}
                      onChange={(e) => setChartKpiDesc(e.target.value)}
                      placeholder="MediciÃ³n rÃ¡pida para visualizadores de grÃ¡ficos..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10/10"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Registrar KPI Ahora
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                GrÃ¡ficos DinÃ¡micos Habilitados ({appConfig.customCharts.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appConfig.customCharts.length === 0 ? (
                  <div className="col-span-full border border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      No hay grÃ¡ficos dinÃ¡micos extras creados. Puedes instanciar nuevos a la izquierda y se renderizarÃ¡n solos al final del panel.
                    </p>
                  </div>
                ) : (
                  appConfig.customCharts.map(c => {
                    const matchedKpiName = appConfig.kpis.find(k => k.id === c.kpiId)?.label || c.kpiId;
                    const matchedRouteName = c.scope === 'all' ? 'Toda la empresa' : (appConfig.routesTemplate.find(r => r.id === c.scope)?.name || c.scope);
                    return (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-250 bg-white flex flex-col justify-between hover:shadow-sm transition-shadow h-32">
                        <div>
                          <span className="text-xs font-black text-slate-900 uppercase block leading-relaxed">{c.title}</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">
                              Grafico: {c.type}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                              KPI: {matchedKpiName}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full truncate max-w-xs">
                              Scope: {matchedRouteName}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteChart(c.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[9px] uppercase font-black tracking-widest transition-all gap-1 flex items-center ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remover
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: HISTORIAL DE CAMBIOS & AUDITORÃA */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <History className="w-5 h-5 text-[#2E86C1]" />
                  Historial y Registro de AuditorÃ­a
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">
                  BitÃ¡cora en tiempo real de cambios de datos, modificaciones de KPIs, altas y bajas de operadores.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Eventos Registrados ({auditLogs.length})
                </span>
                <span className="px-2.5 py-1 text-[9px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg">
                  Persistencia Segura
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <History className="w-10 h-10 text-slate-350 stroke-1 mb-3 animate-pulse" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    No se han registrado modificaciones estructurales o de datos aÃºn.
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                    Cada vez que un operador o VerÃ³nica efectÃºen cambios o borren datos se guardarÃ¡ aquÃ­.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="px-6 py-4 w-1/4">Fecha y Hora</th>
                        <th className="px-6 py-4 w-1/4">Operador / Administrador</th>
                        <th className="px-6 py-4 w-1/5">CategorÃ­a</th>
                        <th className="px-6 py-4">DescripciÃ³n del Cambio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-700 text-xs font-bold">
                      {[...auditLogs].reverse().map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-500">
                            {new Date(log.timestamp).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-800 font-extrabold uppercase">{log.user}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              log.action.includes('Baja') || log.action.includes('Elimin')
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : log.action.includes('Alta') || log.action.includes('Registr') || log.action.includes('Agregar')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-normal text-slate-600">
                            {log.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Admin Authorization Security Modal Overlay */}
      {pendingAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" id="security-pin-modal">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-slate-100">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="bg-red-500/20 text-red-500 p-2 rounded-xl border border-red-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Seguridad de Administrador</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">AutorizaciÃ³n Requerida</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-semibold mb-5 p-3 rounded-lg bg-slate-950/50 border border-slate-800/40">
              Se estÃ¡ intentando realizar una operaciÃ³n estructural: <br />
              <span className="text-amber-400 font-extrabold uppercase text-[10px] mt-2 inline-block leading-normal">
                "{pendingAction.message}"
              </span>
            </p>

            <form onSubmit={handleVerifyPin} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Clave / PIN de Acceso</label>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Ingrese clave de Admin"
                  className="w-full tracking-widest text-center text-sm font-black bg-slate-950 text-white border border-slate-800 rounded-xl py-2 focus:border-[#2E86C1] focus:outline-none transition-colors"
                  autoFocus
                />
                {pinError && (
                  <p className="text-[9px] text-rose-500 font-bold uppercase mt-2 text-center">
                    âš ï¸ {pinError}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPendingAction(null);
                    setAdminPinInput('');
                    setPinError('');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg text-[10px] font-extrabold uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-550 text-white rounded-lg text-[10px] font-black uppercase transition-colors shadow-lg shadow-blue-500/20"
                >
                  Confirmar Cambio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
