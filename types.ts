
export interface GoalStat {
  meta: number;
  real: number;
}

export interface RouteData {
  id: string;
  name: string;
  clients: GoalStat;
  boxes: GoalStat;
  collection: GoalStat;
  divisas: number; // Cash portion of collection
  totalClients: number;
  visitedClients: number;
  customKpis?: Record<string, GoalStat>;
}

export interface Analysis {
  diagnostic: string;
  painPoint: string;
  opportunity: string;
  cashInsight: string;
}
