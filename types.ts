
export enum View {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  DASHBOARD = 'DASHBOARD',
  REVIEWS = 'REVIEWS',
  PLAN = 'PLAN',
  ANALYTICS = 'ANALYTICS',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  SETTINGS = 'SETTINGS',
  FOCUS = 'FOCUS',
  ADD_THEME = 'ADD_THEME',
  THEME_DETAILS = 'THEME_DETAILS',
  ONBOARDING = 'ONBOARDING',
  PREMIUM = 'PREMIUM',
  MANAGE_SUBSCRIPTION = 'MANAGE_SUBSCRIPTION'
}

export type UserProfile = {
  id: string;
  email: string;
  plan: 'free' | 'monthly' | 'lifetime';
  subscription_status?: 'free' | 'trial' | 'active' | 'expired';
  is_premium?: boolean;
  premiumActive: boolean;
  expires_at: string | null;
};

// Existing interfaces
export interface Theme {
  id: string;
  name: string;
  specialty: string;
  area: string;
  accuracy: number;
  lastReview: string;
  nextReview: string;
  srsLevel: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil' | 'Falha';
  retentionRate: number;
  questionsTotal: number;
  questionsCorrect: number;
  imageUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'Novo Estudo' | 'Revisão';
  duration: string;
  points?: string;
  isCompleted: boolean;
  category?: string;
}

export interface UserPreferences {
  nome?: string;
  data_prova?: string;
  dias_disponiveis_semana?: number;
  especialidades?: string[];
  prioridades_por_especialidade?: Record<string, string>;
  onboarding_completed?: boolean;
  updated_at?: string;
}
