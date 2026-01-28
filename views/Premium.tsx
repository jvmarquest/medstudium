import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from '../contexts/UserContext';
import { Check } from 'lucide-react';
import { View } from '../types';
import { isUserPremium } from '../lib/premiumUtils';
import { createCheckoutSession } from '../lib/checkout';


interface PremiumProps {
    onNavigate?: (view: View) => void;
    onBack?: () => void;
}

const Premium: React.FC<PremiumProps> = ({ onNavigate, onBack }) => {
    const { session, profile, loading: userLoading, refreshProfile } = useUser();
    const [loading, setLoading] = useState<'monthly' | 'lifetime' | null>(null);
    const [freeLoading, setFreeLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    // Block access for Active (Premium) users
    // Trial users can still see this screen to engage with upgrade options.
    React.useEffect(() => {
        if (!userLoading && isUserPremium(profile)) {
            if (onNavigate) {
                onNavigate(View.DASHBOARD);
            } else {
                window.location.href = '/';
            }
        }
    }, [profile, userLoading, onNavigate]);



    // ...

    const handleSubscribe = async (plan: 'monthly' | 'lifetime') => {
        if (!session?.user) return;

        setLoading(plan);
        try {
            await createCheckoutSession(plan);
        } catch (err: any) {
            console.error('Erro no checkout:', err);
            setToast({ message: err.message || 'Falha ao iniciar pagamento.', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setLoading(null);
        }
    };

    const handleFreePlan = async () => {
        if (!session?.user) {
            console.error("handleFreePlan: No session user found");
            return;
        }

        console.log("handleFreePlan: Starting Trial activation...", { userId: session.user.id });
        setFreeLoading(true);

        try {
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(now.getDate() + 7); // 7 Days Trial

            const updatePayload = {
                plan: 'free',
                is_premium: false, // User requested correction: Free Plan is NOT premium
                subscription_status: 'trial', // 'trial' allows access (Free Active)
                trial_started_at: now.toISOString(),
                trial_expires_at: expiresAt.toISOString(),
                updated_at: now.toISOString()
            };

            const { data, error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', session.user.id)
                .select();

            if (error) {
                console.error("handleFreePlan: Supabase Error Update:", error);
                throw error;
            }

            console.log("handleFreePlan: Trial activated successfully", data);

            // Refresh Profile to update context immediately
            // This will trigger the global Loading Spinner (via UserContext update)
            await refreshProfile();

            // After refresh, the App.tsx reactive useEffect SHOULD pick up the change and render Dashboard.
            // But we also call onNavigate to be sure.
            if (onNavigate) {
                onNavigate(View.DASHBOARD);
            } else {
                window.location.href = '/';
            }

        } catch (error: any) {
            console.error("Erro ao ativar Trial:", error);
            // AGGRESSIVE FEEDBACK
            alert(`Erro ao ativar plano: ${error.message || JSON.stringify(error)}. Tente novamente.`);
            setToast({
                message: `Erro ao ativar período gratuito: ${error.message || 'Tente novamente'}`,
                type: 'error'
            });
            setTimeout(() => setToast(null), 5000);
        } finally {
            setFreeLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // window.location.reload() might be needed if state doesnt clear immediately, 
        // but App.tsx auth listener should handle it.
    };

    return (
        <div className="h-full w-full bg-background-light dark:bg-background-dark flex flex-col transition-colors duration-300 relative overflow-hidden">
            {toast && (
                <div className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 text-white font-bold animate-fade-in ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {toast.message}
                </div>
            )}

            {/* Fixed Header Bar */}
            <div className="flex-none w-full px-4 py-3 flex justify-center border-b border-slate-100 dark:border-slate-800 bg-background-light/50 dark:bg-background-dark/50 backdrop-blur-md z-10">
                <div className="w-full max-w-4xl flex justify-between items-center">
                    <div>
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold p-1"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                Voltar
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-red-500 text-sm font-semibold transition-colors flex items-center gap-2 p-1"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Sair
                    </button>
                </div>
            </div>

            {/* Scrollable Center Content */}
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
                        Escolha seu plano Premium
                    </h2>
                    <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                        Desbloqueie todo o potencial do MedStudium.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-4xl w-full">
                    {/* Monthly Plan */}
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
                        <div className="p-8 flex-1">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Mensal</h3>
                            <p className="mt-4 text-slate-500 dark:text-slate-400">Flexibilidade para seus estudos.</p>
                            <div className="mt-6 flex items-baseline">
                                <span className="text-5xl font-extrabold text-slate-900 dark:text-white">R$ 17,90</span>
                                <span className="ml-2 text-slate-500 dark:text-slate-400">/mês</span>
                            </div>
                            <ul className="mt-8 space-y-4">
                                {['Sem limite de temas', 'Sem limite de novas revisões', 'Estatísticas avançadas', 'Suporte prioritário'].map((benefit, index) => (
                                    <li key={index} className="flex items-center">
                                        <Check className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                                        <span className="text-slate-600 dark:text-slate-300">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center">
                            <button
                                onClick={() => handleSubscribe('monthly')}
                                disabled={loading === 'monthly' || freeLoading}
                                className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading === 'monthly' ? 'Processando...' : 'Assinar Plano Mensal'}
                            </button>
                            <p className="mt-4 text-sm text-slate-500 dark:text-slate-300 font-bold">
                                Cancele quando quiser.
                            </p>
                        </div>
                    </div>

                    {/* Lifetime Plan */}
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl overflow-hidden border-2 border-indigo-600 relative flex flex-col transition-colors">
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            MELHOR VALOR
                        </div>
                        <div className="p-8 flex-1">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Vitalício</h3>
                            <p className="mt-4 text-slate-500 dark:text-slate-400">Pague uma vez, use para sempre.</p>
                            <div className="mt-6 flex items-baseline">
                                <span className="text-5xl font-extrabold text-slate-900 dark:text-white">R$ 237,90</span>
                                <span className="ml-2 text-slate-500 dark:text-slate-400">único</span>
                            </div>
                            <ul className="mt-8 space-y-4">
                                {['Todas as vantagens do plano mensal', 'Sem renovação automática', 'Para sempre'].map((benefit, index) => (
                                    <li key={index} className="flex items-center">
                                        <Check className="h-5 w-5 text-indigo-600 mr-3 shrink-0" />
                                        <span className="text-slate-600 dark:text-slate-300">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={() => handleSubscribe('lifetime')}
                                disabled={loading === 'lifetime' || freeLoading}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl px-4 py-3 font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading === 'lifetime' ? 'Processando...' : 'Comprar Vitalício'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Footer with Free Version Link */}
            <div className="flex-none w-full p-6 text-center bg-white/80 dark:bg-card-dark/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-safe">
                <button
                    onClick={handleFreePlan}
                    disabled={freeLoading || loading !== null}
                    className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors border-b border-transparent hover:border-indigo-600 dark:hover:border-white pb-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {freeLoading ? 'Salvando...' : 'Continuar com versão gratuita'}
                </button>
            </div>
        </div>
    );
};

export default Premium;
