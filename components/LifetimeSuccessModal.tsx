
import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    planType?: 'monthly' | 'lifetime' | 'free';
}

export const LifetimeSuccessModal: React.FC<Props> = ({ isOpen, onClose, planType = 'lifetime' }) => {
    if (!isOpen) return null;

    const isLifetime = planType === 'lifetime';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-50 duration-300 transform scale-100 flex flex-col">

                {/* Header with Icon */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    {/* Decorative Circles */}
                    <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute bottom-[-10px] right-[-10px] w-32 h-32 bg-purple-500/20 rounded-full blur-xl"></div>

                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-inner ring-4 ring-white/10 relative z-10">
                        <span className="material-symbols-outlined text-3xl text-white">
                            {isLifetime ? 'diamond' : 'verified'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white relative z-10">Parabéns!</h2>
                    <p className="text-indigo-100 text-sm font-medium mt-1 relative z-10">
                        {isLifetime ? 'Você agora é Membro Vitalício' : 'Assinatura Confirmada'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center text-center">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                        Seu pagamento foi confirmado com sucesso. Agora você tem acesso <strong className="text-indigo-600 dark:text-indigo-400">ilimitado</strong>
                        {isLifetime ? ' e vitalício' : ''} a todos os recursos do MedStudium. Bons estudos!
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        Começar a Estudar
                    </button>
                </div>
            </div>
        </div>
    );
};
