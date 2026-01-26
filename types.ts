
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
  PREMIUM = 'PREMIUM'
}

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
