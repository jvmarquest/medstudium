
import React, { useMemo, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { isUserPremium } from '../lib/premiumUtils';
import { View } from '../types';
import { supabase } from '../supabase';

interface Props {
    onNavigate: (view: View) => void;
}

export const SubscriptionStatusCard: React.FC<Props> = ({ onNavigate }) => {
    const { profile, loading: userLoading, refreshProfile } = useUser();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleCancelSubscription = async () => {
        setProcessing(true);
        try {
            const { data, error } = await supabase.functions.invoke('cancel-subscription');
            if (error) throw error;

            await refreshProfile();
            setShowCancelModal(false);
            alert('Assinatura cancelada com sucesso. Seu acesso continua até o fim do período.');
        } catch (err: any) {
            console.error('Cancel Error:', err);
            // Try to extract dynamic error message
            const msg = err.message || 'Erro ao cancelar assinatura. Tente novamente.';
            alert(msg);
        } finally {
            setProcessing(false);
        }
    };

    const statusData = useMemo(() => {
        if (userLoading || !profile) return null;

        const isPremium = isUserPremium(profile);
        const plan = profile.plan;
        const status = profile.subscription_status;
        const isTrial = status === 'trial';

        // Default: Free
        let title = 'Plano Gratuito';
        let statusLabel = 'Ativo';
        let statusColor = 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
        let buttonText = 'Fazer Upgrade';
        let buttonAction = () => onNavigate(View.PREMIUM);
        let showButton = true;
        let infoText = '';

        // Logic Tree
        if (isPremium) {
            if (plan === 'lifetime') {
                title = 'Plano Vitalício';
                statusLabel = 'Vitalício';
                showButton = false; // Never show manage for lifetime
            } else if (plan === 'monthly') {
                title = 'Plano Mensal';

                if (status === 'canceled_pending') {
                    statusLabel = 'Cancelado (Agendado)';
                    statusColor = 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
                    showButton = false; // No action needed until it expires
                    infoText = 'Acesso Premium mantido até o fim do ciclo.';
                } else if (status === 'active') {
                    statusLabel = 'Ativo';
                    buttonText = 'Cancelar Assinatura';
                    buttonAction = () => setShowCancelModal(true);
                } else {
                    // Fallback
                    statusLabel = 'Ativo';
                }
            }
        } else if (isTrial) {
            title = 'Teste Gratuito';
            statusLabel = 'Em Teste';
            statusColor = 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400';
            buttonText = 'Assinar Agora';
            buttonAction = () => onNavigate(View.PREMIUM);
        } else {
            // Free / Expired
            if (status === 'expired') {
                statusLabel = 'Expirado';
                statusColor = 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            } else if (status === 'canceled') {
                statusLabel = 'Cancelado';
                statusColor = 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
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
            dateLabel = `Teste até ${date}`;
        } else if (profile.current_period_end && (status === 'canceled_pending' || status === 'active')) {
            const date = new Date(profile.current_period_end).toLocaleDateString('pt-BR');
            // If canceled_pending -> "Expira em: ..."
            // If active -> "Renova em: ..."
            dateLabel = status === 'canceled_pending' ? `Expira em ${date}` : `Renova em ${date}`;
        }

        return {
            title,
            statusLabel,
            statusColor,
            benefits,
            buttonText,
            buttonAction,
            showButton,
            dateLabel,
            infoText
        };

    }, [profile, userLoading, onNavigate]);

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

                    {statusData.infoText && (
                        <p className="text-xs text-slate-500 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                            {statusData.infoText}
                        </p>
                    )}

                    {statusData.showButton && (
                        <button
                            onClick={statusData.buttonAction}
                            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center 
                                ${statusData.buttonText.includes('Cancelar')
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'}`}
                        >
                            {statusData.buttonText}
                        </button>
                    )}
                </div>
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-50 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Cancelar assinatura?</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                                Você continuará com acesso Premium até o final do período atual. Após isso, sua conta retornará ao plano gratuito.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={processing}
                                    className="w-full py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing && <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>}
                                    Confirmar cancelamento
                                </button>
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={processing}
                                    className="w-full py-3 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Voltar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
