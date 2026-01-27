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
        if (isPremium && !isTrial) return true;

        // Trial users have App Access but are restricted on specific features (like Topic Limit)
        // If isTrial is true, we fall through to checks below.

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
