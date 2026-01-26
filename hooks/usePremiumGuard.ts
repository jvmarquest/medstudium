import { useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { View } from '../types';

export const usePremiumGuard = (
    currentView: View,
    setCurrentView: (view: View) => void,
    isOnboardingCompleted: boolean
) => {
    const { user, isPremium, loading } = useUser();

    useEffect(() => {
        // Skip while loading
        if (loading) return;

        // Skip if onboarding is not done (already handled by App.tsx generally, but good to check)
        if (!isOnboardingCompleted && currentView !== View.ONBOARDING) return;

        // If user is NOT premium AND NOT free plan (or expired), block access.
        // Wait, requirements say: "usePremiumGuard ... que verifica trial ativo, assinatura ativa, bloqueio se expirado"
        // But we also have "Free Access".
        // If user is on Free Plan, they SHOULD generally access things, but maybe some specfic features are blocked.
        // The prompt says "Aplicar em áreas premium".
        // So this hook should be used inside components that REQUIRE premium.

        // However, the global guard in App.tsx also does high level checking.
        // Let's implement this as a check for PREMIUM-ONLY areas.

        // But the prompt in Step 9: "Aplicar em áreas premium."
        // And "Verify trial active, sub active".

    }, [user, isPremium, loading, currentView, isOnboardingCompleted]);

    // Return status for usage in UI
    return {
        isLocked: !isPremium,
        canAccess: isPremium
    };
};
