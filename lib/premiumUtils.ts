
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

    return (
        profile.is_premium === true ||
        profile.subscription_status === 'active'
    );
};
