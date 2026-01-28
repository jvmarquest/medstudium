import React from 'react';
import { useUser } from '../contexts/UserContext';
import { View } from '../types';

interface TrialBannerProps {
    onNavigate: (view: View) => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ onNavigate }) => {
    const { trialExpiresAt, profile } = useUser();

    if (!trialExpiresAt) return null;

    // Show ONLY if the user is NOT explicitly paid (monthly/lifetime/active)
    const isPaid = profile?.plan === 'monthly' || profile?.plan === 'lifetime' || profile?.subscription_status === 'active';

    if (isPaid) return null;

    const now = new Date();
    const expires = new Date(trialExpiresAt);

    // If it's drastically in the past (more than 1 day), hide it.
    if (now.getTime() > expires.getTime() + (1000 * 60 * 60 * 24)) return null;

    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
        <div className="flex-none sticky top-0 left-0 right-0 z-[999] bg-indigo-600 dark:bg-indigo-900 text-white px-4 py-2.5 flex items-center justify-between text-sm md:text-base shadow-xl border-b border-indigo-500/50 backdrop-blur-md bg-opacity-95">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] md:text-[20px] animate-pulse text-indigo-200">timer</span>
                <span className="font-medium">
                    Você está no período gratuito. Restam <strong className="text-white">{diffDays > 0 ? diffDays : 0} {diffDays === 1 ? 'dia' : 'dias'}</strong>.
                </span>
            </div>
            <button
                onClick={() => onNavigate(View.PREMIUM)}
                className="bg-white text-indigo-700 hover:bg-slate-100 px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all transform hover:scale-105 shadow-md active:scale-95 border-none"
            >
                Assinar agora
            </button>
        </div>
    );
};
