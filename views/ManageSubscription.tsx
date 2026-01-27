
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

    const handlePortalSession = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-portal');
            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('Erro ao abrir portal.');
            }
        } catch (err: any) {
            console.error('Portal Error:', err);
            alert('Erro ao abrir gerenciamento de assinatura.');
        } finally {
            setLoading(false);
        }
    };

    // ... existing simulation handlers if needed or remove them.
    // User requested: "No botão 'Gerenciar Assinatura': se is_premium true e plan='monthly' => abrir portal"
    // So let's replace the simulation logic for real logic where applicable.

    // Dev helpers
    const handleSimulateDowngrade = async () => {
        if (!confirm('Simular Downgrade para Free?')) return;
        setLoading(true);
        try {
            await supabase.from('profiles').update({
                plan: 'free',
                is_premium: false,
                subscription_status: 'canceled',
                updated_at: new Date().toISOString()
            }).eq('id', profile?.id);
            await refreshProfile();
            alert('Downgrade simulado.');
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSimulateUpgrade = async (newPlan: 'monthly' | 'lifetime') => {
        if (!confirm(`Simular Upgrade para ${newPlan}?`)) return;
        setLoading(true);
        try {
            await supabase.from('profiles').update({
                plan: newPlan,
                is_premium: true,
                subscription_status: 'active',
                updated_at: new Date().toISOString()
            }).eq('id', profile?.id);
            await refreshProfile();
            alert('Upgrade simulado.');
        } catch (e) { console.error(e); }
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
                                {profile.plan === 'monthly' && (

                                    <button
                                        onClick={handlePortalSession}
                                        disabled={loading}
                                        className="w-full py-3 bg-white border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        Gerenciar Assinatura (Portal)
                                    </button>
                                )}

                                {profile.plan === 'lifetime' && (
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                        <p className="text-sm text-indigo-800 dark:text-indigo-200 font-medium text-center">
                                            Plano vitalício não possui cobranças recorrentes. 🎉
                                        </p>
                                    </div>
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
