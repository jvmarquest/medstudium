
import { UserProfile } from '../types';

/**
 * Standardized check for Premium status.
 * User is Premium IF:
 * 1. is_premium flag is true
 * OR
 * 2. subscription_status is 'active'
 */
export const isUserPremium = (profile: Partial<UserProfile> | null): boolean => {
    if (!profile) return false;

    // 0. Check Date Expiry for Canceled/Pending
    // If user is scheduled to cancel, strict check on date
    if (profile.subscription_status === 'canceled_pending' && profile.current_period_end) {
        const expiresAt = new Date(profile.current_period_end);
        if (expiresAt < new Date()) {
            return false; // Expired
        }
    }

    // Rule: premium = (plan in ['monthly','lifetime']) OR (is_premium === true) OR (subscription_status === 'active')

    // 1. Check Subscription Status (from subscription table or profile fallback)
    if (profile.subscription_status === 'active' || profile.subscription_status === 'trial') return true;

    // 2. Check Explicit Flag
    if (profile.is_premium === true) return true;

    // 3. Check Plan Name
    if (profile.plan) {
        const p = profile.plan.toLowerCase().trim();
        if (['monthly', 'lifetime'].includes(p)) return true;
    }

    return false;
};
