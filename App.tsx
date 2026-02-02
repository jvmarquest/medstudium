
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { NetworkProvider } from './contexts/NetworkContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { View, Theme } from './types';
import Premium from './views/Premium';
import Dashboard from './views/Dashboard';
import ReviewList from './views/ReviewList';
import Plan from './views/Plan';
import Analytics from './views/Analytics';
import Achievements from './views/Achievements';
import Settings from './views/Settings';
import FocusMode from './views/FocusMode';
import AddTheme from './views/AddTheme';
import ThemeDetails from './views/ThemeDetails';
import { Session } from '@supabase/supabase-js';
import Auth from './views/Auth';
import Onboarding from './views/Onboarding';
import ManageSubscription from './views/ManageSubscription';
import LandingPage from './views/LandingPage';
import { FreePlanBanner } from './components/FreePlanBanner';
import { LifetimeSuccessModal } from './components/LifetimeSuccessModal';
import { HistoryModal } from './components/HistoryModal';
import { supabase } from './supabase';
import { PlanProvider, usePlan } from './lib/planContext';


// --- WRAPPERS FOR PARAMS ---
const ThemeDetailsWrapper: React.FC<{ onNavigate: any, onHistory: any }> = (props) => {
  const { id } = useParams();
  if (!id) return <Navigate to="/plano" />;
  return <ThemeDetails themeId={id} {...props} />;
};

const FocusModeWrapper: React.FC<{ onNavigate: any }> = (props) => {
  const { id } = useParams();
  // Optional themeId for FocusMode? If required, handle redirect.
  return <FocusMode themeId={id || null} {...props} />;
};

// --- AUTH GUARD ---
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useUser();
  const location = useLocation();

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!session) {
    return <Navigate to="/entrar" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDarkMode, setIsDarkMode] = useState(true);
  // Removed local session state, rely on UserContext except for initialization if needed.
  // Actually, keeping minimal sync state for effects is okay, but context is better.
  const { profile, loading: userLoading, refreshUserData, session } = useUser();
  const { hasAppAccess, isPremium: contextIsPremium, isTrial, loading: planLoading } = usePlan();

  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [loadingPreferences, setLoadingPreferences] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);
  const [successPlanType, setSuccessPlanType] = useState<'monthly' | 'lifetime' | 'free'>('lifetime');
  const [showHistory, setShowHistory] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Global Init Timeout
    const timeout = setTimeout(() => {
      if (loadingAuth || loadingPreferences) {
        setLoadingAuth(false);
        setLoadingPreferences(false);
        // Only show error if strictly stuck
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loadingAuth, loadingPreferences]);

  useEffect(() => {
    // Session Init
    supabase.auth.getSession().then(() => setLoadingAuth(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => setLoadingAuth(false));
    return () => subscription.unsubscribe();
  }, []);

  // --- DARK MODE ---
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- BILLING REDIRECTS ---
  useEffect(() => {
    const path = window.location.pathname;
    // ... (Keep existing billing logic, but assume 'path' read is fine)
    // Same implementation as before, simplified for this context:
    if (path === '/billing/success') {
      navigate('/', { replace: true });
      // ... (async polling logic - keep as is or assume it runs)
      const handleBillingSuccess = async () => {
        // ... (Same polling logic as original file)
        try {
          await supabase.auth.refreshSession();
          let attempts = 0;
          while (attempts < 5) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) break;
            const { data: check } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
            if (check && ['monthly', 'lifetime'].includes(check.plan)) break;
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
          }

          // Sync subscription loop
          let syncAttempts = 0;
          while (syncAttempts < 10) {
            await supabase.auth.refreshSession();
            await refreshUserData();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: p } = await supabase.from('profiles').select('plan, is_premium').eq('id', user.id).single();
              if (p && (p.plan === 'monthly' || p.plan === 'lifetime' || p.is_premium)) {
                setSuccessPlanType((p.plan as any) || 'monthly');
                setShowLifetimeModal(true);
                return;
              }
            }
            syncAttempts++;
            await new Promise(r => setTimeout(r, 2000));
          }
          alert('Pagamento processado. Aguarde a atualização.');
          navigate('/');
        } catch (e) {
          console.error(e);
          alert('Erro ao processar pagamento.');
          navigate('/');
        }
      };
      handleBillingSuccess();
    } else if (path === '/billing/cancel') {
      navigate('/', { replace: true });
      alert('Pagamento cancelado.');
    }
  }, [navigate, refreshUserData]);

  // --- NAVIGATION ADAPTER ---
  // --- NAVIGATION ADAPTER ---
  const navigateTo = (view: View, themeId?: string) => {
    switch (view) {
      case View.LOGIN: navigate('/entrar'); break;
      case View.SIGNUP: navigate('/cadastro'); break;
      case View.DASHBOARD: navigate('/inicio'); break;
      case View.REVIEWS: navigate('/revisoes'); break;
      case View.PLAN: navigate('/plano'); break;
      case View.ANALYTICS: navigate('/desempenho'); break;
      case View.ACHIEVEMENTS: navigate('/conquistas'); break;
      case View.SETTINGS: navigate('/configuracoes'); break;
      case View.MANAGE_SUBSCRIPTION: navigate('/assinatura'); break;
      case View.ADD_THEME: navigate('/novo-tema'); break;
      case View.THEME_DETAILS: themeId ? navigate(`/tema/${themeId}`) : navigate('/plano'); break;
      case View.ONBOARDING: navigate('/boas-vindas'); break;
      case View.PREMIUM: navigate('/premium'); break;
      case View.LANDING: navigate('/'); break;
      case View.FOCUS: themeId ? navigate(`/foco/${themeId}`) : navigate('/foco'); break; // Handle optional ID
      default: navigate('/inicio');
    }
  };

  const handleGoBack = () => navigate(-1);

  // --- RENDER CONTENT ---

  if (loadingAuth || userLoading || planLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-slate-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background-light dark:bg-background-dark pt-safe">
      <FreePlanBanner onNavigate={navigateTo} />
      <LifetimeSuccessModal
        isOpen={showLifetimeModal}
        planType={successPlanType}
        onClose={() => {
          setShowLifetimeModal(false);
          navigate('/');
        }}
      />

      <div className="flex-1 min-h-0">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={!session ? <LandingPage onNavigate={navigateTo} /> : <Navigate to="/inicio" />} />
          <Route path="/entrar" element={!session ? <Auth mode={View.LOGIN} onAuthSuccess={() => navigate('/inicio')} onToggleMode={() => navigate('/cadastro')} onBack={() => navigate('/')} /> : <Navigate to="/inicio" />} />
          <Route path="/cadastro" element={!session ? <Auth mode={View.SIGNUP} onAuthSuccess={() => navigate('/inicio')} onToggleMode={() => navigate('/entrar')} onBack={() => navigate('/')} /> : <Navigate to="/inicio" />} />

          {/* Protected Routes */}
          <Route path="/inicio" element={<RequireAuth><Dashboard onNavigate={navigateTo} onHistory={() => setShowHistory(true)} /></RequireAuth>} />
          <Route path="/revisoes" element={<RequireAuth><ReviewList onNavigate={navigateTo} onHistory={() => setShowHistory(true)} /></RequireAuth>} />
          <Route path="/plano" element={<RequireAuth><Plan onNavigate={navigateTo} onBack={handleGoBack} onHistory={() => setShowHistory(true)} /></RequireAuth>} />
          <Route path="/desempenho" element={<RequireAuth><Analytics onNavigate={navigateTo} onHistory={() => setShowHistory(true)} /></RequireAuth>} />
          <Route path="/conquistas" element={<RequireAuth><Achievements onNavigate={navigateTo} onHistory={() => setShowHistory(true)} /></RequireAuth>} />
          <Route path="/configuracoes" element={<RequireAuth><Settings onNavigate={navigateTo} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} onHistory={() => setShowHistory(true)} /></RequireAuth>} />
          <Route path="/assinatura" element={<RequireAuth><ManageSubscription onNavigate={navigateTo} /></RequireAuth>} />
          <Route path="/novo-tema" element={<RequireAuth><AddTheme onNavigate={navigateTo} onBack={handleGoBack} onHistory={() => setShowHistory(true)} /></RequireAuth>} />
          <Route path="/tema/:id" element={<RequireAuth><ThemeDetailsWrapper onNavigate={navigateTo} onHistory={() => setShowHistory(true)} /></RequireAuth>} />

          {/* Onboarding & Premium Guards */}
          <Route path="/boas-vindas" element={
            <RequireAuth>
              {/* Note: In real logic, redirect if already completed? Use logic from previous App.tsx if desired */}
              <Onboarding onNavigate={(v) => navigateTo(v)} />
            </RequireAuth>
          } />

          <Route path="/premium" element={<RequireAuth><Premium onNavigate={navigateTo} onBack={handleGoBack} /></RequireAuth>} />

          {/* Focus Mode (Optional ID) */}
          <Route path="/foco/:id" element={<RequireAuth><FocusModeWrapper onNavigate={navigateTo} /></RequireAuth>} />
          {/* Fallback for focus without ID if needed */}
          <Route path="/foco" element={<RequireAuth><FocusModeWrapper onNavigate={navigateTo} /></RequireAuth>} />

          {/* Catch All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <NetworkProvider>
      <UserProvider>
        <PlanProvider>
          {/* Note: BrowserRouter is in index.tsx now */}
          <AppContent />
        </PlanProvider>
      </UserProvider>
    </NetworkProvider>
  );
};

export default App;
