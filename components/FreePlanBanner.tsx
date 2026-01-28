import React from 'react';
import { usePlan } from '../lib/planContext';
import { useUser } from '../contexts/UserContext';
import { View } from '../types';

interface FreePlanBannerProps {
    onNavigate: (view: View) => void;
}

export const FreePlanBanner: React.FC<FreePlanBannerProps> = ({ onNavigate }) => {
    const { isFree, isTrial } = usePlan();
    const { session } = useUser();

    // Only show if user is on Free plan and NOT in a trial
    // The TrialBanner handles the trial state.
    if (!session || !isFree || isTrial) return null;

    return (
        <div className="flex-none sticky top-0 left-0 right-0 z-[999] bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2.5 flex items-center justify-between text-sm md:text-base shadow-xl border-b border-red-500/50 backdrop-blur-md bg-opacity-95">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] md:text-[20px] animate-pulse text-red-200">lock_open</span>
                <span className="font-medium">
                    Você está no plano gratuito.
                </span>
            </div>
            <button
                onClick={() => onNavigate(View.PREMIUM)}
                className="bg-white text-red-700 hover:bg-slate-100 px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all transform hover:scale-105 shadow-md active:scale-95 border-none flex items-center gap-1"
            >
                Assinar Premium
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
        </div>
    );
};
