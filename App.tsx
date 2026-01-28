
import React, { useState, useEffect } from 'react';
import { NetworkProvider } from './contexts/NetworkContext';
import { UserProvider, useUser } from './contexts/UserContext';
import DebugOverlay from './components/DebugOverlay';
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
import { TrialBanner } from './components/TrialBanner';
import { FreePlanBanner } from './components/FreePlanBanner';
import { supabase } from './supabase';
import { PlanProvider, usePlan } from './lib/planContext';



const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  // Removed local duplicate state: isPremium, isFreePlan
  const { profile, loading: userLoading, refreshUserData } = useUser();
  const { hasAppAccess, isPremium: contextIsPremium, isTrial, loading: planLoading } = usePlan();
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

          // Poll for Status Update (Webhooks take 2-5s)
          let attempts = 0;
          let confirmed = false;

          while (attempts < 5) { // Try for ~10 seconds
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) break;

            // Check DB directly
            const { data: check } = await supabase
              .from('profiles')
              .select('plan')
              .eq('id', user.id)
              .maybeSingle();

            console.log(`[Billing] Poll attempt ${attempts + 1}:`, check?.plan);

            if (check && ['monthly', 'lifetime'].includes(check.plan)) {
              confirmed = true;
              break;
            }

            // Wait 2s
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
          }
          // Clear URL
          window.history.replaceState({}, '', '/');

          const syncSubscription = async () => {
            let attempts = 0;
            const maxAttempts = 10;

            // Loop to wait for webhook
            while (attempts < maxAttempts) {
              console.log(`[Billing] Sync attempt ${attempts + 1}/${maxAttempts}`);

              await supabase.auth.refreshSession();
              await refreshUserData(); // This triggers fetchProfile -> updates isPremium

              // Check context state (we need to access likely updated state, 
              // but since state updates are async, we might need to rely on the fetch result directly or just wait)
              // For simplicity, we wait a bit and rely on the next iteration or the fact that isPremium updates.

              // Actually, we can check the DB directly here for immediate feedback loop
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('plan, is_premium, subscription_status')
                  .eq('id', user.id)
                  .single();

                // Check using utility to be consistent
                if (profile && (profile.plan === 'monthly' || profile.plan === 'lifetime' || profile.is_premium)) {
                  alert('Pagamento confirmado e plano atualizado!');
                  // Force reload to ensure all contexts are clean
                  window.location.href = '/';
                  return;
                }
              }

              attempts++;
              await new Promise(r => setTimeout(r, 2000)); // Wait 2s
            }

            alert('Pagamento processado. Se o plano não atualizar imediatamente, aguarde alguns instantes.');
            window.location.href = '/';
          };

          // Show temporary feedback (can be improved with a toast/modal, using alert for now as requested/consistent)
          // We run async
          syncSubscription();

        } catch (error) {
          console.error("[Billing] Error during success handling:", error);
          alert("Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente ou entre em contato com o suporte.");
          window.history.replaceState({}, '', '/');
        }
      };
      handleBillingSuccess(); // Call the async function
    } else if (path === '/billing/cancel') {
      window.history.replaceState({}, '', '/');
      alert('Pagamento cancelado.');
    }
  }, []); // Removed refreshUserData from dependencies as it's not defined in this scope and causes issues.

  // REACTIVE STATE SYNC (Replaces checkPreferences)
  // We trust the Contexts.

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
          <DebugOverlay />
        </PlanProvider>
      </UserProvider>
    </NetworkProvider>
  );
};

export default App;
