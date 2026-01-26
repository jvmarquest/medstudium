import React from 'react';
import { useUser } from '../contexts/UserContext';
import { View } from '../types';

interface TrialBannerProps {
    onNavigate: (view: View) => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ onNavigate }) => {
    const { trialExpiresAt, subscription } = useUser();

    if (!trialExpiresAt) return null;

    // If user has an active paid subscription, don't show info even if trial date exists (legacy)
    // Actually our checking logic is: isPremium tries trial first. 
    // If subscription is active, we shouldn't show "You are in trial" if they already paid.
    if (subscription && ['active', 'lifetime'].includes(subscription.status)) return null;

    const now = new Date();
    const expires = new Date(trialExpiresAt);

    if (now > expires) return null; // Expired, Paywall should handle blocking

    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
        <div className="bg-indigo-600 dark:bg-indigo-900 text-white px-4 py-2 flex items-center justify-between text-sm md:text-base shadow-md relative z-50">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] md:text-[20px]">timer</span>
                <span className="font-medium">
                    Você está no período gratuito. Restam <strong>{diffDays} dias</strong>.
                </span>
            </div>
            <button
                onClick={() => onNavigate(View.PREMIUM)}
                className="bg-white text-indigo-700 hover:bg-slate-100 px-3 py-1 rounded-lg font-bold text-xs md:text-sm transition-colors shadow-sm"
            >
                Assinar agora
            </button>
        </div>
    );
};
