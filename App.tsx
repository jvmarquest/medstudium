
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
import { TrialBanner } from './components/TrialBanner';



const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isFreePlan, setIsFreePlan] = useState<boolean>(false);
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

    // 1. Initial Auth Check
    console.log('[init] auth loading');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setLoadingAuth(false);

      if (session) {
        console.log('[init] auth success');
        checkPreferences(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setLoadingAuth(false);

      if (!session) {
        setCurrentView(View.LOGIN);
        setIsOnboardingCompleted(false);
        setLoadingPreferences(false);
      } else {
        // Trigger preference check if not already loading or done
        checkPreferences(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkPreferences = async (userId: string) => {
    console.log('[init] fetching profiles');
    setLoadingPreferences(true);
    try {
      // Step 4: Fetch from profiles (Source of Truth)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, trial_expires_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[App] Error checking profile:', error);
        setIsOnboardingCompleted(false);
        setCurrentView(View.ONBOARDING);
        return;
      }

      if (!profile) {
        console.log('[App] Profile not found. Redirecting to Onboarding.');
        setIsOnboardingCompleted(false);
        setCurrentView(View.ONBOARDING);
        return;
      }

      console.log('[init] profile found:', profile);

      const completed = !!profile.onboarding_completed;
      console.log("Onboarding salvo:", completed); // Step 6 Log

      setIsOnboardingCompleted(completed);

      if (completed) {
        // --- PAYWALL CHECK ---
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, plan, expires_at')
          .eq('user_id', userId)
          .maybeSingle();

        // Used fetched profile for trial logic directly


        const now = new Date();
        const trialActive = profile?.trial_expires_at && new Date(profile.trial_expires_at) > now;

        const isFree = sub?.plan === 'free';

        const validSub = sub && ['active', 'lifetime'].includes(sub.status);
        const subActive = validSub && (sub.status === 'lifetime' || (sub.expires_at && new Date(sub.expires_at) > now));

        const premiumActive = trialActive || !!subActive;

        setIsPremium(premiumActive);

        if (!premiumActive && !isFree) {
          console.log('[init] User is NOT premium and NOT free tier. Redirecting to Paywall.');
          setCurrentView(View.PREMIUM);
          return;
        }

        if (currentView === View.LOGIN || currentView === View.SIGNUP || currentView === View.ONBOARDING || currentView === View.PREMIUM) {
          console.log('[init] routing to home');
          setCurrentView(View.DASHBOARD);
        }
      } else {
        console.log('[init] routing to onboarding');
        setCurrentView(View.ONBOARDING);
      }
    } catch (error) {
      console.error('[App] Unexpected error checking preferences:', error);
      setCurrentView(View.ONBOARDING);
      setIsOnboardingCompleted(false);
    } finally {
      setLoadingPreferences(false);
    }
  };

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
    if (!session) {
      if (view !== View.LOGIN && view !== View.SIGNUP) return;
    } else {
      // 1. Onboarding Guard
      if (!isOnboardingCompleted && view !== View.ONBOARDING) {
        setCurrentView(View.ONBOARDING);
        return;
      }
      // 2. Premium Guard (Strict)
      if (isOnboardingCompleted && !isPremium && !isFreePlan && view !== View.PREMIUM && view !== View.ONBOARDING) {
        setCurrentView(View.PREMIUM);
        return;
      }
    }

    // Add to history if valid transition (prevent duplicates if needed, but linear history is fine)
    // Only add to history if we are in a main app view (not Login/Signup/Onboarding transitions usually)
    // For simplicity, we track everything after login.
    if (session && isOnboardingCompleted && isPremium) {
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
    // Basic fallback if needed, but ThemeDetails handles its own data now ideally.
    // For now we pass just ID or let it fetch.
    // But existing code expects a theme object.
    // We will keep selectedThemeId but removing local themes array means we can't find it here.
    return { id: selectedThemeId } as any;
  };
  // NOTE: ThemeDetails will be refactored to fetch by ID or receive just ID. 
  // Checking ThemeDetails usage next. For now, removing the local lookup.

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

    // 2. Not Logged In -> Auth Screens
    if (!session) {
      if (currentView !== View.SIGNUP) return <Auth mode={View.LOGIN} onAuthSuccess={() => { }} onToggleMode={() => navigateTo(View.SIGNUP)} />;
      return <Auth mode={View.SIGNUP} onAuthSuccess={() => { }} onToggleMode={() => navigateTo(View.LOGIN)} />;
    }

    // 3. Preferences Loading (Logged in but checking onboarding)
    if (loadingPreferences) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-slate-500 font-medium">Carregando perfil...</p>
          </div>
        </div>
      );
    }

    // 4. Onboarding Guard
    if (!isOnboardingCompleted && currentView !== View.ONBOARDING) {
      return <Onboarding onNavigate={(v) => {
        if (v === View.DASHBOARD) checkPreferences(session.user.id);
        else navigateTo(v);
      }} />;
    }

    // 5. Paywall Guard (Fallback for render loop)
    if (isOnboardingCompleted && !isPremium && !isFreePlan && currentView !== View.PREMIUM) {
      return <Premium />;
    }

    // 6. Main Routing
    switch (currentView) {
      case View.LOGIN:
      case View.SIGNUP:
        // If we are here and logged in + loaded + completed, go to dashboard
        if (isOnboardingCompleted && isPremium) return <Dashboard onNavigate={navigateTo} />;
        return <Auth mode={currentView} onAuthSuccess={() => checkPreferences(session.user.id)} onToggleMode={() => navigateTo(currentView === View.LOGIN ? View.SIGNUP : View.LOGIN)} />;
      case View.PREMIUM:
        if (isPremium) return <Dashboard onNavigate={navigateTo} />; // Auto-exit paywall if becomes premium
        return <Premium />;

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
      case View.ADD_THEME:
        return <AddTheme onNavigate={navigateTo} />;
      case View.THEME_DETAILS:
        return <ThemeDetails themeId={selectedThemeId} onNavigate={navigateTo} />;
      case View.ONBOARDING:
        return <Onboarding onNavigate={async (v) => {
          // When finishing onboarding, re-verify status explicitly
          if (v === View.DASHBOARD) {
            if (session) await checkPreferences(session.user.id);
          } else {
            navigateTo(v);
          }
        }} />;
      case View.FOCUS:
        return <FocusMode themeId={selectedThemeId} onNavigate={navigateTo} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };



  return (
    <NetworkProvider>
      <UserProvider>
        <TrialBanner onNavigate={navigateTo} />
        {renderView()}
      </UserProvider>
    </NetworkProvider>
  );
};

export default App;
