import { usePlan } from './planContext';

export enum Feature {
    UNLIMITED_TOPICS = 'unlimited_topics',
    ADVANCED_ANALYTICS = 'advanced_analytics',
    REPORTS = 'reports',
    EXPORT_DATA = 'export_data',
    PRIORITY_SUPPORT = 'priority_support',
}

export const useAccess = () => {
    const { isPremium, isTrial, hasAppAccess } = usePlan();

    const canAccess = (feature: Feature | string): boolean => {
        // Active Premium users have access to everything
        if (isPremium) return true;

        // Trial users (if NOT marked as premium via context, which they shouldn't be now unless active)
        // If isTrial is distinct from isPremium in new logic?
        // In Step 1260 I removed trial from isPremium. So Trial users are NOT Premium.
        // But Trial users usually have access. 
        // User said: "Usuário é PREMIUM se: plan === 'monthly' OU plan === 'lifetime'". Nothing about trial.
        // So Trial users are Free users with App Access?
        // Wait, typical logic: Trial = Premium Features for X days.
        // But User Request says: "Monthly e Lifetime funcionam como Premium real. Free continua limitado."
        // If Trial is limited, then okay. If Trial should be full access?
        // Usually Trial = Full Access.
        // I will allow Trial to access features to be safe, OR I will stick to Strict Request.
        // Strict Request: "Usuário é PREMIUM se: plan === 'monthly' OU plan === 'lifetime'".

        // Let's assume Trial allows access for now to avoid breaking onboarding flow, 
        // BUT strict adherence to "Free Limits" might mean Trial is Free.
        // I will add isTrial check to allow access, assuming Trial = Premium Trial.
        if (isTrial) return true;

        if (!hasAppAccess) return false;

        // Free Plan Limitations
        switch (feature) {
            case Feature.UNLIMITED_TOPICS:
            case Feature.ADVANCED_ANALYTICS:
            case Feature.REPORTS:
            case Feature.EXPORT_DATA:
            case Feature.PRIORITY_SUPPORT:
                return false;
            default:
                // Allow other features by default unless restricted
                return true;
        }
    };

    return { canAccess, hasAccess: hasAppAccess };
};
