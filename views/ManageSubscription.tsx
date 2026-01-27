
import React, { useState } from 'react';
import { View } from '../types';
import { Header, Navbar } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../supabase';

interface Props {
    onNavigate: (view: View) => void;
}

const ManageSubscription: React.FC<Props> = ({ onNavigate }) => {
    const { profile, refreshProfile, loading: userLoading } = useUser();
    const [loading, setLoading] = useState(false);

    const handleSimulateCancel = async () => {
        if (!profile) return;
        if (!confirm('Esta é uma simulação de cancelamento. Deseja continuar?')) return;

        setLoading(true);
        // Simulate canceling by setting status to canceled
        // In real app, this would call Stripe API
        const { error } = await supabase
            .from('profiles')
            .update({
                subscription_status: 'canceled',
                // Keep plan as is or downgrade? Usually plan stays until end of billing cycle.
                // For sim simplicity: keep plan but status canceled
            })
            .eq('id', profile.id);

        if (error) {
            alert('Erro ao cancelar.');
            console.error(error);
        } else {
            await refreshProfile();
            alert('Assinatura cancelada com sucesso (Simulação).');
        }
        setLoading(false);
    };

    const handleSimulateUpgrade = async (plan: 'monthly' | 'lifetime') => {
        if (!profile) return;
        if (!confirm(`Simular assinatura do plano ${plan}?`)) return;

        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                plan: plan,
                subscription_status: 'active',
                is_premium: true,
                // Reset trial if any
                trial_expires_at: null
            })
            .eq('id', profile.id);

        if (error) {
            alert('Erro ao simular upgrade.');
            console.error(error);
        } else {
            await refreshProfile();
            alert(`Upgrade para ${plan} realizado com sucesso (Simulação).`);
        }
        setLoading(false);
    };

    const handleSimulateDowngrade = async () => {
        // Simulate reverting to Free
        if (!profile) return;
        if (!confirm(`Simular downgrade para Gratuito?`)) return;

        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                plan: 'free',
                subscription_status: 'free',
                is_premium: false
            })
            .eq('id', profile.id);

        if (error) {
            alert('Erro ao simular downgrade.');
            console.error(error);
        } else {
            await refreshProfile();
            alert(`Downgrade para Gratuito realizado (Simulação).`);
        }
        setLoading(false);
    };

    const header = (
        <Header
            title="Gerenciar Assinatura"
            onBack={() => onNavigate(View.SETTINGS)}
            onCalendar={() => onNavigate(View.PLAN)}
        />
    );

    if (userLoading || !profile) {
        return (
            <PageLayout header={header} bottomNav={<Navbar currentView={View.SETTINGS} onNavigate={onNavigate} />}>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </PageLayout>
        );
    }

    const isPremium = profile.is_premium;
    const planName = profile.plan === 'lifetime' ? 'Vitalício'
        : profile.plan === 'monthly' ? 'Mensal'
            : 'Gratuito';

    const statusLabel = profile.subscription_status === 'active' ? 'Ativo'
        : profile.subscription_status === 'trial' ? 'Em Teste'
            : profile.subscription_status === 'canceled' ? 'Cancelado'
                : 'Inativo/Gratuito';

    const statusColor = profile.subscription_status === 'active' ? 'text-green-600 bg-green-100'
        : profile.subscription_status === 'trial' ? 'text-indigo-600 bg-indigo-100'
            : profile.subscription_status === 'canceled' ? 'text-orange-600 bg-orange-100'
                : 'text-slate-600 bg-slate-100';

    return (
        <PageLayout header={header} bottomNav={<Navbar currentView={View.SETTINGS} onNavigate={onNavigate} />}>
            <div className="flex flex-col gap-6 p-4 max-w-md lg:max-w-4xl xl:max-w-5xl mx-auto w-full">

                {/* Current Plan Card */}
                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold dark:text-white">{planName}</h2>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>

                    {profile.plan === 'monthly' && (
                        <p className="text-sm text-slate-500 mb-4">
                            Renovação automática mensal. {profile.subscription_status === 'canceled' && '(Renovação desativada)'}
                        </p>
                    )}
                    {profile.plan === 'lifetime' && (
                        <p className="text-sm text-slate-500 mb-4">
                            Acesso vitalício sem cobranças recorrentes.
                        </p>
                    )}
                    {profile.plan === 'free' && (
                        <p className="text-sm text-slate-500 mb-4">
                            Plano básico com funcionalidades limitadas.
                        </p>
                    )}

                    <div className="h-px bg-slate-100 dark:bg-slate-700 w-full my-4"></div>

                    {/* Actions */}
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ações</h3>
                    <div className="flex flex-col gap-3">
                        {isPremium ? (
                            <>
                                {profile.plan === 'monthly' && profile.subscription_status === 'active' && (
                                    <button
                                        onClick={handleSimulateCancel}
                                        disabled={loading}
                                        className="w-full py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors disabled:opacity-50"
                                    >
                                        Cancelar Renovação (Simulação)
                                    </button>
                                )}

                                {/* Simulation Tools for Dev */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl mt-4 border border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Modo Desenvolvedor (Simulação)</h4>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={handleSimulateDowngrade} disabled={loading} className="text-sm text-slate-600 hover:underline text-left">
                                            Simular Downgrade para Free
                                        </button>
                                        {profile.plan !== 'lifetime' && (
                                            <button onClick={() => handleSimulateUpgrade('lifetime')} disabled={loading} className="text-sm text-slate-600 hover:underline text-left">
                                                Simular Upgrade para Vitalício
                                            </button>
                                        )}
                                        {profile.plan !== 'monthly' && (
                                            <button onClick={() => handleSimulateUpgrade('monthly')} disabled={loading} className="text-sm text-slate-600 hover:underline text-left">
                                                Simular Upgrade para Mensal
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => onNavigate(View.PREMIUM)}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
                            >
                                Quero ser Premium
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </PageLayout>
    );
};

export default ManageSubscription;
