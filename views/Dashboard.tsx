
import React, { useState, useEffect } from 'react';
import { View, Theme } from '../types';
import { Navbar } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { supabase } from '../supabase';
import { useUser } from '../contexts/UserContext';

interface Props {
  onNavigate: (view: View, themeId?: string) => void;
  onHistory: () => void;
}

const Dashboard: React.FC<Props> = ({ onNavigate, onHistory }) => {
  const { profile, session, dataVersion } = useUser();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [examDateStr, setExamDateStr] = useState<string | null>(null);
  const [todayThemes, setTodayThemes] = useState<Theme[]>([]);

  // Load State
  const [loadStatus, setLoadStatus] = useState({ label: 'Nenhuma', percentage: 0 });
  const [userName, setUserName] = useState('Doutor(a)');
  const [greeting, setGreeting] = useState('Olá,');

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Bom dia,');
    else if (hour >= 12 && hour < 18) setGreeting('Boa tarde,');
    else setGreeting('Boa noite,');
  };

  useEffect(() => {
    const fetchData = async () => {
      // 1. User Data from Context
      if (profile) {
        if (profile.data_prova) setExamDateStr(profile.data_prova);
      }

      const formatName = (fullName: string, gender: string | null) => {
        // Remove existing titles to avoid duplication
        const cleanName = fullName.replace(/^(Dr\.|Dra\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim();
        const parts = cleanName.split(/\s+/);

        const prefix = gender === 'F' ? 'Dra.' : 'Dr.';

        if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) return prefix;
        if (parts.length >= 2) return `${prefix} ${parts[0]} ${parts[1]}`;
        return `${prefix} ${parts[0]}`;
      };

      let finalName = 'Dr.';
      let gender: string | null = null;
      if (profile?.sexo) gender = profile.sexo;

      if (profile?.nome) {
        finalName = formatName(profile.nome, gender);
      } else if (session?.user?.user_metadata?.full_name) {
        finalName = formatName(session.user.user_metadata.full_name, gender);
      } else if (session?.user?.user_metadata?.name) {
        finalName = formatName(session.user.user_metadata.name, gender);
      }
      setUserName(finalName);

      if (!session?.user) return;

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('dias_disponiveis_semana, sexo')
        .eq('user_id', session.user.id)
        .single();

      let weeklyDays = 5;
      if (prefs?.dias_disponiveis_semana) weeklyDays = prefs.dias_disponiveis_semana;


      // 2. Fetch Today's Themes
      // Fix: Use Local Time for "Today" to avoid timezone issues late at night
      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      const todayStr = localDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('user_id', session.user.id)
        .lte('proxima_revisao', todayStr); // Changed from eq to lte to include OVERDUE items

      let currentThemes: Theme[] = [];

      if (data) {
        currentThemes = data.map(t => ({
          id: t.id,
          name: t.nome,
          specialty: t.especialidade,
          area: t.grande_area,
          accuracy: t.taxa_acerto,
          lastReview: t.ultima_revisao || 'N/A',
          nextReview: t.proxima_revisao,
          srsLevel: t.srs_level,
          difficulty: t.dificuldade as 'Fácil' | 'Médio' | 'Difícil',
          retentionRate: t.taxa_acerto,
          questionsTotal: t.total_questoes,
          questionsCorrect: t.acertos
        }));
        setTodayThemes(currentThemes);
      }

      // 3. Calculate Daily Load
      let totalWeight = 0;
      currentThemes.forEach(t => {
        if (t.difficulty === 'Fácil') totalWeight += 1;
        else if (t.difficulty === 'Médio') totalWeight += 2;
        else if (t.difficulty === 'Difícil') totalWeight += 3;
        else totalWeight += 3;
      });

      const dailyCapacity = weeklyDays * 3;
      const percentage = Math.round((totalWeight / dailyCapacity) * 100);

      let label = 'Baixa';
      if (totalWeight === 0) label = 'Nenhuma';
      else if (totalWeight >= 7) label = 'Alta';
      else if (totalWeight >= 4) label = 'Média';

      setLoadStatus({ label, percentage: Math.min(percentage, 100) });
    };

    fetchData();
    updateGreeting();
  }, [profile, session, dataVersion]);

  useEffect(() => {
    if (!examDateStr) return;

    const timer = setInterval(() => {
      const now = new Date();
      const target = examDateStr.includes('-')
        ? new Date(examDateStr + 'T00:00:00')
        : new Date(examDateStr.split('/').reverse().join('-') + 'T00:00:00');

      const diff = target.getTime() - now.getTime();

      if (diff <= 0 || isNaN(diff)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!isNaN(diff)) clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [examDateStr]);



  const header = (
    <header className="bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 w-full relative">
      <div className="flex items-center justify-between px-6 py-4 lg:py-5 w-full mx-auto relative">
        <div className="flex items-center gap-3 relative z-10 w-1/3">
          <div className="flex flex-col">
            <h2 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">{greeting}</h2>
            <h1 className="text-sm lg:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">{userName}</h1>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20">
          <img src="/favicon_io/usar.png" className="h-14 w-14 object-contain rounded-lg" alt="Logo" />
        </div>

        <div className="flex items-center gap-2 relative z-10 w-1/3 justify-end">
          <button
            onClick={onHistory}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 relative group"
            title="Histórico"
          >
            <span className="material-symbols-outlined text-2xl">history</span>
          </button>
          <button onClick={() => onNavigate(View.PLAN)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-2xl">calendar_month</span>
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <PageLayout
      header={header}
      bottomNav={<Navbar currentView={View.DASHBOARD} onNavigate={onNavigate} />}
    >
      <div className="flex flex-col gap-6 p-4 max-w-md lg:max-w-6xl xl:max-w-7xl mx-auto w-full">
        {/* Desktop: 2-column grid. Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Countdown + Load */}
          <div className="flex flex-col gap-6">
            <section aria-label="Countdown Timer">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prova de Residência</h3>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {examDateStr ? new Date(examDateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Definir Data'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { v: timeLeft.days, l: 'Dias' },
                  { v: timeLeft.hours, l: 'Horas' },
                  { v: timeLeft.minutes, l: 'Mins' },
                  { v: timeLeft.seconds, l: 'Segs' }
                ].map((t, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-700">
                      <span className="text-xl font-bold">{String(t.v).padStart(2, '0')}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 uppercase">{t.l}</span>
                  </div>
                ))}
              </div>
            </section>


            <section className="bg-gradient-to-br from-surface-dark to-[#0f172a] rounded-xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="flex flex-col gap-4 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Revisões de Hoje</h3>
                  <p className="text-slate-400 text-sm">
                    {todayThemes.length === 0 ? (
                      "Você não tem temas para revisar hoje."
                    ) : todayThemes.length === 1 ? (
                      <>Você tem <span className="text-white font-bold">1 tema</span> para revisar.</>
                    ) : (
                      <>Você tem <span className="text-white font-bold">{todayThemes.length} temas</span> para revisar.</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (todayThemes.length > 0) onNavigate(View.REVIEWS);
                  }}
                  disabled={todayThemes.length === 0}
                  className={`px-5 py-3 rounded-lg font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all ${todayThemes.length === 0
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                    : 'bg-primary hover:bg-blue-600 text-white'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  {todayThemes.length === 0 ? 'Sem revisões' : 'Iniciar Sessão'}
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Reviews + Themes */}
          <div className="flex flex-col gap-6">
            <section className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                  <h3 className="text-sm font-bold">Carga Diária</h3>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${loadStatus.label === 'Alta' ? 'bg-red-100 text-red-600' : loadStatus.label === 'Média' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                  {loadStatus.label}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${loadStatus.label === 'Alta' ? 'bg-red-500' : loadStatus.label === 'Média' ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${loadStatus.percentage}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-right">{loadStatus.percentage}% da capacidade diária</p>
            </section>

            <section>
              <h3 className="text-base font-bold mb-3">Temas de Hoje</h3>
              {todayThemes.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhuma revisão agendada para hoje.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {todayThemes.map(theme => (
                    <div
                      key={theme.id}
                      onClick={() => onNavigate(View.THEME_DETAILS, theme.id)}
                      className="bg-white dark:bg-surface-dark rounded-xl p-3 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${theme.difficulty === 'Falha' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                        }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {theme.specialty === 'Cardiologia' ? 'cardiology' : 'medical_services'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate">{theme.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {theme.specialty} • {theme.difficulty}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};


export default Dashboard;
