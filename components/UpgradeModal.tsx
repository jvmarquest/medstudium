import React from 'react';
import { View } from '../types';
import { Check } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: View) => void;
    title?: string;
    description?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    onNavigate,
    title = "Desbloqueie este recurso Premium",
    description = "Atualize para o plano Premium e tenha acesso ilimitado a todas as funcionalidades."
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800 animate-slide-up">

                {/* Header with Premium Gradient */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="size-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-3xl">diamond</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-8">
                    <h3 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
                        {title}
                    </h3>
                    <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
                        {description}
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <Check className="h-5 w-5 text-green-500 shrink-0" />
                            <span>Temas e revisões ilimitadas</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <Check className="h-5 w-5 text-green-500 shrink-0" />
                            <span>Análises avançadas de desempenho</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <Check className="h-5 w-5 text-green-500 shrink-0" />
                            <span>Suporte prioritário e relatórios</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                onClose();
                                onNavigate(View.PREMIUM);
                            }}
                            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                        >
                            <span>Fazer Upgrade Agora</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                        >
                            Talvez depois
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
