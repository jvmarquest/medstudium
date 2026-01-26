
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { PageLayout } from '../components/PageLayout';

interface Props {
  onNavigate: (view: View) => void;
  onExit: () => void;
}

const FocusMode: React.FC<Props> = ({ onExit }) => {
  const [seconds, setSeconds] = useState(14 * 24 * 3600 + 8 * 3600 + 30 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const d = Math.floor(totalSeconds / (24 * 3600));
    const h = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return { d, h, m };
  };

  const { d, h, m } = formatTime(seconds);

  const header = (
    <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-background-dark text-white">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <h2 className="text-lg font-bold">Foco Pré-Prova</h2>
      </div>
      <button onClick={onExit} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm font-bold">
        Sair
        <span className="material-symbols-outlined text-lg">logout</span>
      </button>
    </header>
  );

  return (
    <PageLayout header={header}>
      <div className="flex flex-col min-h-full bg-background-dark text-white">

        <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold mb-2">Tempo até a Prova</h1>
            <p className="text-slate-400 text-sm font-medium">Mantenha o foco. Cada segundo conta.</p>
          </div>

          <div className="flex gap-4 w-full max-w-sm">
            {[
              { v: d, l: 'Dias' },
              { v: h, l: 'Hrs' },
              { v: m, l: 'Mins' }
            ].map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full aspect-square flex items-center justify-center rounded-2xl bg-surface-highlight border border-slate-700">
                  <span className="text-4xl font-black text-primary">{String(item.v).padStart(2, '0')}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.l}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-md bg-surface-dark rounded-2xl p-6 border border-slate-800">
            <h3 className="text-lg font-bold mb-4">Checklist de Revisão Final</h3>
            <div className="space-y-4">
              {[
                { t: 'Completar Simulado #3', s: 'Pontuação alvo: 240+' },
                { t: 'Revisar Flashcards de Ética', s: 'Prioridade Alta • 150 cards' }
              ].map((task, i) => (
                <label key={i} className="flex items-start gap-4 p-4 rounded-xl bg-surface-highlight/50 border border-slate-700/50 cursor-pointer hover:bg-surface-highlight transition-all">
                  <input type="checkbox" className="mt-1 rounded border-slate-600 bg-transparent text-primary focus:ring-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{task.t}</span>
                    <span className="text-[10px] text-slate-500">{task.s}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </main>

        <div className="p-8 flex justify-center">
          <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-pulse">
            <span className="material-symbols-outlined text-3xl">timer</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default FocusMode;
