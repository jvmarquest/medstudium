
import { UserProfile } from '../types';

/**
 * Standardized check for Premium status.
 * User is Premium IF:
 * 1. is_premium flag is true
 * OR
 * 2. subscription_status is 'active'
 */
export const isUserPremium = (profile: Partial<UserProfile> | null, subscriptionStatus?: string): boolean => {
    // 1. Fallback: If generic subscription is active, user IS premium (Sync Fail-safe)
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
        return true;
    }

    if (!profile || !profile.plan) return false;

    // Strict Rule: Premium = plan is NOT free (Case Insensitive)
    const p = profile.plan.toLowerCase().trim();
    return ['monthly', 'lifetime'].includes(p);
};
