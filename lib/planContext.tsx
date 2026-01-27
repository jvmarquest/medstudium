import React, { createContext, useContext, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';

interface PlanContextData {
    isFree: boolean;
    isTrial: boolean;
    isPremium: boolean;
    hasAppAccess: boolean;
    plan: 'free' | 'monthly' | 'lifetime' | 'dev';
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
        let plan: 'free' | 'monthly' | 'lifetime' | 'dev' = 'free';

        if (isPremium) {
            if (profile?.plan === 'dev') plan = 'dev';
            else if (profile?.plan === 'lifetime') plan = 'lifetime';
            else plan = 'monthly';
        }

        // Active and Trial have App Access. 
        // Free/Expired do NOT (redirect to Premium).
        const hasAppAccess = status === 'active' || status === 'trial';

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
