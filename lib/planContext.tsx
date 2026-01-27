import React, { createContext, useContext, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';

interface PlanContextData {
    isFree: boolean;
    isTrial: boolean;
    isPremium: boolean;
    hasAppAccess: boolean;
    plan: 'free' | 'monthly' | 'lifetime';
    loading: boolean;
}

const PlanContext = createContext<PlanContextData>({
    isFree: true,
    isTrial: false,
    isPremium: false,
    hasAppAccess: false,
    plan: 'free',
    loading: true,
});

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, loading: userLoading, subscription } = useUser();

    const planState = useMemo(() => {
        if (userLoading) {
            return {
                isFree: true,
                isTrial: false,
                isPremium: false,
                plan: 'free' as const,
                loading: true
            };
        }

        // 1. Get Status from Profile (Single Source of Truth)
        const status = profile?.subscription_status || 'free';

        // 2. Map to Flags
        const isTrial = status === 'trial';
        const isPremium = status === 'active' || status === 'trial';
        const isFree = status === 'free' || status === 'expired';

        // 3. Determine Plan Name (for UI display if needed)
        let plan: 'free' | 'monthly' | 'lifetime' = 'free';

        if (isPremium) {
            if (profile?.plan === 'lifetime') plan = 'lifetime';
            else if (profile?.plan === 'monthly') plan = 'monthly';
            // Default fallback for premium without explicit plan match (e.g. trial)
            else if (status === 'trial') plan = 'monthly'; // approximate for UI
        }

        // Active and Trial have App Access. 
        // Free/Expired do NOT (redirect to Premium).
        // Unified Check as requested:
        // Unified Check as requested:
        const hasAppAccess =
            isPremium === true ||          // Covers 'active', 'lifetime' via UserContext
            status === 'active' ||         // Explicit status check
            status === 'trial' ||          // 'trial' status = Free Active or Trial period
            status === 'free';             // User Request: 'free' status also grants app access

        return {
            isFree,
            isTrial,
            isPremium,
            hasAppAccess,
            plan,
            loading: false
        };
    }, [profile, userLoading]);

    return (
        <PlanContext.Provider value={planState}>
            {children}
        </PlanContext.Provider>
    );
};

export const usePlan = () => useContext(PlanContext);
