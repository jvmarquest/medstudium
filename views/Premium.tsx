import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUser } from '../contexts/UserContext';
import { Check } from 'lucide-react';

const Premium: React.FC = () => {
    const { session } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<'monthly' | 'lifetime' | null>(null);

    const handleSubscribe = async (plan: 'monthly' | 'lifetime') => {
        if (!session?.user) {
            navigate('/auth');
            return;
        }

        setLoading(plan);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: { plan }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('Erro ao gerar link de pagamento');
            }
        } catch (err: any) {
            console.error('Erro no checkout:', err);
            alert('Falha ao iniciar pagamento. Tente novamente.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                    Escolha seu plano Premium
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                    Desbloqueie todo o potencial do MedStudium.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-4xl w-full">
                {/* Monthly Plan */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col">
                    <div className="p-8 flex-1">
                        <h3 className="text-2xl font-bold text-gray-900">Mensal</h3>
                        <p className="mt-4 text-gray-500">Flexibilidade para seus estudos.</p>
                        <div className="mt-6 flex items-baseline">
                            <span className="text-5xl font-extrabold text-gray-900">R$ 29,90</span>
                            <span className="ml-2 text-gray-500">/mês</span>
                        </div>
                        <ul className="mt-8 space-y-4">
                            {['Acesso ilimitado a questões', 'Sem anúncios', 'Estatísticas avançadas', 'Suporte prioritário'].map((benefit, index) => (
                                <li key={index} className="flex items-center">
                                    <Check className="h-5 w-5 text-green-500 mr-3" />
                                    <span className="text-gray-600">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-8 bg-gray-50">
                        <button
                            onClick={() => handleSubscribe('monthly')}
                            disabled={loading === 'monthly'}
                            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === 'monthly' ? 'Processando...' : 'Assinar Mensal'}
                        </button>
                    </div>
                </div>

                {/* Lifetime Plan */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-indigo-600 relative flex flex-col">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        MELHOR VALOR
                    </div>
                    <div className="p-8 flex-1">
                        <h3 className="text-2xl font-bold text-gray-900">Vitalício</h3>
                        <p className="mt-4 text-gray-500">Pague uma vez, use para sempre.</p>
                        <div className="mt-6 flex items-baseline">
                            <span className="text-5xl font-extrabold text-gray-900">R$ 297,00</span>
                            <span className="ml-2 text-gray-500">único</span>
                        </div>
                        <ul className="mt-8 space-y-4">
                            {['Acesso Vitalício', 'Todas as atualizações futuras', 'Sem renovações automáticas', 'Badge exclusivo de Membro Fundador'].map((benefit, index) => (
                                <li key={index} className="flex items-center">
                                    <Check className="h-5 w-5 text-indigo-600 mr-3" />
                                    <span className="text-gray-600">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-8 bg-gray-50">
                        <button
                            onClick={() => handleSubscribe('lifetime')}
                            disabled={loading === 'lifetime'}
                            className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === 'lifetime' ? 'Processando...' : 'Comprar Vitalício'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Premium;
