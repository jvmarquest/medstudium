
import React from 'react';
import { View } from '../types';
import { Navbar, Header } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';

interface Props {
  onNavigate: (view: View) => void;
  onHistory: () => void;
}

const Achievements: React.FC<Props> = ({ onNavigate, onHistory }) => {
  const badges = [
    { id: 1, title: 'Início Promissor', desc: 'Completou a primeira revisão', icon: 'stars', earned: true, date: '22/10/24' },
    { id: 2, title: 'Foco Total', desc: '7 dias seguidos de estudo', icon: 'local_fire_department', earned: true, date: 'Ontem' },
    { id: 3, title: 'Mestre Cardio', desc: '90% de acerto em Cardiologia', icon: 'favorite', earned: false },
    { id: 4, title: 'Cirurgião Ágil', desc: 'Revisou 50 temas de Cirurgia', icon: 'content_cut', earned: false },
    { id: 5, title: 'Noturno', desc: 'Estudou após as 22h por 3 dias', icon: 'dark_mode', earned: true, date: '15/10/24' },
    { id: 6, title: 'Simulado Expert', desc: 'Nota > 8.0 em Simulado', icon: 'assignment_turned_in', earned: false },
  ];

  return (
    <PageLayout
      header={<Header title="Conquistas" subtitle="Seu legado acadêmico" onBack={() => onNavigate(View.DASHBOARD)} onHistory={onHistory} />}
      bottomNav={<Navbar currentView={View.ACHIEVEMENTS} onNavigate={onNavigate} />}
    >

      <main className="flex flex-col gap-6 p-4 px-6 w-full mx-auto">
        <section className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Nível de Residência</p>
              <h2 className="text-3xl font-black">R1 - Aspirante</h2>
            </div>
            <div className="size-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
              <span className="material-symbols-outlined text-4xl">workspace_premium</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>XP: 2,450 / 5,000</span>
              <span>49%</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '49%' }}></div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">military_tech</span>
            Medalhas de Honra
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {badges.map(badge => (
              <div
                key={badge.id}
                className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${badge.earned
                  ? 'bg-white dark:bg-card-dark border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 opacity-60'
                  }`}
              >
                <div className={`size-14 rounded-full flex items-center justify-center mb-3 ${badge.earned ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}>
                  <span className={`material-symbols-outlined text-3xl ${badge.earned ? 'filled' : ''}`}>
                    {badge.icon}
                  </span>
                </div>
                <h4 className="text-sm font-bold leading-tight mb-1">{badge.title}</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">{badge.desc}</p>
                {badge.earned && (
                  <span className="mt-2 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {badge.date}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold mb-4">Estatísticas de Carreira</h3>
          <div className="space-y-4">
            {[
              { label: 'Questões Resolvidas', val: '1,284', icon: 'quiz' },
              { label: 'Horas de Foco', val: '45.5h', icon: 'timer' },
              { label: 'Temas Dominados', val: '12', icon: 'task_alt' }
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">{stat.icon}</span>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</span>
                </div>
                <span className="text-sm font-bold">{stat.val}</span>
              </div>
            ))}
          </div>
        </section>
      </main>


    </PageLayout>
  );
};

export default Achievements;
