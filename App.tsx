import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RouteData, GoalStat } from './types';
import DashboardView from './components/DashboardView';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import { 
  BarChart3, LayoutDashboard, Calendar, Save, Check, ChevronDown, Download, 
  Award, Target, Users, TrendingUp, Edit, Shield, LogOut, Sparkles, UserCheck,
  Wifi, WifiOff, Database, Upload, RefreshCw, AlertTriangle, X, Maximize, Minimize
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, sanitizeFirestoreData } from './services/firebase';
import { collection, doc, setDoc, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import { validateWeekData, GeminiValidationResult } from './services/geminiService';
import { AlertCircle, FileWarning, ArrowRight, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- TYPE/INTERFACE DECLARATIONS FOR CONFIGURATION ---

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

interface ActiveUser {
  name: string;
  role: 'admin' | 'user';
  pin: string;
}

// --- STATIC FALLBACK DATA ---

const INITIAL_DATA: RouteData[] = [
  {
    id: 'luis-bocono',
    name: 'Luis Valles - BOCONO',
    clients: { meta: 40, real: 32 },
    boxes: { meta: 600, real: 450 },
    collection: { meta: 15000, real: 12000 },
    divisas: 8000,
    totalClients: 60,
    visitedClients: 42
  },
  {
    id: 'luis-guanare',
    name: 'Luis Valles - GUANARE',
    clients: { meta: 45, real: 42 },
    boxes: { meta: 800, real: 520 },
    collection: { meta: 25000, real: 18000 },
    divisas: 12000,
    totalClients: 75,
    visitedClients: 50
  },
  {
    id: 'alejandro-sabaneta',
    name: 'Alejandro Rojas - SABANETA-DOLORES',
    clients: { meta: 38, real: 39 },
    boxes: { meta: 650, real: 610 },
    collection: { meta: 18000, real: 17500 },
    divisas: 5000,
    totalClients: 65,
    visitedClients: 44
  },
  {
    id: 'alejandro-valera',
    name: 'Alejandro Rojas - VALERA',
    clients: { meta: 42, real: 35 },
    boxes: { meta: 700, real: 580 },
    collection: { meta: 20000, real: 16500 },
    divisas: 7000,
    totalClients: 70,
    visitedClients: 48
  },
  {
    id: 'kevin-sancarlos',
    name: 'Kevin Rodriguez - SAN CARLOS',
    clients: { meta: 42, real: 28 },
    boxes: { meta: 750, real: 400 },
    collection: { meta: 22000, real: 14000 },
    divisas: 9000,
    totalClients: 58,
    visitedClients: 36
  },
  {
    id: 'kevin-sanrafael',
    name: 'Kevin Rodriguez - SAN RAFAEL',
    clients: { meta: 35, real: 36 },
    boxes: { meta: 550, real: 540 },
    collection: { meta: 16000, real: 15800 },
    divisas: 7000,
    totalClients: 50,
    visitedClients: 40
  },
  {
    id: 'kevin-barinas',
    name: 'Kevin Rodriguez - BARINAS-BARINITAS',
    clients: { meta: 30, real: 12 },
    boxes: { meta: 450, real: 150 },
    collection: { meta: 12000, real: 5000 },
    divisas: 2000,
    totalClients: 45,
    visitedClients: 20
  },
  {
    id: 'gregory-turen',
    name: 'Gregory Rojas - TUREN-GUANARITO',
    clients: { meta: 50, real: 48 },
    boxes: { meta: 900, real: 850 },
    collection: { meta: 28000, real: 27000 },
    divisas: 15000,
    totalClients: 80,
    visitedClients: 55
  },
  {
    id: 'gregory-yaracuy',
    name: 'Gregory Rojas - YARACUY',
    clients: { meta: 45, real: 40 },
    boxes: { meta: 800, real: 720 },
    collection: { meta: 24000, real: 21000 },
    divisas: 11000,
    totalClients: 70,
    visitedClients: 48
  },
  {
    id: 'la-puerta',
    name: 'LUIZ RAMÍREZ - LA PUERTA GUANARE',
    clients: { meta: 25, real: 18 },
    boxes: { meta: 400, real: 310 },
    collection: { meta: 10000, real: 8500 },
    divisas: 4000,
    totalClients: 40,
    visitedClients: 22
  },
  {
    id: 'acarigua',
    name: 'ACARIGUA',
    clients: { meta: 65, real: 62 },
    boxes: { meta: 1200, real: 1180 },
    collection: { meta: 45000, real: 44000 },
    divisas: 25000,
    totalClients: 95,
    visitedClients: 70
  },
  {
    id: 'ospino-rio-acarigua',
    name: 'YOEL MORALES - OSPINO-RIO ACARIGUA',
    clients: { meta: 40, real: 30 },
    boxes: { meta: 600, real: 450 },
    collection: { meta: 15000, real: 11500 },
    divisas: 6000,
    totalClients: 55,
    visitedClients: 35
  }
];

// Helper to reset "Real" values to 0 for new weeks, keeping "Meta"

// Dynamically clears metas for week 22 onwards
const getTemplateForWeek = (weekId: string, baseTemplate: RouteData[]): RouteData[] => {
  const match = weekId?.match(/^week-(\d+)-\d{4}$/);
  if (match) {
    const weekNum = parseInt(match[1], 10);
    if (weekNum >= 22) {
      return baseTemplate.map(r => ({
        ...r,
        clients: { ...r.clients, meta: 0 },
        boxes: { ...r.boxes, meta: 0 },
        collection: { ...r.collection, meta: 0 },
        customKpis: r.customKpis ? Object.keys(r.customKpis).reduce((acc, k) => {
          acc[k] = { ...r.customKpis![k], meta: 0 };
          return acc;
        }, {} as Record<string, GoalStat>) : undefined
      }));
    }
  }
  return baseTemplate;
};

const getEmptyWeekData = (template: RouteData[]): RouteData[] => {
  return template.map(route => ({
    ...route,
    clients: { ...route.clients, real: 0 },
    boxes: { ...route.boxes, real: 0 },
    collection: { ...route.collection, real: 0 },
    divisas: 0,
    visitedClients: 0,
    // Clear custom KPIs real stats too
    customKpis: route.customKpis ? Object.keys(route.customKpis).reduce((acc, currentKpiId) => {
      acc[currentKpiId] = { meta: route.customKpis?.[currentKpiId]?.meta || 0, real: 0 };
      return acc;
    }, {} as Record<string, GoalStat>) : undefined
  }));
};

// Safe merge to incorporate schema changes or newly added routes into existing persistent storage
const mergeWithTemplate = (loadedRoutes: RouteData[], templateRouteForWeek: RouteData[], baseTemplate: RouteData[]): RouteData[] => {
  return templateRouteForWeek.map(templateRoute => {
    const existing = loadedRoutes.find(r => r.id === templateRoute.id);
    if (!existing) return templateRoute;

    const baseRoute = baseTemplate.find(r => r.id === templateRoute.id);

    // Deep merge core KPIs securely preserving manual edits and preventing accidental resets to 0
    // Once data is explicitly saved, those values are the absolute source of truth for the week.
    const resolveMeta = (kpiKey: 'clients' | 'boxes' | 'collection') => {
      const existMeta = existing[kpiKey]?.meta;
      const tempMeta = templateRoute[kpiKey]?.meta;
      
      if (existMeta !== undefined && typeof existMeta === 'number' && !isNaN(existMeta)) {
        return existMeta;
      }
      return tempMeta !== undefined ? tempMeta : 0;
    };

    const clientsMeta = resolveMeta('clients');
    const boxesMeta = resolveMeta('boxes');
    const collectionMeta = resolveMeta('collection');

    // Ensure custom KPIs are merged properly without resetting manual values
    const customMerged: Record<string, GoalStat> = {};
    if (templateRoute.customKpis || existing.customKpis) {
      const allKpiKeys = new Set([
        ...Object.keys(templateRoute.customKpis || {}),
        ...Object.keys(existing.customKpis || {})
      ]);

      allKpiKeys.forEach(kKey => {
        const tempK = templateRoute.customKpis?.[kKey];
        const existK = existing.customKpis?.[kKey];
        
        const customMeta = existK !== undefined && typeof existK.meta === 'number' && !isNaN(existK.meta) 
          ? existK.meta 
          : (tempK?.meta || 0);

        customMerged[kKey] = {
          meta: customMeta,
          real: existK !== undefined && typeof existK.real === 'number' && !isNaN(existK.real)
            ? existK.real 
            : (tempK?.real || 0)
        };
      });
    }

    return { 
      ...templateRoute, 
      ...existing, 
      clients: { ...templateRoute.clients, ...existing.clients, meta: clientsMeta },
      boxes: { ...templateRoute.boxes, ...existing.boxes, meta: boxesMeta },
      collection: { ...templateRoute.collection, ...existing.collection, meta: collectionMeta },
      name: templateRoute.name,
      customKpis: Object.keys(customMerged).length > 0 ? customMerged : undefined
    };
  });
};

interface WeekOption {
  id: string;
  label: string;
}

// Generate weeks for 2026 (Saturday to Saturday)
const generateWeeks2026 = (): WeekOption[] => {
  const weeks: WeekOption[] = [];
  let currentDate = new Date(2026, 0, 3); // first saturday of 2026
  
  for (let i = 1; i <= 52; i++) {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(startDate.getDate() + 7);

    const formatDate = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    weeks.push({
      id: `week-${i}-2026`,
      label: `Semana ${i}: ${formatDate(startDate)} - ${formatDate(endDate)}`
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }
  return weeks;
};

const WEEKS = generateWeeks2026();

const getCurrentWeekIdFor2026 = (): string => {
  const now = new Date();
  let currentDate = new Date(2026, 0, 3); // first saturday of 2026
  
  for (let i = 1; i <= 52; i++) {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(startDate.getDate() + 7);
    
    if (now.getTime() >= startDate.getTime() && now.getTime() < endDate.getTime()) {
      return `week-${i}-2026`;
    }
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  if (now.getTime() < new Date(2026, 0, 3).getTime()) {
    return 'week-1-2026';
  }
  return 'week-52-2026';
};

const getMonthFromWeek = (weekId: string): { name: string; index: number } => {
  const match = weekId.match(/^week-(\d+)-2026$/);
  if (!match) return { name: 'Enero', index: 0 };
  const weekNum = parseInt(match[1], 10);
  
  if (weekNum <= 4) return { name: 'Enero', index: 0 };
  if (weekNum <= 8) return { name: 'Febrero', index: 1 };
  if (weekNum <= 13) return { name: 'Marzo', index: 2 };
  if (weekNum <= 17) return { name: 'Abril', index: 3 };
  if (weekNum <= 22) return { name: 'Mayo', index: 4 };
  if (weekNum <= 26) return { name: 'Junio', index: 5 };
  if (weekNum <= 30) return { name: 'Julio', index: 6 };
  if (weekNum <= 35) return { name: 'Agosto', index: 7 };
  if (weekNum <= 39) return { name: 'Septiembre', index: 8 };
  if (weekNum <= 44) return { name: 'Octubre', index: 9 };
  if (weekNum <= 48) return { name: 'Noviembre', index: 10 };
  return { name: 'Diciembre', index: 11 };
};

// --- CORE APP COMPONENT ---

export const App: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<string>(() => getCurrentWeekIdFor2026());
  const [selectedSeller, setSelectedSeller] = useState<string>('all');

  // --- IDENTITY & ROLE-BASED ACCESS STATE ---
  // To ensure the application is secured, the active user session is NOT persisted in localStorage.
  // When the tab/window is closed or updated, state is unloaded, which automatically locks (logs out) the screen.
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null);

  useEffect(() => {
    // Clear any past persisted active users for robust security
    localStorage.removeItem('fv_active_user');
  }, []);

  // --- COMPREHENSIVE SECURITY LOGGING / AUDITING SYSTEM ---
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('fv_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Audit log parsing failed", e);
      }
    }
    return [];
  });

  const addAuditLog = (action: string, description: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      user: activeUser ? `${activeUser.name} (${activeUser.role === 'admin' ? 'Verónica' : 'Operador'})` : 'Desconocido',
      action,
      description
    };
    setAuditLogs(prev => {
      const updated = [...prev, newLog];
      localStorage.setItem('fv_audit_logs', JSON.stringify(updated));
      
      // Fire-and-forget sync to Firebase so it doesn't cause render loops
      setDoc(doc(db, 'settings', 'auditLogs'), sanitizeFirestoreData({
        logs: updated,
        updatedAt: new Date().toISOString()
      })).catch(e => handleFirestoreError(e, OperationType.WRITE, 'settings/auditLogs'));
      
      return updated;
    });
  };

  // Track if Admin tab is completely toggled on
  const [showAdminTab, setShowAdminTab] = useState<boolean>(false);

  // Guard to prevent overwriting Firestore settings with default local/stale values during startup.
  const [isConfigLoaded, setIsConfigLoaded] = useState<boolean>(false);

  // --- DYNAMIC APPLICATION STRUCUTRE CONFIGURATION ---
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('fv_dashboard_app_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.routesTemplate && parsed.kpis && parsed.customCharts && parsed.users) {
          return parsed;
        }
      } catch (e) {
        console.error("Config parse error", e);
      }
    }
    return {
      routesTemplate: INITIAL_DATA,
      kpis: [
        { id: 'clients', label: 'Clientes', unit: 'Ptos', description: 'Cobertura de clientes and puntos activados' },
        { id: 'boxes', label: 'Volumen', unit: 'Cjs', description: 'Volumen total despachado en cajas físicas' },
        { id: 'collection', label: 'Cobranza', unit: 'USD', description: 'Monto total recaudado en dólares' }
      ],
      customCharts: [],
      users: [
        { pin: '1111', name: 'Edwin Morillo', role: 'user' },
        { pin: '1234', name: 'Rodrigo Méndez', role: 'user' }
      ]
    };
  });

  // Sync general configurations with LocalStorage for quick local access
  useEffect(() => {
    localStorage.setItem('fv_dashboard_app_config', JSON.stringify(appConfig));
  }, [appConfig]);

  // Unified, mutation-driven configuration save helper (eliminates startup race conditions)
  const updateAndSyncAppConfig = async (newConfig: AppConfig) => {
    // 1. Update React memory state
    setAppConfig(newConfig);
    
    // 2. Persist to localStorage for rapid access next time
    localStorage.setItem('fv_dashboard_app_config', JSON.stringify(newConfig));
    
    // 3. Replicate immediately to Firestore for cross-device synchronization
    try {
      await setDoc(doc(db, 'settings', 'appConfig'), sanitizeFirestoreData({
        config: newConfig,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error("Cloud configuration replication failed:", e);
      handleFirestoreError(e, OperationType.WRITE, 'settings/appConfig');
    }
  };

  // Load configuration and previous weeks from Firestore on init and sync in real time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'settings'), (snapshot) => {
      snapshot.forEach((doc) => {
        if (doc.id === 'appConfig') {
          const data = doc.data();
          if (data && data.config) {
            setAppConfig(prev => {
              if (JSON.stringify(prev) === JSON.stringify(data.config)) {
                return prev;
              }
              // Also ensure LocalStorage always has the latest authentic security-verified operators
              localStorage.setItem('fv_dashboard_app_config', JSON.stringify(data.config));
              return data.config;
            });
          }
        } else if (doc.id === 'auditLogs') {
          const data = doc.data();
          if (data && data.logs) {
            setAuditLogs(prev => {
              if (JSON.stringify(prev) === JSON.stringify(data.logs)) {
                return prev;
              }
              return data.logs;
            });
          }
        } else if (doc.id === 'monthlyGoals') {
          const data = doc.data();
          if (data && data.goals) {
            setMonthlyGoals(prev => {
              if (JSON.stringify(prev) === JSON.stringify(data.goals)) {
                return prev;
              }
              localStorage.setItem('fv_monthly_goals', JSON.stringify(data.goals));
              return data.goals;
            });
          }
        }
      });
      setIsConfigLoaded(true);
    }, (error) => {
      console.error("Real-time settings sync failed, falling back to local storage:", error);
      setIsConfigLoaded(true);
      handleFirestoreError(error, OperationType.LIST, 'settings');
    });

    return () => unsubscribe();
  }, []);

  // --- CORE SYSTEM METRIC GOALS (MONTHLY GENERALS) ---
  const [monthlyGoals, setMonthlyGoals] = useState<Record<number, { clients: number; boxes: number; collection: number }>>(() => {
    const saved = localStorage.getItem('fv_monthly_goals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const defaults: Record<number, { clients: number; boxes: number; collection: number }> = {};
    for (let m = 0; m < 12; m++) {
      defaults[m] = { clients: 240, boxes: 5000, collection: 120000 };
    }
    return defaults;
  });

  const [isEditingMonthlyGoals, setIsEditingMonthlyGoals] = useState<boolean>(false);
  const [monthlyGoalsAtStart, setMonthlyGoalsAtStart] = useState<Record<number, { clients: number; boxes: number; collection: number }> | null>(null);

  useEffect(() => {
    if (isEditingMonthlyGoals) {
      // Create deep clone of goals before editing starts to calculate precise differences
      setMonthlyGoalsAtStart(JSON.parse(JSON.stringify(monthlyGoals)));
    } else {
      // User closed the editor: look for changed values and log them under who did it
      if (monthlyGoalsAtStart) {
        const diffs: string[] = [];
        const monthIndex = getMonthFromWeek(selectedWeek).index;
        const monthName = getMonthFromWeek(selectedWeek).name;
        const startObj = monthlyGoalsAtStart[monthIndex];
        const endObj = monthlyGoals[monthIndex];
        if (startObj && endObj) {
          if (startObj.clients !== endObj.clients) {
            diffs.push(`Clientes Cobertura: ${startObj.clients} ➔ ${endObj.clients}`);
          }
          if (startObj.boxes !== endObj.boxes) {
            diffs.push(`Volumen Cajas: ${startObj.boxes} ➔ ${endObj.boxes}`);
          }
          if (startObj.collection !== endObj.collection) {
            diffs.push(`Recaudación USD: $${new Intl.NumberFormat('en-US').format(startObj.collection)} ➔ $${new Intl.NumberFormat('en-US').format(endObj.collection)}`);
          }
        }
        
        if (diffs.length > 0) {
          addAuditLog('Metas Mensuales Modificadas', `${monthName}: ${diffs.join(' | ')}`);
          
          // Replicate immediately to cloud settings/monthlyGoals for instant safety
          const syncMonthlyGoalsToFirestore = async () => {
            try {
              await setDoc(doc(db, 'settings', 'monthlyGoals'), sanitizeFirestoreData({
                goals: monthlyGoals,
                updatedAt: new Date().toISOString()
              }));
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, 'settings/monthlyGoals');
            }
          };
          syncMonthlyGoalsToFirestore();
        }
        setMonthlyGoalsAtStart(null);
      }
    }
  }, [isEditingMonthlyGoals]);

  useEffect(() => {
    localStorage.setItem('fv_monthly_goals', JSON.stringify(monthlyGoals));
  }, [monthlyGoals]);

  // --- STATE OF DATABASE DATA ---
  const [historicalData, setHistoricalData] = useState<Record<string, RouteData[]>>(() => {
    const saved = localStorage.getItem('fv_dashboard_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved data", e);
      }
    }
    const currentWk = getCurrentWeekIdFor2026();
    return { [currentWk]: getTemplateForWeek(currentWk, appConfig.routesTemplate) };
  });

  const [routes, setRoutes] = useState<RouteData[]>(appConfig.routesTemplate);
  const [activeRouteId, setActiveRouteId] = useState<string>(appConfig.routesTemplate[0]?.id || 'luis-bocono');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [cloudLoadError, setCloudLoadError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [cloudWeekTimestamps, setCloudWeekTimestamps] = useState<Record<string, string>>({});
  const [showConflictModal, setShowConflictModal] = useState<{ weekId: string; onConfirmOverwrite: () => void; onCancel: () => void; } | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [validationResult, setValidationResult] = useState<GeminiValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showSyncErrorToast, setShowSyncErrorToast] = useState<{
    visible: boolean;
    message: string;
    weekId?: string;
  }>({ visible: false, message: '' });
  const [realtimeUpdateToast, setRealtimeUpdateToast] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: '' });
  const lastLocalSaveRef = useRef<Record<string, number>>({});

  // --- CONNECTIVITY & RESILIENT OFFLINE/ONLINE BACKUP SYSTEM STATE ---
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBackupCenter, setShowBackupCenter] = useState<boolean>(false);
  const [pendingSyncWeeks, setPendingSyncWeeks] = useState<string[]>(() => {
    const saved = localStorage.getItem('fv_pending_sync_weeks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Pending sync parse error", e);
      }
    }
    return [];
  });

  const triggerAutoSync = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    
    try {
      const savedPending = localStorage.getItem('fv_pending_sync_weeks');
      let weeksToSync: string[] = [];
      if (savedPending) {
        try { weeksToSync = JSON.parse(savedPending); } catch (_) {}
      }
      
      if (weeksToSync.length > 0) {
        setAutoSaveStatus('saving');
        let completed: string[] = [];
        
        let currentHist: Record<string, RouteData[]> = {};
        const newestHistStr = localStorage.getItem('fv_dashboard_data');
        if (newestHistStr) {
          try { currentHist = JSON.parse(newestHistStr); } catch (_) {}
        } else {
          currentHist = historicalData;
        }

        for (const wkId of weeksToSync) {
          const dataToSave = currentHist[wkId];
          if (dataToSave && dataToSave.length > 0) {
            try {
              const docRef = doc(db, 'weeks', wkId);
              await setDoc(docRef, sanitizeFirestoreData({
                id: wkId,
                routes: dataToSave,
                updatedAt: new Date().toISOString()
              }));
              completed.push(wkId);
            } catch (e) {
              console.error(`Auto-sync missed for ${wkId}:`, e);
            }
          } else {
            completed.push(wkId);
          }
        }
        
        const remaining = weeksToSync.filter(w => !completed.includes(w));
        setPendingSyncWeeks(remaining);
        localStorage.setItem('fv_pending_sync_weeks', JSON.stringify(remaining));
        
        if (remaining.length === 0) {
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        } else {
          setAutoSaveStatus('error');
        }
      }
    } catch (e) {
      console.error("Auto sync logic error:", e);
    }
  };

  const handleRetrySync = async (weekId?: string) => {
    const targetWeek = weekId || selectedWeek;
    setShowSyncErrorToast(prev => ({ ...prev, visible: false }));
    setIsSaving(true);
    setAutoSaveStatus('saving');
    
    try {
      const cleanRoutes = normalizeAndSanitizeRoutePayload(historicalData[targetWeek] || routes);
      const updatedWeekPayload = {
        id: targetWeek,
        routes: cleanRoutes,
        updatedAt: new Date().toISOString()
      };
      
      const docRef = doc(db, 'weeks', targetWeek);
      await setDoc(docRef, sanitizeFirestoreData(updatedWeekPayload));
      
      // Successfully synced!
      setPendingSyncWeeks(prev => prev.filter(w => w !== targetWeek));
      setIsSaving(false);
      setAutoSaveStatus('saved');
      setShowSaveSuccess(true);
      
      setTimeout(() => {
        setIsSaving(false);
        setShowSaveSuccess(false);
        setAutoSaveStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error("Manual direct save retry failed:", error);
      setIsSaving(false);
      setAutoSaveStatus('error');
      
      // Reshow toast
      setTimeout(() => {
        setShowSyncErrorToast({
          visible: true,
          message: `La sincronización manual con Firestore volvió a fallar para la jornada '${targetWeek}'. Se mantendrá el respaldo local seguro.`,
          weekId: targetWeek
        });
      }, 500);
    }
  };

  const backupAllToCloud = async () => {
    setIsSaving(true);
    setAutoSaveStatus('saving');
    try {
      await setDoc(doc(db, 'settings', 'appConfig'), sanitizeFirestoreData({
        config: appConfig,
        updatedAt: new Date().toISOString()
      }));
      
      await setDoc(doc(db, 'settings', 'monthlyGoals'), sanitizeFirestoreData({
        goals: monthlyGoals,
        updatedAt: new Date().toISOString()
      }));
      
      for (const wkId of Object.keys(historicalData)) {
        await setDoc(doc(db, 'weeks', wkId), sanitizeFirestoreData({
          id: wkId,
          routes: historicalData[wkId],
          updatedAt: new Date().toISOString()
        }));
      }
      
      setPendingSyncWeeks([]);
      localStorage.setItem('fv_pending_sync_weeks', JSON.stringify([]));
      setIsSaving(false);
      setAutoSaveStatus('saved');
      setShowSaveSuccess(true);
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
      alert("¡Copia de seguridad en la nube completada exitosamente! Todo el padrón general ha sido respaldado.");
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      setAutoSaveStatus('error');
      setShowSyncErrorToast({
        visible: true,
        message: "Fallo general de conexión al intentar realizar la copia de seguridad general del padrón en la nube.",
        weekId: selectedWeek
      });
      alert("Error al intentar realizar backup en la nube. Tu información sigue estando resguardada de forma íntegra en local.");
    }
  };

  const downloadSystemBackup = () => {
    const backupObj = {
      version: "fv-v1-backup",
      createdAt: new Date().toISOString(),
      appConfig,
      monthlyGoals,
      historicalData
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Copia_De_Seguridad_FV_Grupo_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const restoreSystemBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text);
        if (backup?.version === "fv-v1-backup" && backup.appConfig && backup.historicalData) {
          setAppConfig(backup.appConfig);
          localStorage.setItem('fv_dashboard_app_config', JSON.stringify(backup.appConfig));
          
          if (backup.monthlyGoals) {
            setMonthlyGoals(backup.monthlyGoals);
            localStorage.setItem('fv_monthly_goals', JSON.stringify(backup.monthlyGoals));
          }
          
          setHistoricalData(backup.historicalData);
          localStorage.setItem('fv_dashboard_data', JSON.stringify(backup.historicalData));
          
          const allWeekIds = Object.keys(backup.historicalData);
          setPendingSyncWeeks(allWeekIds);
          localStorage.setItem('fv_pending_sync_weeks', JSON.stringify(allWeekIds));
          
          alert("¡Copia de seguridad restaurada de forma impecable en la memoria local! Sincronizando de forma automatizada en la nube...");
          
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            triggerAutoSync();
          }
        } else {
          alert("El archivo adjunto no es un respaldo legítimo y estructurado del sistema.");
        }
      } catch (err) {
        console.error(err);
        alert("Fallo al decodificar y restablecer el archivo de copia de seguridad.");
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [historicalData, appConfig, monthlyGoals, selectedWeek, routes]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
      setIsFullscreen(true);
    } else {
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      } else if (isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  useEffect(() => {
    localStorage.setItem('fv_pending_sync_weeks', JSON.stringify(pendingSyncWeeks));
  }, [pendingSyncWeeks]);

  // Load active weeks dataset on mount and listen for changes
  useEffect(() => {
    let initialLoad = true;
    const unsubscribe = onSnapshot(collection(db, 'weeks'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (data && data.routes) {
          const weekId = change.doc.id;
          const isRemoteChange = !snapshot.metadata.hasPendingWrites;
          
          const lastLocalSaveTime = lastLocalSaveRef.current[weekId] || 0;
          const timeSinceLocalSave = Date.now() - lastLocalSaveTime;
          
          let stateChanged = false;
          
          setHistoricalData(prev => {
            if (JSON.stringify(prev[weekId]) === JSON.stringify(data.routes)) {
              return prev;
            }
            
            stateChanged = true;
            const merged = { ...prev, [weekId]: data.routes };
            localStorage.setItem('fv_dashboard_data', JSON.stringify(merged));
            return merged;
          });
          
          if (stateChanged && !initialLoad && isRemoteChange && timeSinceLocalSave > 5000) {
            setRealtimeUpdateToast({
              visible: true,
              message: `La jornada ${weekId} ha sido actualizada en tiempo real por el sistema/otro usuario.`
            });
            setTimeout(() => setRealtimeUpdateToast({ visible: false, message: '' }), 6000);
          }
          
          if (data.updatedAt) {
            setCloudWeekTimestamps(prev => ({ ...prev, [weekId]: data.updatedAt }));
          }
        }
      });
      initialLoad = false;
    }, (error) => {
      console.error("Historical fetch failed, using local caching:", error);
      setCloudLoadError("No se pudo sincronizar algunos datos de la nube, usando caché local.");
      handleFirestoreError(error, OperationType.LIST, 'weeks');
    });

    return () => unsubscribe();
  }, []);

  // Update rows template when active week toggles
  useEffect(() => {
    const templateForWeek = getTemplateForWeek(selectedWeek, appConfig.routesTemplate);
    let rawRoutes: RouteData[];
    if (historicalData[selectedWeek]) {
      rawRoutes = historicalData[selectedWeek];
    } else {
      rawRoutes = getEmptyWeekData(templateForWeek);
    }
    const merged = mergeWithTemplate(rawRoutes, templateForWeek, appConfig.routesTemplate);
    
    // FORENSIC AUDIT OPTIMIZATION: Compare structurally to avoid cascading React renders if inputs are already identical
    setRoutes(prevRoutes => {
      if (JSON.stringify(prevRoutes) === JSON.stringify(merged)) {
        return prevRoutes;
      }
      return merged;
    });

    setShowSaveSuccess(false);
    setIsDirty(false);
    setAutoSaveStatus('idle');
  }, [selectedWeek, historicalData, appConfig.routesTemplate]);

  // Extract unique sellers dynamically from config template
  const uniqueSellers = useMemo(() => {
    const sellersSet = new Set<string>();
    appConfig.routesTemplate.forEach(route => {
      if (route.name.includes(' - ')) {
        const seller = route.name.split(' - ')[0];
        if (seller) sellersSet.add(seller);
      }
    });
    return Array.from(sellersSet).sort();
  }, [appConfig.routesTemplate]);

  // Filter routes by salesperson focus
  const sellerRoutesForCurrentWeek = useMemo(() => {
    if (selectedSeller === 'all') return routes;
    return routes.filter(r => {
      const seller = r.name.includes(' - ') ? r.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
      return seller === selectedSeller;
    });
  }, [routes, selectedSeller]);

  // Consolidate current week performance for filter group
  const consolidatedRouteForCurrentWeek = useMemo(() => {
    if (selectedSeller === 'all' || sellerRoutesForCurrentWeek.length === 0) return null;
    
    // Aggregate core and custom KPIs
    const initialConsolidated: RouteData = {
      id: 'consolidated',
      name: `Consolidado - ${selectedSeller}`,
      clients: { meta: 0, real: 0 },
      boxes: { meta: 0, real: 0 },
      collection: { meta: 0, real: 0 },
      divisas: 0,
      totalClients: 0,
      visitedClients: 0,
      customKpis: {}
    };

    return sellerRoutesForCurrentWeek.reduce<RouteData>((acc, curr) => {
      // Core sums
      acc.clients.meta += curr.clients?.meta || 0;
      acc.clients.real += curr.clients?.real || 0;
      acc.boxes.meta += curr.boxes?.meta || 0;
      acc.boxes.real += curr.boxes?.real || 0;
      acc.collection.meta += curr.collection?.meta || 0;
      acc.collection.real += curr.collection?.real || 0;
      acc.divisas += curr.divisas || 0;
      acc.totalClients += curr.totalClients || 0;
      acc.visitedClients += curr.visitedClients || 0;

      // Custom KPI sums
      if (curr.customKpis) {
        if (!acc.customKpis) acc.customKpis = {};
        Object.keys(curr.customKpis).forEach(k => {
          if (!acc.customKpis![k]) acc.customKpis![k] = { meta: 0, real: 0 };
          acc.customKpis![k].meta += curr.customKpis![k]?.meta || 0;
          acc.customKpis![k].real += curr.customKpis![k]?.real || 0;
        });
      }

      return acc;
    }, initialConsolidated);
  }, [selectedSeller, sellerRoutesForCurrentWeek]);

  // Consolidate previous week worked (exactly 15 days retrospect)
  const consolidatedPreviousRoute = useMemo(() => {
    if (selectedSeller === 'all') return undefined;
    
    const match = selectedWeek.match(/^week-(\d+)-2026$/);
    const currentWeekNumber = match ? parseInt(match[1], 10) : null;
    const previousWeekId = currentWeekNumber && currentWeekNumber > 2 ? `week-${currentWeekNumber - 2}-2026` : null;
    
    if (!previousWeekId) return undefined;
    
    const templateForPrev = getTemplateForWeek(previousWeekId, appConfig.routesTemplate);
    const prevRoutes = historicalData[previousWeekId] || getEmptyWeekData(templateForPrev);
    const mergedPrev = mergeWithTemplate(prevRoutes, templateForPrev, appConfig.routesTemplate);
    
    const sellerPrevRoutes = mergedPrev.filter(r => {
      const seller = r.name.includes(' - ') ? r.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
      return seller === selectedSeller;
    });

    if (sellerPrevRoutes.length === 0) return undefined;

    const initialConsolidated: RouteData = {
      id: 'consolidated',
      name: `Consolidado - ${selectedSeller}`,
      clients: { meta: 0, real: 0 },
      boxes: { meta: 0, real: 0 },
      collection: { meta: 0, real: 0 },
      divisas: 0,
      totalClients: 0,
      visitedClients: 0,
      customKpis: {}
    };

    return sellerPrevRoutes.reduce<RouteData>((acc, curr) => {
      acc.clients.meta += curr.clients?.meta || 0;
      acc.clients.real += curr.clients?.real || 0;
      acc.boxes.meta += curr.boxes?.meta || 0;
      acc.boxes.real += curr.boxes?.real || 0;
      acc.collection.meta += curr.collection?.meta || 0;
      acc.collection.real += curr.collection?.real || 0;
      acc.divisas += curr.divisas || 0;
      acc.totalClients += curr.totalClients || 0;
      acc.visitedClients += curr.visitedClients || 0;

      if (curr.customKpis) {
        if (!acc.customKpis) acc.customKpis = {};
        Object.keys(curr.customKpis).forEach(k => {
          if (!acc.customKpis![k]) acc.customKpis![k] = { meta: 0, real: 0 };
          acc.customKpis![k].meta += curr.customKpis![k]?.meta || 0;
          acc.customKpis![k].real += curr.customKpis![k]?.real || 0;
        });
      }

      return acc;
    }, initialConsolidated);
  }, [selectedSeller, selectedWeek, historicalData, appConfig.routesTemplate]);

  // Keep route focus aligned during salesperson filter transitions
  useEffect(() => {
    if (selectedSeller !== 'all') {
      setActiveRouteId('consolidated');
    } else {
      setActiveRouteId(prev => prev === 'consolidated' ? (appConfig.routesTemplate[0]?.id || 'luis-bocono') : prev);
    }
  }, [selectedSeller]);

  const activeRoute = useMemo(() => {
    if (selectedSeller !== 'all' && activeRouteId === 'consolidated') {
      return consolidatedRouteForCurrentWeek || routes[0];
    }
    const found = routes.find(r => r.id === activeRouteId);
    if (!found) {
      console.warn("Active route lost, keeping previous or falling back to [0]");
    }
    return found || routes[0];
  }, [routes, activeRouteId, selectedSeller, consolidatedRouteForCurrentWeek]);

  // Prior week calculated for comparisons
  const previousRoute = useMemo(() => {
    if (selectedSeller !== 'all' && activeRouteId === 'consolidated') {
      return consolidatedPreviousRoute;
    }
    
    const match = selectedWeek.match(/^week-(\d+)-2026$/);
    const currentWeekNumber = match ? parseInt(match[1], 10) : null;
    const previousWeekId = currentWeekNumber && currentWeekNumber > 2 ? `week-${currentWeekNumber - 2}-2026` : null;
    
    if (!previousWeekId) return undefined;
    
    const templateForPrev = getTemplateForWeek(previousWeekId, appConfig.routesTemplate);
    const prevRoutes = historicalData[previousWeekId] || getEmptyWeekData(templateForPrev);
    const mergedPrev = mergeWithTemplate(prevRoutes, templateForPrev, appConfig.routesTemplate);
    return mergedPrev.find(r => r.id === activeRoute.id);
  }, [selectedWeek, historicalData, activeRoute.id, selectedSeller, activeRouteId, consolidatedPreviousRoute, appConfig.routesTemplate]);

  // Cumulative monthly stats calculation
  const monthlyCumulativeStats = useMemo(() => {
    const currentMonth = getMonthFromWeek(selectedWeek);
    
    let totalRealClients = 0;
    let totalRealBoxes = 0;
    let totalRealCollection = 0;

    const match = selectedWeek.match(/^week-(\d+)-2026$/);
    const selectedWeekNum = match ? parseInt(match[1], 10) : 6;

    for (let w = 1; w <= 52; w++) {
      const weekId = `week-${w}-2026`;
      const mInfo = getMonthFromWeek(weekId);
      
      if (mInfo.index === currentMonth.index && w <= selectedWeekNum) {
        let weekRoutes = historicalData[weekId];
        if (weekId === selectedWeek) {
          weekRoutes = routes;
        }
        const templateForLoopWeek = getTemplateForWeek(weekId, appConfig.routesTemplate);
        const actualRoutes = weekRoutes ? mergeWithTemplate(weekRoutes, templateForLoopWeek, appConfig.routesTemplate) : getEmptyWeekData(templateForLoopWeek);
        
        const relevantRoutes = selectedSeller === 'all' 
          ? actualRoutes 
          : actualRoutes.filter(r => {
              const seller = r.name.includes(' - ') ? r.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
              return seller === selectedSeller;
            });

        relevantRoutes.forEach(r => {
          totalRealClients += r.clients?.real || 0;
          totalRealBoxes += r.boxes?.real || 0;
          totalRealCollection += r.collection?.real || 0;
        });
      }
    }

    return {
      clients: totalRealClients,
      boxes: totalRealBoxes,
      collection: totalRealCollection
    };
  }, [selectedWeek, historicalData, routes, selectedSeller, appConfig.routesTemplate]);

  // CSV Spreadsheet Export Engine
  const downloadCSV = () => {
    const weekLabel = WEEKS.find(w => w.id === selectedWeek)?.label || selectedWeek;
    let csvContent = "\uFEFF"; // BOM for Excel Compatibility
    csvContent += "Semana,Vendedor,Sub-Ruta,Clientes Meta,Clientes Logrado,Clientes Visitados,Clientes Total Cartera,Cajas Meta,Cajas Logrado,Cobranza Meta (USD),Cobranza Logrado (USD),Divisas Efectivo (USD),% Cobertura,% Cajas,% Cobranza\n";
    
    const routesToExport = selectedSeller === 'all' 
      ? routes 
      : routes.filter(r => {
          const s = r.name.includes(' - ') ? r.name.split(' - ')[0] : 'FV MEGAMAYORISTA';
          return s === selectedSeller;
        });

    routesToExport.forEach(r => {
      const [vendedor, subRuta] = r.name.includes(' - ') ? r.name.split(' - ') : ['FV MEGAMAYORISTA', r.name];
      const clientPct = r.clients.meta > 0 ? Math.round((r.clients.real / r.clients.meta) * 100) : 0;
      const boxPct = r.boxes.meta > 0 ? Math.round((r.boxes.real / r.boxes.meta) * 100) : 0;
      const colPct = r.collection.meta > 0 ? Math.round((r.collection.real / r.collection.meta) * 100) : 0;
      
      const line = [
        `"${weekLabel}"`,
        `"${vendedor.replace(/"/g, '""')}"`,
        `"${subRuta.replace(/"/g, '""')}"`,
        r.clients.meta,
        r.clients.real,
        r.visitedClients,
        r.totalClients,
        r.boxes.meta,
        r.boxes.real,
        r.collection.meta,
        r.collection.real,
        r.divisas,
        `"${clientPct}%"`,
        `"${boxPct}%"`,
        `"${colPct}%"`
      ].join(",");
      
      csvContent += line + "\n";
    });

    if (selectedSeller !== 'all' && consolidatedRouteForCurrentWeek) {
      const c = consolidatedRouteForCurrentWeek;
      const clientPct = c.clients.meta > 0 ? Math.round((c.clients.real / c.clients.meta) * 100) : 0;
      const boxPct = c.boxes.meta > 0 ? Math.round((c.boxes.real / c.boxes.meta) * 100) : 0;
      const colPct = c.collection.meta > 0 ? Math.round((c.collection.real / c.collection.meta) * 100) : 0;
      
      const summaryLine = [
        `"CONSOLIDADO SEMANAL"`,
        `"${selectedSeller}"`,
        `"TOTAL CONSOLIDADO"`,
        c.clients.meta,
        c.clients.real,
        c.visitedClients,
        c.totalClients,
        c.boxes.meta,
        c.boxes.real,
        c.collection.meta,
        c.collection.real,
        c.divisas,
        `"${clientPct}%"`,
        `"${boxPct}%"`,
        `"${colPct}%"`
      ].join(",");
      csvContent += summaryLine + "\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_FV_Grupo_${selectedSeller === 'all' ? 'Completo' : selectedSeller}_${selectedWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateData = (updatedRoute: RouteData) => {
    setRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
    setShowSaveSuccess(false);
    setIsDirty(true);
    setAutoSaveStatus('pending');
  };

  // Forensic normalization & deep sanitization to guarantee complete data integrity in Firebase and prevent undefined fields.
  const normalizeAndSanitizeRoutePayload = (routesList: RouteData[]): RouteData[] => {
    if (!Array.isArray(routesList)) return [];
    return routesList.map(r => {
      const clients = {
        meta: typeof r.clients?.meta === 'number' && !isNaN(r.clients.meta) ? r.clients.meta : 0,
        real: typeof r.clients?.real === 'number' && !isNaN(r.clients.real) ? r.clients.real : 0,
      };
      const boxes = {
        meta: typeof r.boxes?.meta === 'number' && !isNaN(r.boxes.meta) ? r.boxes.meta : 0,
        real: typeof r.boxes?.real === 'number' && !isNaN(r.boxes.real) ? r.boxes.real : 0,
      };
      const collection = {
        meta: typeof r.collection?.meta === 'number' && !isNaN(r.collection.meta) ? r.collection.meta : 0,
        real: typeof r.collection?.real === 'number' && !isNaN(r.collection.real) ? r.collection.real : 0,
      };
      
      const divisas = typeof r.divisas === 'number' && !isNaN(r.divisas) ? r.divisas : 0;
      const totalClients = typeof r.totalClients === 'number' && !isNaN(r.totalClients) ? r.totalClients : 0;
      const visitedClients = typeof r.visitedClients === 'number' && !isNaN(r.visitedClients) ? r.visitedClients : 0;

      const customKpis: Record<string, GoalStat> = {};
      if (r.customKpis) {
        Object.keys(r.customKpis).forEach(k => {
          const orig = r.customKpis?.[k];
          if (orig) {
            customKpis[k] = {
              meta: typeof orig.meta === 'number' && !isNaN(orig.meta) ? orig.meta : 0,
              real: typeof orig.real === 'number' && !isNaN(orig.real) ? orig.real : 0,
            };
          }
        });
      }

      return {
        id: r.id || '',
        name: r.name || '',
        clients,
        boxes,
        collection,
        divisas,
        totalClients,
        visitedClients,
        customKpis
      };
    });
  };

  // Debounced auto-save hook
  useEffect(() => {
    if (!isDirty) return;

    const delayDebounceFn = setTimeout(async () => {
      setAutoSaveStatus('saving');
      
      const cleanRoutes = normalizeAndSanitizeRoutePayload(routes);
      const updatedWeekPayload = {
        id: selectedWeek,
        routes: cleanRoutes,
        updatedAt: new Date().toISOString()
      };

      // Always save locally immediately
      const newData = {
        ...historicalData,
        [selectedWeek]: cleanRoutes
      };
      setHistoricalData(newData);
      localStorage.setItem('fv_dashboard_data', JSON.stringify(newData));

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const docRef = doc(db, 'weeks', selectedWeek);
          await setDoc(docRef, sanitizeFirestoreData(updatedWeekPayload));
          setPendingSyncWeeks(prev => prev.filter(w => w !== selectedWeek));
          
          setIsDirty(false);
          setAutoSaveStatus('saved');
          setTimeout(() => {
            setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 3000);
        } catch (error: any) {
          console.warn("Auto-save cloud sync failed, keeping local offline copy:", error);
          if (!pendingSyncWeeks.includes(selectedWeek)) {
            setPendingSyncWeeks(prev => [...prev, selectedWeek]);
          }
          setIsDirty(false);
          setAutoSaveStatus('saved');
          
          let errorMsg = `Falló el auto-guardado automático de la jornada '${selectedWeek}' en Firestore. Se resguardó de forma local.`;
          if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded')) {
             errorMsg = `Has excedido el límite gratuito de la base de datos (Cuota excedida). Tus cambios se han guardado de forma segura en la memoria de tu dispositivo.`;
          }
          
          setShowSyncErrorToast({
            visible: true,
            message: errorMsg,
            weekId: selectedWeek
          });
        }
      } else {
        // Offline: Queue it for sync
        if (!pendingSyncWeeks.includes(selectedWeek)) {
          setPendingSyncWeeks(prev => [...prev, selectedWeek]);
        }
        setIsDirty(false);
        setAutoSaveStatus('saved');
      }
    }, 3000);

    return () => clearTimeout(delayDebounceFn);
  }, [routes, isDirty, selectedWeek, historicalData, pendingSyncWeeks]);

  const logRouteDiffs = (oldRoutesList: RouteData[], newRoutesList: RouteData[], weekId: string) => {
    const diffs: string[] = [];
    
    newRoutesList.forEach(newRoute => {
      const oldRoute = oldRoutesList.find(o => o.id === newRoute.id);
      if (!oldRoute) return;
      
      const routeDiffs: string[] = [];

      // Compare clients
      if ((oldRoute.clients?.meta ?? 0) !== (newRoute.clients?.meta ?? 0)) {
        routeDiffs.push(`Clientes Meta: ${oldRoute.clients?.meta ?? 0} ➔ ${newRoute.clients?.meta ?? 0}`);
      }
      if ((oldRoute.clients?.real ?? 0) !== (newRoute.clients?.real ?? 0)) {
        routeDiffs.push(`Clientes Real: ${oldRoute.clients?.real ?? 0} ➔ ${newRoute.clients?.real ?? 0}`);
      }

      // Compare boxes
      if ((oldRoute.boxes?.meta ?? 0) !== (newRoute.boxes?.meta ?? 0)) {
        routeDiffs.push(`Cajas Meta: ${oldRoute.boxes?.meta ?? 0} ➔ ${newRoute.boxes?.meta ?? 0}`);
      }
      if ((oldRoute.boxes?.real ?? 0) !== (newRoute.boxes?.real ?? 0)) {
        routeDiffs.push(`Cajas Real: ${oldRoute.boxes?.real ?? 0} ➔ ${newRoute.boxes?.real ?? 0}`);
      }

      // Compare collection
      if ((oldRoute.collection?.meta ?? 0) !== (newRoute.collection?.meta ?? 0)) {
        routeDiffs.push(`Cobranza Meta: $${oldRoute.collection?.meta ?? 0} ➔ $${newRoute.collection?.meta ?? 0}`);
      }
      if ((oldRoute.collection?.real ?? 0) !== (newRoute.collection?.real ?? 0)) {
        routeDiffs.push(`Cobranza Real: $${oldRoute.collection?.real ?? 0} ➔ $${newRoute.collection?.real ?? 0}`);
      }

      // Compare divisas
      if ((oldRoute.divisas ?? 0) !== (newRoute.divisas ?? 0)) {
        routeDiffs.push(`Efectivo Divisas: $${oldRoute.divisas ?? 0} ➔ $${newRoute.divisas ?? 0}`);
      }

      // Compare totalClients
      if ((oldRoute.totalClients ?? 0) !== (newRoute.totalClients ?? 0)) {
        routeDiffs.push(`Total Cartera: ${oldRoute.totalClients ?? 0} ➔ ${newRoute.totalClients ?? 0}`);
      }

      // Compare visitedClients
      if ((oldRoute.visitedClients ?? 0) !== (newRoute.visitedClients ?? 0)) {
        routeDiffs.push(`Clientes Visitados: ${oldRoute.visitedClients ?? 0} ➔ ${newRoute.visitedClients ?? 0}`);
      }

      // Compare custom KPIs
      const allKpiIds = new Set([
        ...Object.keys(oldRoute.customKpis || {}),
        ...Object.keys(newRoute.customKpis || {})
      ]);
      allKpiIds.forEach(kId => {
        const oldK = oldRoute.customKpis?.[kId];
        const newK = newRoute.customKpis?.[kId];
        if ((oldK?.meta ?? 0) !== (newK?.meta ?? 0)) {
          routeDiffs.push(`KPI ${kId} Meta: ${oldK?.meta ?? 0} ➔ ${newK?.meta ?? 0}`);
        }
        if ((oldK?.real ?? 0) !== (newK?.real ?? 0)) {
          routeDiffs.push(`KPI ${kId} Real: ${oldK?.real ?? 0} ➔ ${newK?.real ?? 0}`);
        }
      });

      if (routeDiffs.length > 0) {
        diffs.push(`${newRoute.name} (${routeDiffs.join(', ')})`);
      }
    });

    if (diffs.length > 0) {
      addAuditLog('Ajuste de Datos', `Semana ${weekId}: ${diffs.join(' | ')}`);
    } else {
      addAuditLog('Actualización de datos', `Guardó los datos operativos de la semana ${weekId} sin cambios.`);
    }
  };

  const performCloudWrite = async (docRef: any, updatedWeekPayload: any, cleanRoutes: any, triggerValidation: boolean) => {
    try {
      lastLocalSaveRef.current[selectedWeek] = Date.now();
      await setDoc(docRef, sanitizeFirestoreData(updatedWeekPayload));
      setCloudWeekTimestamps(prev => ({ ...prev, [selectedWeek]: updatedWeekPayload.updatedAt }));
      setPendingSyncWeeks(prev => prev.filter(w => w !== selectedWeek));
      
      setIsSaving(false);
      setShowSaveSuccess(true);
      setIsDirty(false);
      setAutoSaveStatus('saved');
      setTimeout(() => {
        setShowSaveSuccess(false);
        setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 3000);

      if (triggerValidation) {
        setIsValidating(true);
        validateWeekData(cleanRoutes, selectedWeek)
          .then(result => {
            setIsValidating(false);
            if (result.hasInconsistencies) {
              setValidationResult(result);
              setShowValidationModal(true);
            }
          })
          .catch(err => {
            setIsValidating(false);
            console.warn("Gemini context validation fallback triggered:", err.message);
          });
      } else {
        setShowValidationModal(false);
      }
    } catch (error) {
      console.warn("Direct handleSave cloud failed, keeping local offline backup:", error);
      if (!pendingSyncWeeks.includes(selectedWeek)) {
        setPendingSyncWeeks(prev => [...prev, selectedWeek]);
      }
      setIsSaving(false);
      setShowSaveSuccess(true);
      setIsDirty(false);
      setAutoSaveStatus('saved');
      setShowSyncErrorToast({
        visible: true,
        message: `La sincronización de la jornada '${selectedWeek}' con Firestore falló. Tus cambios quedan resguardados localmente.`,
        weekId: selectedWeek
      });
      setTimeout(() => {
        setShowSaveSuccess(false);
        setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 3000);
      if (!triggerValidation) {
        setShowValidationModal(false);
      }
    }
  };

  const saveToCloudWithConflictCheck = async (updatedWeekPayload: any, cleanRoutes: any, triggerValidation = false) => {
    try {
      const docRef = doc(db, 'weeks', selectedWeek);
      const cloudDoc = await getDoc(docRef);
      
      if (cloudDoc.exists()) {
        const cloudData = cloudDoc.data();
        const lastKnownAt = cloudWeekTimestamps[selectedWeek];
        if (cloudData.updatedAt && lastKnownAt && new Date(cloudData.updatedAt) > new Date(lastKnownAt)) {
          setAutoSaveStatus('error');
          setShowConflictModal({
            weekId: selectedWeek,
            onConfirmOverwrite: async () => {
              setShowConflictModal(null);
              setIsSaving(true);
              setAutoSaveStatus('saving');
              await performCloudWrite(docRef, updatedWeekPayload, cleanRoutes, triggerValidation);
              addAuditLog('Resolución de Conflicto', `El usuario ${activeUser?.name} sobrescribió la semana ${selectedWeek} de forma manual tras una advertencia de colisión de datos.`);
            },
            onCancel: () => setShowConflictModal(null)
          });
          return;
        }
      }
      
      await performCloudWrite(docRef, updatedWeekPayload, cleanRoutes, triggerValidation);
    } catch (globalError) {
      console.error("Concurrency check failed:", globalError);
      // Fallback: Just try to save it anyway if network weirdness happened
      const docRef = doc(db, 'weeks', selectedWeek);
      await performCloudWrite(docRef, updatedWeekPayload, cleanRoutes, triggerValidation);
    }
  };

  const executeSave = async () => {
    setIsSaving(true);
    setCloudLoadError(null);
    
    const cleanRoutes = normalizeAndSanitizeRoutePayload(routes);
    const updatedWeekPayload = {
      id: selectedWeek,
      routes: cleanRoutes,
      updatedAt: new Date().toISOString()
    };

    // Calculate and record precise previous vs new comparison logs
    const oldRoutes = historicalData[selectedWeek] || [];
    logRouteDiffs(oldRoutes, cleanRoutes, selectedWeek);

    // Always save locally immediately
    const newData = {
      ...historicalData,
      [selectedWeek]: cleanRoutes
    };
    setHistoricalData(newData);
    localStorage.setItem('fv_dashboard_data', JSON.stringify(newData));

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await saveToCloudWithConflictCheck(updatedWeekPayload, cleanRoutes, false);
    } else {
      if (!pendingSyncWeeks.includes(selectedWeek)) {
        setPendingSyncWeeks(prev => [...prev, selectedWeek]);
      }
      setIsSaving(false);
      setShowSaveSuccess(true);
      setIsDirty(false);
      setAutoSaveStatus('saved');
      setTimeout(() => {
        setShowSaveSuccess(false);
        setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 3000);
      setShowValidationModal(false);
    }
  };

  const handleSave = async () => {
    // 1. FAST-PATH: Persist immediately to LocalStorage (<300ms)
    setIsSaving(true);
    setCloudLoadError(null);
    setShowSaveSuccess(false);

    try {
      const cleanRoutes = normalizeAndSanitizeRoutePayload(routes);
      const updatedWeekPayload = {
        id: selectedWeek,
        routes: cleanRoutes,
        updatedAt: new Date().toISOString()
      };

      // Calculate and record precise previous vs new comparison logs
      const oldRoutes = historicalData[selectedWeek] || [];
      logRouteDiffs(oldRoutes, cleanRoutes, selectedWeek);

      const newData = {
        ...historicalData,
        [selectedWeek]: cleanRoutes
      };
      setHistoricalData(newData);
      localStorage.setItem('fv_dashboard_data', JSON.stringify(newData));

      // Immediate UI responsiveness success confirmation
      setIsSaving(false);
      setShowSaveSuccess(true);
      setIsDirty(false);
      setAutoSaveStatus('saved');
      
      setTimeout(() => {
        setShowSaveSuccess(false);
        setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 3000);

      // Check online status before doing cloud and Gemini tasks
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await saveToCloudWithConflictCheck(updatedWeekPayload, cleanRoutes, true);
      } else {
        if (!pendingSyncWeeks.includes(selectedWeek)) {
          setPendingSyncWeeks(prev => [...prev, selectedWeek]);
        }
      }

    } catch (error) {
      setIsSaving(false);
      console.error("Caché save failed:", error);
      setAutoSaveStatus('error');
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    setShowAdminTab(false);
  };

  // Show system loading splash screen during initial synchronization of security policies and operators
  if (!isConfigLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-900/10 via-[#2E86C1]/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute -left-48 bottom-12 w-96 h-96 bg-indigo-900/10 blur-3xl rounded-full" />
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-[#2E86C1] to-indigo-500 rounded-2xl shadow-xl shadow-blue-500/10 mb-4 ring-4 ring-slate-900 animate-pulse">
              <KeyRound className="w-8 h-8 text-white animate-spin [animation-duration:3s]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase sm:text-4xl">
              FV MEGAMAYORISTA
            </h1>
            <p className="text-xs font-black text-[#2E86C1] uppercase tracking-[0.25em] mt-1 pr-1">
              Sincronizando Sistema de Acceso...
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/60 relative">
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="w-10 h-10 border-4 border-t-[#2E86C1] border-slate-800 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">
                Verificando políticas de seguridad y credenciales activas...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there is no logged in user, force the login screener view
  if (!activeUser) {
    return <AuthScreen onLoginSuccess={setActiveUser} registeredUsers={appConfig.users} />;
  }

  const isAdmin = activeUser.role === 'admin';

  return (
    <div className={`min-h-screen pb-12 bg-[#f8fafc] flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999] overflow-auto' : ''}`}>
      
      {/* Dynamic TopBar Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-full w-full mx-auto px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row justify-between items-center h-auto lg:h-14 py-2 lg:py-0 gap-2">
            
            {/* Logo, System Status, and Security Badge */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
              <div className="flex items-center gap-2">
                <div className="bg-[#2E86C1] p-1.5 rounded-md shadow-sm">
                  <BarChart3 className="text-white w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none uppercase">FV MEGAMAYORISTA</h1>

                    <button
                      onClick={() => setShowBackupCenter(true)}
                      title="Centro de Sincronización y Respaldo de Almacenamiento"
                      className="cursor-pointer transition-transform active:scale-95 text-left flex shrink-0"
                    >
                      {isOnline ? (
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full shadow-sm hover:bg-emerald-100 transition-colors">
                          <Wifi className="w-2 h-2 text-emerald-500 animate-pulse" />
                          <span>ONLINE {pendingSyncWeeks.length > 0 ? `• Sinc. Pendiente (${pendingSyncWeeks.length})` : ''}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase text-amber-500 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shadow-sm animate-pulse hover:bg-amber-100 transition-colors">
                          <WifiOff className="w-2 h-2 text-amber-500" />
                          <span>TRABAJO LOCAL ({pendingSyncWeeks.length} PENDIENTES)</span>
                        </div>
                      )}
                    </button>
                    
                    {/* Auto-save indicators */}
                    <div className="flex items-center justify-center transition-all duration-300 shrink-0">
                      {autoSaveStatus === 'pending' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/50 animate-pulse bg-white">
                          <span className="flex h-1 w-1 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1 w-1 bg-amber-500"></span>
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-wider">Guardado Auto</span>
                        </div>
                      )}
                      {autoSaveStatus === 'saving' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/50 bg-white">
                          <div className="w-2 h-2 border-[1.5px] border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          <span className="text-[8px] font-black uppercase tracking-wider animate-pulse">Sincronizando...</span>
                        </div>
                      )}
                      {autoSaveStatus === 'saved' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 bg-white">
                          <Check className="w-2.5 h-2.5" />
                          <span className="text-[8px] font-black uppercase tracking-wider">Al día</span>
                        </div>
                      )}
                      {autoSaveStatus === 'error' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 bg-white">
                          <span className="text-[8px] font-black uppercase tracking-wider animate-bounce">⚠️ Error</span>
                        </div>
                      )}
                      {autoSaveStatus === 'idle' && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100 bg-white">
                          <Check className="w-2.5 h-2.5 opacity-60" />
                          <span className="text-[8px] font-black uppercase tracking-wider">Al día</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    
                    {/* User Identity Info */}
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 text-[8px] font-black uppercase text-slate-800">
                      {isAdmin ? (
                        <Shield className="w-2.5 h-2.5 text-[#2E86C1]" />
                      ) : (
                        <UserCheck className="w-2.5 h-2.5 text-indigo-500" />
                      )}
                      <span>{activeUser.name}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-[7px] text-[#2E86C1]">{activeUser.role === 'admin' ? 'Admin' : 'Operador'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action buttons, including filters and admin togglers */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
              
              {/* Salesperson Filter */}
              <div className="relative group w-auto">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Users className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#2E86C1] transition-colors" />
                </div>
                <select
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  className="block w-40 pl-8 pr-7 py-1.5 text-[10px] font-bold uppercase tracking-wide border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent appearance-none cursor-pointer hover:bg-white hover:border-[#2E86C1]/30 transition-all shadow-sm"
                >
                  <option value="all">TODOS LOS VENDEDORES</option>
                  {uniqueSellers.map(seller => (
                    <option key={seller} value={seller}>
                      {seller}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Week Calendar selector */}
              <div className="relative group w-auto">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#2E86C1] transition-colors" />
                </div>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="block w-48 pl-8 pr-7 py-1.5 text-[10px] font-bold uppercase tracking-wide border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent appearance-none cursor-pointer hover:bg-white hover:border-[#2E86C1]/30 transition-all shadow-sm"
                >
                  {WEEKS.map(week => (
                    <option key={week.id} value={week.id}>
                      {week.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Export to Excel-compatible CSV */}
              <button
                onClick={downloadCSV}
                title="Descargar reporte"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 font-bold text-[10px] uppercase hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm group whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none" />
                <span>Exportar</span>
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Salir de pantalla completa" : "Ampliar pantalla"}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 font-bold text-[10px] uppercase hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm group whitespace-nowrap shrink-0"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none" />
                ) : (
                  <Maximize className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none" />
                )}
                <span>{isFullscreen ? "Reducir" : "Ampliar"}</span>
              </button>

              {/* Admin Panel Toggle Tab Button */}
              {isAdmin && (
                <button
                  onClick={() => setShowAdminTab(!showAdminTab)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-lg font-black text-[10px] uppercase tracking-wider transition-all shadow-sm shrink-0 ${
                    showAdminTab 
                      ? 'bg-purple-600 text-white border-purple-500 shadow-purple-200 hover:bg-purple-700' 
                      : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Control de Admin</span>
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-250 rounded-lg bg-[#FAF0F0] text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-black text-[10px] uppercase tracking-wider transition-all shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>

              {/* Force cloud save button */}
              <button
                onClick={handleSave}
                disabled={isSaving || isValidating}
                className={`
                  relative overflow-hidden flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all duration-300 shrink-0 ml-1
                  ${showSaveSuccess 
                    ? 'bg-emerald-500 text-white shadow-emerald-200' 
                    : 'bg-[#2E86C1] text-white hover:bg-[#256fa1] hover:shadow-md'
                  }
                `}
              >
                {isSaving || isValidating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : showSaveSuccess ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {isValidating 
                    ? 'Validando...' 
                    : isSaving 
                      ? 'Sincronizando...' 
                      : showSaveSuccess 
                        ? 'Sincronizado' 
                        : 'Guardar'}
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* 12 Router Tab List Selection */}
        <div className="bg-slate-50/50 border-t border-slate-100 hidden">
          <div className="max-w-[1440px] mx-auto px-4">
            <nav className="flex items-center gap-2 py-2" aria-label="Tabs">
              <div className="flex items-center gap-2">
                <div className="p-2 text-slate-400">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout block */}
      <div className="max-w-full w-full mx-auto px-2 mt-4 flex flex-col lg:flex-row gap-4 items-start">
        
        {/* Left Sidebar Navigation */}
        <aside className="w-full lg:w-[135px] xl:w-[145px] shrink-0 flex flex-col gap-1 sticky top-[60px]">
          <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 mt-0.5">Rutas y Vendedores</h2>
          <div className="flex flex-col gap-1 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar pr-0.5 pb-12">
            {selectedSeller !== 'all' && (
              <button
                key="consolidated"
                onClick={() => setActiveRouteId('consolidated')}
                className={`
                  group flex flex-col items-start px-1.5 py-1 rounded-md transition-all duration-300 w-full text-left
                  ${activeRouteId === 'consolidated' 
                    ? 'bg-[#2E86C1] shadow-sm text-white border border-[#2E86C1]' 
                    : 'bg-white border text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                  }
                `}
              >
                <span className={`text-[8px] font-black uppercase tracking-tighter leading-tight ${activeRouteId === 'consolidated' ? 'text-white/80' : 'text-slate-400'}`}>
                  Vendedor: {selectedSeller}
                </span>
                <span className="text-[11px] sm:text-[12px] font-bold leading-tight mt-0.5">
                  VISTA CONSOLIDADA
                </span>
              </button>
            )}

            {sellerRoutesForCurrentWeek.map((route) => {
              const isActive = activeRouteId === route.id;
              const [seller, routeName] = route.name.includes(' - ') ? route.name.split(' - ') : [route.name, ''];
              
              return (
                <button
                  key={route.id}
                  onClick={() => setActiveRouteId(route.id)}
                  className={`
                    group flex flex-col items-start px-1.5 py-1 rounded-md transition-all duration-300 w-full text-left border
                    ${isActive 
                      ? 'bg-white shadow-sm border-slate-200 text-[#2E86C1]' 
                      : 'bg-transparent border-transparent text-slate-500 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                    }
                  `}
                >
                  <span className={`text-[8px] font-black uppercase tracking-tighter leading-tight ${isActive ? 'text-[#2E86C1]/70' : 'text-slate-400'}`}>
                    {seller}
                  </span>
                  <span className={`text-[11px] sm:text-[12px] font-bold leading-tight mt-0.5 ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {routeName || 'Principal'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 w-full min-w-0 flex flex-col gap-4">
        
        {/* Render Conditional Admin CRUD Panel if Toggled On */}
        {isAdmin && showAdminTab && (
          <AdminPanel 
            appConfig={appConfig} 
            onUpdateConfig={updateAndSyncAppConfig} 
            onRefreshAllData={handleSave} 
            auditLogs={auditLogs}
            addAuditLog={addAuditLog}
          />
        )}

        {/* Dashboard Frame View */}
        <DashboardView 
          route={activeRoute} 
          previousRoute={previousRoute}
          onUpdate={handleUpdateData} 
          selectedWeek={selectedWeek}
          historicalData={historicalData}
          isConsolidated={selectedSeller !== 'all' && activeRouteId === 'consolidated'}
          role={activeUser.role}
          kpis={appConfig.kpis}
          customCharts={appConfig.customCharts}
        />
        </main>
      </div>

      {/* Footer Branding Area */}
      <footer className="mt-20 border-t border-slate-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">FV MEGAMAYORISTA - Inteligencia Comercial</p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span>Rutas Activas: {appConfig.routesTemplate.length}</span>
            <span className="text-slate-300">|</span>
            <span>Auditoría Semanal 2026</span>
          </div>
        </div>
      </footer>

      {/* Gemini Validation Warnings Modal */}
      {showValidationModal && validationResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="validation-modal">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-5 flex items-center gap-4">
              <div className="bg-amber-500 rounded-full p-2.5 shadow-md shadow-amber-200 animate-pulse text-white flex-shrink-0">
                <FileWarning className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Advertencias de Coherencia Comercial</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] bg-amber-100 text-amber-700 font-black uppercase px-1.5 py-0.5 rounded">Asistente Gemini AI</span>
                  <span className="text-[10px] text-slate-500 font-medium">Se detectaron discrepancias lógicas en los datos</span>
                </div>
              </div>
            </div>

            {/* Warnings Content List */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <p className="text-xs text-slate-500 font-medium">
                Gemini escaneó los números reportados para esta jornada quincenal y encontró inconsistencias comerciales o matemáticas. Te sugerimos revisar los siguientes puntos antes de persistir la información en la nube para mantener la integridad de los reportes:
              </p>

              <div className="flex flex-col gap-3">
                {validationResult.warnings.map((warning, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl border flex gap-3 transition-all duration-300 ${
                      warning.type === 'error' 
                        ? 'bg-rose-50/70 border-rose-100' 
                        : 'bg-amber-50/40 border-amber-100/70'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {warning.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-800 uppercase">
                          {warning.routeName}
                        </span>
                        <span className="text-[8px] tracking-widest font-extrabold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          Campo: {warning.field}
                        </span>
                        <span className={`text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          warning.type === 'error' 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {warning.type === 'error' ? 'Imposible' : 'Sugerencia'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-750 leading-relaxed font-semibold">
                        {warning.message}
                      </p>
                      <div className="flex items-start gap-1 text-[11px] text-[#2980B9] font-bold mt-1 bg-[#EBF5FB] px-2.5 py-1.5 rounded-lg border border-[#A9DFBF]/20">
                        <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#2980B9]" />
                        <span>Recomendación: {warning.recommendation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                FV MEGAMAYORISTA • Auditoría Activa
              </span>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowValidationModal(false)}
                  className="w-full sm:w-auto px-5 py-2 border border-slate-200 text-slate-600 bg-white rounded-lg text-xs font-extrabold uppercase hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm"
                >
                  Volver a Corregir
                </button>
                <button
                  type="button"
                  onClick={executeSave}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-100 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Guardar de Todos Modos</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Network Resilience & Sync Backup Center Modal Overlay */}
      {showBackupCenter && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" id="backup-center-modal">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-950 border-b border-slate-800/80 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                }`}>
                  <Database className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Respaldo e Integridad de Red</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestión de Copias de Seguridad</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBackupCenter(false)}
                className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all"
              >
                Cerrar
              </button>
            </div>

            {/* Content section */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              
              {/* Online/Offline Card Status */}
              <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                isOnline 
                  ? 'bg-emerald-950/20 border-emerald-900/40' 
                  : 'bg-amber-950/20 border-amber-900/40'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de Conectividad</span>
                  {isOnline ? (
                    <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
                      ● EN LÍNEA
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-400 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/20 shadow-sm animate-bounce">
                      ● MODO OFFLINE EXCLUSIVO
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  {isOnline 
                    ? "La conexión con los servidores de la nube FV de Firestore está activa. Los cambios y auditorías de datos lógicos se sincronizan de manera directa y transparente en tiempo real." 
                    : "No se detectó conexión de red. Se activó el sistema de tolerancia a fallos: cualquier modificación se resguarda instantáneamente en local y se subirá automáticamente a la nube al restablecerse la red."
                  }
                </p>
                
                {pendingSyncWeeks.length > 0 && (
                  <div className="mt-2 text-xs font-semibold text-amber-300 bg-amber-950/50 border border-amber-900/30 p-2.5 rounded-lg">
                    ⚠️ Hay {pendingSyncWeeks.length} jornadas editadas en modo local pendientes por consolidar en la nube:
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {pendingSyncWeeks.map(wk => {
                        const weekLabelName = WEEKS.find(w => w.id === wk)?.label || wk;
                        return (
                          <span key={wk} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-black animate-pulse">
                            {weekLabelName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* automatic recovery info */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest">Respaldo Automático en Operación</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium mt-1">
                    Cada vez que actualizas un dato, el sistema actualiza la memoria física local de tu dispositivo. Además, en cuanto tienes conexión a Internet, realizamos un <span className="text-emerald-400 font-extrabold">auto-backup</span> directo en la base de datos centralizada de Firestore.
                  </p>
                </div>
              </div>

              {/* Actions Accordion */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedimientos de Acción Manual</h4>
                
                {/* 1. Sincronizar Pendientes or Fuerza de Respaldo */}
                <button
                  onClick={isOnline ? backupAllToCloud : undefined}
                  disabled={!isOnline || isSaving}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 ${
                    isOnline 
                      ? 'bg-blue-600 hover:bg-blue-550 text-white shadow-blue-900/20' 
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Sincronizar y Respaldar en la Nube Ahora</span>
                </button>
                {!isOnline && (
                  <p className="text-[9px] text-amber-500 font-extrabold uppercase tracking-wide text-center mt-[-4px]">
                    ⚠️ Debes restablecer la red de internet antes de forzar respaldo al Cloud.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  {/* 2. Download Offline Backup File */}
                  <button
                    onClick={downloadSystemBackup}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Bajar Archivo JSON</span>
                  </button>

                  {/* 3. Upload/Restore Backup file */}
                  <label className="py-2.5 px-4 bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Restablecer Datos</span>
                    <input 
                      type="file"
                      accept=".json"
                      onChange={restoreSystemBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Status info details block */}
              <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <div className="flex justify-between">
                  <span>Modificados listados en cola:</span>
                  <span className="text-slate-300 font-mono font-black">{pendingSyncWeeks.length} semanas</span>
                </div>
                <div className="flex justify-between">
                  <span>Tamaño estimado de caché:</span>
                  <span className="text-slate-300 font-mono font-black">
                    {Math.round((localStorage.getItem('fv_dashboard_data')?.length || 0) / 1024)} KB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Memoria de seguridad:</span>
                  <span className="text-emerald-500 font-black">Activo y En Línea</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-950 border-t border-slate-800/60 px-6 py-4 text-center">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                S.I.G. FV MEGAMAYORISTA • Tolerancia a Fallas Activa
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Toast Alert System for Real-time Updates */}
      <AnimatePresence>
        {realtimeUpdateToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            id="realtime-update-toast"
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[130] max-w-sm bg-indigo-600 border border-indigo-500 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] shadow-indigo-600/30 p-4 flex flex-col gap-3"
          >
            <div className="flex items-start gap-3 text-white">
              <div className="p-2 bg-white/10 rounded-full shrink-0">
                <RefreshCw className="w-5 h-5 animate-pulse text-indigo-100" />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-sm font-bold uppercase tracking-wider mb-1">Actualización en vivo</h4>
                <p className="text-xs text-indigo-100 font-medium leading-relaxed">
                  {realtimeUpdateToast.message}
                </p>
              </div>
              <button 
                onClick={() => setRealtimeUpdateToast({ visible: false, message: '' })}
                className="shrink-0 p-1.5 hover:bg-white/10 rounded-full transition-colors text-indigo-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Alert System for Cloud Save Failure with manual retry action */}
      <AnimatePresence>
        {showSyncErrorToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            id="sync-error-toast"
            className="fixed bottom-6 right-6 z-[120] max-w-md w-full sm:w-96 bg-slate-900 border-2 border-rose-600/40 rounded-2xl shadow-2xl p-4 flex flex-col gap-3.5"
          >
            {/* Header / Message */}
            <div className="flex items-start gap-3">
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2 rounded-xl flex-shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">
                    Error de Sincronización
                  </h4>
                  <button
                    onClick={() => setShowSyncErrorToast(prev => ({ ...prev, visible: false }))}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Cerrar notificación"
                    id="close-sync-toast-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
                  {showSyncErrorToast.message} Tu información de rumbos sigue perfectamente resguardada de manera local.
                </p>
              </div>
            </div>

            {/* Manual Retry Button */}
            <div className="flex items-center gap-3.5 border-t border-slate-800/80 pt-3">
              <button
                onClick={() => handleRetrySync(showSyncErrorToast.weekId)}
                id="retry-sync-toast-btn"
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-950/20 active:scale-[0.98]"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                )}
                <span>Reintentar Sincronización</span>
              </button>
              <button
                onClick={() => setShowSyncErrorToast(prev => ({ ...prev, visible: false }))}
                id="dismiss-sync-toast-btn"
                className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border border-slate-850"
              >
                Aceptar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Conflict Validation Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={showConflictModal.onCancel}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-amber-500/10">
                <div className="flex items-center gap-3 text-amber-500">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-sm font-black uppercase tracking-wider">Conflicto de Guardado (Colisión de Datos)</h3>
                </div>
              </div>
              
              <div className="p-6 flex flex-col gap-4 text-slate-300 text-sm leading-relaxed">
                <p>
                  El sistema detectó que otro usuario con una sesión activa acaba de modificar y guardar los datos de esta misma semana (<strong className="text-white">{showConflictModal.weekId}</strong>) de forma casi simultánea. 
                </p>
                <p>
                  Si fuerzas el guardado ahora, <strong className="text-rose-400">sobreescribirás</strong> por completo los cambios recientes de la otra sesión con tu propia versión en pantalla.
                </p>
                <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl">
                  <span className="text-amber-400 font-bold block mb-1 uppercase text-[10px] tracking-widest">¿Qué deberías hacer?</span>
                  <ul className="list-disc pl-4 space-y-2 text-xs font-medium text-slate-400">
                    <li>Si presionas <strong>Forzar Sobrescritura</strong>: tu versión actual se volverá la versión oficial de todo el sistema en vivo. Un registro de auditoría en la plataforma quedará a tu nombre indicando que avalaste el remplazo directo de datos manuales.</li>
                    <li>Si presionas <strong>Cancelar y Revisar</strong>: no sobrescribiremos nada ahora mismo, para darte la opción de chequear los datos de forma externa.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={showConflictModal.onCancel}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar y Revisar
                </button>
                <button
                  onClick={showConflictModal.onConfirmOverwrite}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Forzar Sobrescritura
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;
