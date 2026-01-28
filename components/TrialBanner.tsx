import React from 'react';
import { useUser } from '../contexts/UserContext';
import { usePlan } from '../lib/planContext';
import { View } from '../types';

interface TrialBannerProps {
    onNavigate: (view: View) => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ onNavigate }) => {
    const { trialExpiresAt } = useUser();
    const { isTrial } = usePlan();

    if (!trialExpiresAt) return null;

    // Strict Check: Only show if user is explicitly in TRIAL mode
    // PlanContext.isTrial is true only when status === 'trial'
    if (!isTrial) return null;

    const now = new Date();
    const expires = new Date(trialExpiresAt);

    if (now > expires) return null; // Expired

    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
        <div className="sticky top-0 left-0 right-0 z-[100] bg-indigo-600 dark:bg-indigo-900 text-white px-4 py-2.5 flex items-center justify-between text-sm md:text-base shadow-lg border-b border-white/10 backdrop-blur-sm bg-opacity-95">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] md:text-[20px] animate-pulse">timer</span>
                <span className="font-medium">
                    Você está no período gratuito. Restam <strong className="text-white">{diffDays} dias</strong>.
                </span>
            </div>
            <button
                onClick={() => onNavigate(View.PREMIUM)}
                className="bg-white text-indigo-700 hover:bg-slate-100 px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all transform hover:scale-105 shadow-md active:scale-95"
            >
                Assinar agora
            </button>
        </div>
    );
};
