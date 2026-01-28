import React, { createContext, useContext, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { isUserPremium } from './premiumUtils';

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
        // 1. Get Status from Profile (Single Source of Truth)
        const status = profile?.subscription_status || 'free';
        const userPlan = profile?.plan || 'free';

        // 2. Map to Flags
        const isTrial = status === 'trial';

        // CORE RULE: Premium if plan is monthly/lifetime
        // We now rely on the helper which implements: plan !== 'free'
        const isPremium = isUserPremium(profile);

        const isFree = !isPremium;

        // 3. Determine Plan Name (for UI display if needed)
        // Strictly use profile plan if valid
        let plan: 'free' | 'monthly' | 'lifetime' = 'free';

        if (userPlan === 'monthly' || userPlan === 'lifetime') {
            plan = userPlan;
        } else if (status === 'trial') {
            // Treat trial as monthly for UI features usually, but strictly it is 'free' plan with 'trial' status
            // if we are keeping isPremium = false for Trial.
            // However, UI might expects 'monthly' for badges. 
            // Let's keep it as 'monthly' for UI purposes if in Trial, BUT be aware isPremium is FALSE for trial now.
            plan = 'monthly';
        }

        // Active and Trial have App Access. 
        // Free/Expired do NOT (redirect to Premium).

        // Unified Check as requested:
        // Unified Check:
        const hasAppAccess =
            isPremium === true ||          // Monthly/Lifetime
            status === 'active' ||         // Active Subscription
            status === 'trial' ||          // Standard Trial
            status === 'free';             // User Request: 'free' status also grants app access (freemium)

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
