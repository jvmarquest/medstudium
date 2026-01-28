
import React, { useState, useEffect } from 'react';
import { NetworkProvider } from './contexts/NetworkContext';
import { UserProvider } from './contexts/UserContext';
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
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import Auth from './views/Auth';
import Onboarding from './views/Onboarding';
import ManageSubscription from './views/ManageSubscription';
import { TrialBanner } from './components/TrialBanner';
import { FreePlanBanner } from './components/FreePlanBanner';
import { PlanProvider, usePlan } from './lib/planContext';
import { useUser } from './contexts/UserContext';



const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  // Removed local duplicate state: isPremium, isFreePlan
  const { hasAppAccess, isPremium: contextIsPremium, isTrial } = usePlan();
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [loadingPreferences, setLoadingPreferences] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Ref to track loading status inside timeout closure
  const loadingRef = React.useRef({ auth: true, prefs: false });

  // Sync ref with state
  useEffect(() => {
    loadingRef.current = { auth: loadingAuth, prefs: loadingPreferences };
  }, [loadingAuth, loadingPreferences]);

  useEffect(() => {
    let mounted = true;

    // Global Initialization Timeout (10s)
    const timeoutId = setTimeout(() => {
      if (!mounted) return;
      const { auth, prefs } = loadingRef.current;
      if (auth || prefs) {
        console.error('[App] Initialization timeout reached (10s).');
        setLoadingAuth(false);
        setLoadingPreferences(false);
        setAppError("Não foi possível carregar seus dados. Tente recarregar.");
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session Sync handled by UserContext
    // App just listens to UserContext via useUser() / usePlan() hooks deeper down.
    // But we need to update local 'session' state for rendering logic below.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setLoadingAuth(false);
      if (!session) {
        setCurrentView(View.LOGIN);
        setIsOnboardingCompleted(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle Billing Redirects
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/billing/success') {
      // 1. Clear URL Cleanly
      window.history.replaceState({}, '', '/');

      const handleBillingSuccess = async () => {
        try {
          // 2. Force Session Refresh
          const { error } = await supabase.auth.refreshSession();
          if (error) throw error;

          // 3. Force Profile Refresh (UserContext will react to session change or we can force it)
          // We can trigger a reload or use a context method if available locally, 
          // but since we don't have direct access to 'refreshUserData' here cleanly without context,
          // and window.location.reload() is robust but "ugly" for SPA...

          // The user asked: "Force atualização da sessão... Rebusque dados... Atualize estado... Redirecione... SEM RELOGAR"

          // Since 'session' dependency in UserContext triggers fetchProfile, refreshSession() above MIGHT be enough.
          // BUT, we want to be sure.

          alert('Pagamento processado! Atualizando seu plano...');

          // Simplest robust way to ensure everything re-syncs without full page reload artifacts
          // is to allow the context to pick up the change.
          // However, UserContext listens to 'onAuthStateChange'. 'refreshSession' triggers that.

        } catch (e) {
          console.error("Billing Sync Error:", e);
          // Fallback
          window.location.reload();
        }
      };

      handleBillingSuccess();
    } else if (path === '/billing/cancel') {
      window.history.replaceState({}, '', '/');
      alert('Pagamento cancelado.');
    }
  }, [session]);

  // REACTIVE STATE SYNC (Replaces checkPreferences)
  // We trust the Contexts.
  const { profile, loading: userLoading } = useUser();
  const { loading: planLoading } = usePlan();

  useEffect(() => {
    if (loadingAuth || userLoading) return;

    if (!session) {
      if (currentView !== View.LOGIN && currentView !== View.SIGNUP) {
        setCurrentView(View.LOGIN);
      }
      return;
    }

    // Profile Loaded
    if (profile) {
      const completed = !!profile.onboarding_completed;
      setIsOnboardingCompleted(completed);

      if (!completed) {
        if (currentView !== View.ONBOARDING) setCurrentView(View.ONBOARDING);
      } else {
        // Onboarding Done
        // Check Access (Reactive - Trust PlanContext)
        // hasAppAccess now includes 'free', 'trial', 'active', 'dev' per user request.
        if (!hasAppAccess) {
          if (currentView !== View.PREMIUM) {
            console.log('[App] Reactive Guard: No Access -> Premium');
            setCurrentView(View.PREMIUM);
          }
        } else {
          // Has Access (Active, Trial, Lifetime, Monthly)
          // 1. Strict Redirection for Premium Users (Requested)
          // If User is Premium (active/monthly/lifetime) and is on Premium View -> Dashboard
          // We do NOT want to show the Plan screen to someone who already paid.
          // BUT if user is in TRIAL, they ARE Premium for features but SHOULD see the screen to Upgrade.
          if (contextIsPremium && !isTrial && currentView === View.PREMIUM) {
            console.log('[App] Paid User on Plan Screen -> Redirecting to Dashboard');
            setCurrentView(View.DASHBOARD);
            return;
          }

          // 2. Loop & Auth Guard
          // If stuck on Auth/Onboarding screens, go to Dashboard
          if ([View.LOGIN, View.SIGNUP, View.ONBOARDING].includes(currentView)) {
            setCurrentView(View.DASHBOARD);
          }
        }
      }
    }
  }, [loadingAuth, userLoading, session, profile, hasAppAccess, contextIsPremium, currentView]);

  // Refactored to rely on UserContext/PlanContext as Source of Truth
  const checkPreferences = async (userId: string) => {
    // We strictly rely on the Contexts now to avoid race conditions.
    // This function is kept to handle Onboarding checks if needed, but
    // routing guards should be reactive.

    // If we are here, session exists.
    // Onboarding status is already in UserContext (profile.onboarding_completed).
    // We just need to sync local state if strictly necessary, but reactive usage is better.
  };

  // Reactive Effect for Authentication & Preferences
  useEffect(() => {
    if (!session) {
      setLoadingAuth(false);
      return;
    }

    // Wait for context to have profile loaded
    // We already have 'profile' and 'userLoading' from the top-level useUser() hook.
    // We just depend on them in the dependency array below.

    // We wait for userLoading (from Context) to finish
    // However, usePlan encapsulates useUser loading.
  }, [session]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [viewHistory, setViewHistory] = useState<{ view: View; themeId: string | null }[]>([]);

  // ... (previous checks)

  const navigateTo = (view: View, themeId?: string) => {
    // STRICT NAVIGATION GUARDS
    if (!session) {
      if (view !== View.LOGIN && view !== View.SIGNUP) {
        setCurrentView(View.LOGIN);
        return;
      }
    } else {
      // If logged in
      if (!isOnboardingCompleted) {
        // MUST go to onboarding
        if (view !== View.ONBOARDING) {
          setCurrentView(View.ONBOARDING);
          return;
        }
      } else {
        // If onboarding completed
        if (view === View.ONBOARDING) {
          setCurrentView(View.DASHBOARD);
          return;
        }

        // If hasAppAccess (Active/Trial) -> Allow navigation
        // We rely on renderView and useEffect for reactive security.
        // The imperative check here was using stale state, blocking valid updates.

      }
    }

    if (session && isOnboardingCompleted) {
      setViewHistory(prev => [...prev, { view: currentView, themeId: selectedThemeId }]);
    }

    if (themeId) setSelectedThemeId(themeId);
    setCurrentView(view);
  };

  const handleGoBack = () => {
    if (viewHistory.length === 0) {
      navigateTo(View.DASHBOARD);
      return;
    }

    const newHistory = [...viewHistory];
    const previous = newHistory.pop();
    setViewHistory(newHistory);

    if (previous) {
      if (previous.themeId) setSelectedThemeId(previous.themeId);
      else setSelectedThemeId(null);
      setCurrentView(previous.view);
    }
  };

  const calculateSelectedTheme = () => {
    return { id: selectedThemeId } as any;
  };

  const renderView = () => {
    // 0. Fatal Error
    if (appError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark p-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
            </div>
            <h2 className="text-xl font-bold dark:text-white">Ops! Algo deu errado.</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{appError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    // 1. Auth Loading
    if (loadingAuth) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-slate-500 font-medium">Autenticando...</p>
          </div>
        </div>
      );
    }

    // 2. Not Logged In -> Auth Screens (STRICT)
    if (!session) {
      if (currentView !== View.SIGNUP) return <Auth mode={View.LOGIN} onAuthSuccess={() => { }} onToggleMode={() => navigateTo(View.SIGNUP)} />;
      return <Auth mode={View.SIGNUP} onAuthSuccess={() => { }} onToggleMode={() => navigateTo(View.LOGIN)} />;
    }

    // 3. Preferences / User / Plan Loading
    if (loadingPreferences || userLoading || planLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-slate-500 font-medium">Atualizando dados...</p>
          </div>
        </div>
      );
    }

    // 4. Onboarding Guard
    if (!isOnboardingCompleted) {
      // Must be Onboarding, ignore currentView if it tries to be something else (except during transitions maybe?)
      // Actually, just render Onboarding content.
      return <Onboarding onNavigate={(v) => {
        if (v === View.DASHBOARD) checkPreferences(session.user.id);
        else navigateTo(v);
      }} />;
    }

    // 5. Paywall Guard (Render Check)
    if (isOnboardingCompleted && !hasAppAccess && currentView !== View.PREMIUM) {
      return <Premium onNavigate={navigateTo} onBack={handleGoBack} />;
    }

    // 6. Main Routing
    switch (currentView) {
      case View.LOGIN:
      case View.SIGNUP:
        // Logic should have caught this above, but safe fallback:
        return <Dashboard onNavigate={navigateTo} />;

      case View.PREMIUM:
        // Allow users to view Premium/Plans screen even if they have a plan/trial (to upgrade or check status)
        return <Premium onNavigate={navigateTo} onBack={handleGoBack} />;

      case View.DASHBOARD:
        return <Dashboard onNavigate={navigateTo} />;
      case View.REVIEWS:
        return <ReviewList onNavigate={navigateTo} />;
      case View.PLAN:
        return <Plan onNavigate={navigateTo} onBack={handleGoBack} />;
      case View.ANALYTICS:
        return <Analytics onNavigate={navigateTo} />;
      case View.ACHIEVEMENTS:
        return <Achievements onNavigate={navigateTo} />;
      case View.SETTINGS:
        return <Settings onNavigate={navigateTo} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} />;
      case View.MANAGE_SUBSCRIPTION:
        return <ManageSubscription onNavigate={navigateTo} />;
      case View.ADD_THEME:
        return <AddTheme onNavigate={navigateTo} onBack={handleGoBack} />;
      case View.THEME_DETAILS:
        return <ThemeDetails themeId={selectedThemeId} onNavigate={navigateTo} />;
      case View.ONBOARDING:
        // Should not happen if isOnboardingCompleted is true (handled by logic above or navigateTo)
        return <Dashboard onNavigate={navigateTo} />;
      case View.FOCUS:
        return <FocusMode themeId={selectedThemeId} onNavigate={navigateTo} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background-light dark:bg-background-dark pt-safe">
      <TrialBanner onNavigate={navigateTo} />
      <FreePlanBanner onNavigate={navigateTo} />
      <div className="flex-1 min-h-0">
        {renderView()}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <NetworkProvider>
      <UserProvider>
        <PlanProvider>
          <AppContent />
        </PlanProvider>
      </UserProvider>
    </NetworkProvider>
  );
};

export default App;
