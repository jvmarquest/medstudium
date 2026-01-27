import React, { createContext, useContext, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';

interface PlanContextData {
    isFree: boolean;
    isTrial: boolean;
    isPremium: boolean;
    plan: 'free' | 'monthly' | 'lifetime';
    loading: boolean;
}

const PlanContext = createContext<PlanContextData>({
    isFree: true,
    isTrial: false,
    isPremium: false,
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

        // 1. Check Trial
        const now = new Date();
        const trialExpires = profile?.trial_expires_at ? new Date(profile.trial_expires_at) : null;
        const isTrialActive = !!trialExpires && trialExpires > now;

        // 2. Check Database Flags (Primary Source now)
        const dbIsPremium = profile?.is_premium === true;
        const dbPlan = profile?.plan || 'free';
        const dbSubStatus = profile?.subscription_status;

        // 3. Check Legacy/Stripe Subscription (Fallback/Sync)
        // If we have a valid stripe sub, allow it even if profile is outdated (fail-open for paid users)
        const stripeSubActive = subscription && ['active', 'lifetime'].includes(subscription.status);

        // 4. Aggregated Status
        const isPremium = dbIsPremium || stripeSubActive || isTrialActive || dbPlan === 'lifetime' || dbPlan === 'monthly';

        // Determine Plan (Normalize)
        let plan: 'free' | 'monthly' | 'lifetime' = 'free';
        if (dbPlan === 'monthly' || dbPlan === 'lifetime' || dbPlan === 'free') {
            plan = dbPlan;
        }
        if (subscription?.plan === 'monthly') plan = 'monthly';
        if (subscription?.plan === 'lifetime' || subscription?.status === 'lifetime') plan = 'lifetime';

        // Override if Free but Trial is active -> It's technically "Free Trial" but grants access.
        // We consider it "Premium Access" for guards.

        return {
            isFree: !isPremium, // "Free" means NO premium access
            isTrial: isTrialActive,
            isPremium: isPremium,
            plan: plan,
            loading: false
        };
    }, [profile, userLoading, subscription]);

    return (
        <PlanContext.Provider value= { planState } >
        { children }
        </PlanContext.Provider>
    );
};

export const usePlan = () => useContext(PlanContext);
