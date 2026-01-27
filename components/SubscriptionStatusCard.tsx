
import React, { useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { isUserPremium } from '../lib/premiumUtils';
import { View } from '../types';

interface Props {
    onNavigate: (view: View) => void;
}

export const SubscriptionStatusCard: React.FC<Props> = ({ onNavigate }) => {
    const { profile, loading } = useUser();

    const statusData = useMemo(() => {
        if (loading || !profile) return null;

        const isPremium = isUserPremium(profile);
        const plan = profile.plan;
        const status = profile.subscription_status;
        const isTrial = status === 'trial';

        let title = 'Plano Gratuito';
        let statusLabel = 'Ativo';
        let statusColor = 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
        let buttonText = 'Fazer Upgrade';
        let buttonAction = () => onNavigate(View.PREMIUM);

        // Logic Tree
        if (isPremium) {
            if (plan === 'lifetime') {
                title = 'Plano Vitalício';
            } else if (plan === 'monthly') {
                title = 'Plano Mensal';
            } else {
                title = 'Plano Premium'; // Generic active fallback
            }
            statusLabel = 'Ativo';
            buttonText = 'Gerenciar Assinatura';
            // For now, Manage Subscription just goes to Premium/Plan options or Stripe Portal (if implemented)
            // Since Stripe Portal isn't fully linked here, we direct to Premium View which might show details
            // or we can direct to a Stripe Customer Portal link if we had one.
            // For this request: "Mostrar 'Gerenciar Assinatura'".
            buttonAction = () => onNavigate(View.PREMIUM);
        } else if (isTrial) {
            title = 'Teste Gratuito';
            statusLabel = 'Em Teste';
            statusColor = 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400';
        } else {
            // Free / Expired
            if (status === 'expired') {
                statusLabel = 'Expirado';
                statusColor = 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            }
        }

        // Benefits List
        const benefits = isPremium
            ? [
                'Temas ilimitados',
                'Revisões ilimitadas',
                'Estatísticas avançadas',
                'Relatórios detalhados',
                'Análise por dificuldade'
            ]
            : [
                'Limite de 10 Temas',
                'Estatísticas básicas',
                'Revisões limitadas',
                'Sem relatórios completos',
                'Modo Gratuito'
            ];

        // Validity Date
        let dateLabel = null;
        if (isTrial && profile.trial_expires_at) {
            const date = new Date(profile.trial_expires_at).toLocaleDateString('pt-BR');
            dateLabel = `Trial até: ${date}`;
        } else if (isPremium && plan === 'monthly') {
            // We might check subscription expires_at if available
            // profile doesn't strictly have expires_at mapped in types yet for sub, but let's check profile.expires_at if added
            // "Validade: 20/02/2026"
        }

        return {
            title,
            statusLabel,
            statusColor,
            benefits,
            buttonText,
            buttonAction,
            dateLabel
        };

    }, [profile, loading, onNavigate]);

    if (!statusData) return null;

    return (
        <div>
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 pb-2 pt-4">Meu Plano</h3>
            <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{statusData.title}</h4>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mt-1 ${statusData.statusColor}`}>
                                {statusData.statusLabel}
                            </div>
                        </div>
                        {statusData.dateLabel && (
                            <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                {statusData.dateLabel}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 mb-6">
                        {statusData.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-base text-primary">check_circle</span>
                                {benefit}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={statusData.buttonAction}
                        className="w-full py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                    >
                        {statusData.buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};
