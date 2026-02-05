import React, { useEffect, useState } from 'react';
import { View } from '../types';
import { Navbar, Header } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { supabase } from '../supabase';
import { useUser } from '../contexts/UserContext';
import { useAccess, Feature } from '../lib/planAccess';


interface Props {
  onNavigate: (view: View) => void;
  onHistory: () => void;
}

const Analytics: React.FC<Props> = ({ onNavigate, onHistory }) => {
  const { session, profile, dataVersion } = useUser();
  const { canAccess } = useAccess();
  // removed isPremium from destructuring above since we use canAccess now
  const [effortByArea, setEffortByArea] = useState<{ area: string; percentage: number }[]>([]);
  const [generalAccuracy, setGeneralAccuracy] = useState<number | null>(null);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState<number>(0);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // CHANGED: State now holds Themes instead of Area summaries
  const [focusThemes, setFocusThemes] = useState<{
    id: string;
    name: string;
    specialty: string;
    area: string;
    difficulty: string;
    accuracy: number;
    totalQuestions: number;
  }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (userId: string) => {
    try {
      setLoading(true);
      // Fetch Reviews for General Accuracy Calculation & Effort by Area
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
            id,
            theme_id,
            taxa_acerto,
            data_realizada,
            themes!inner (
              user_id,
              grande_area
            )
          `)
        .eq('themes.user_id', userId)
        .not('data_realizada', 'is', null);

      if (reviewsError) throw reviewsError;

      // Fetch Themes with all details needed (Still needed for Focus Themes)
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select(`
          id, 
          nome, 
          especialidade, 
          grande_area, 
          taxa_acerto, 
          dificuldade, 
          total_questoes,
          acertos
        `)
        .eq('user_id', userId);

      if (themesError) throw themesError;

      if (themesData) {
        // --- General Accuracy Calculation (Real Performance) ---
        // Formula: (Total Correct / Total Questions) * 100

        const totalCorrect = themesData.reduce((acc, curr) => acc + (curr.acertos || 0), 0);
        const totalQuestions = themesData.reduce((acc, curr) => acc + (curr.total_questoes || 0), 0);

        setTotalQuestionsAnswered(totalQuestions);

        if (totalQuestions > 0) {
          const acc = Math.round((totalCorrect / totalQuestions) * 100);
          setGeneralAccuracy(acc);
        } else {
          setGeneralAccuracy(null);
        }

        // --- Effort by Area (Based on Total Questions) ---

        // 1. Initialize with user profile specialties
        const areaEffort: Record<string, number> = {};
        let totalEffort = 0;

        const userAreas = profile?.especialidades || [];
        userAreas.forEach(area => {
          if (!areaEffort[area]) areaEffort[area] = 0;
        });

        // 2. Sum Total Questions per Area from Themes
        // (themes.total_questoes includes Initial + Reviews updates)
        if (themesData) {
          themesData.forEach((theme: any) => {
            const questions = theme.total_questoes || 0;
            const area = theme.grande_area; // Don't default to 'Outros' yet, check exact match first

            // Strict Filter: Only count if area is in user's current list
            if (area && areaEffort[area] !== undefined) {
              areaEffort[area] += questions;
              totalEffort += questions;
            }
          });
        }

        // 3. Transform to Chart Data
        const chartData = Object.keys(areaEffort)
          .map(area => ({
            area,
            percentage: totalEffort > 0 ? Math.round((areaEffort[area] / totalEffort) * 100) : 0
          }))
          .sort((a, b) => b.percentage - a.percentage);

        setEffortByArea(chartData);

        // --- Focus Themes Logic ---
        const criticalThemes = themesData.filter((theme: any) => {
          const diff = (theme.dificuldade || '').toLowerCase();
          const isHard = diff === 'difícil' || diff === 'dificil';
          const themeAcc = theme.taxa_acerto || 0;
          // Use calculated accuracy or fallback
          const targetAcc = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
          const isLowAccuracy = targetAcc > 0 && themeAcc < targetAcc;

          return isHard || isLowAccuracy;
        }).map((theme: any) => ({
          id: theme.id,
          name: theme.nome,
          specialty: theme.especialidade,
          area: theme.grande_area,
          difficulty: theme.dificuldade,
          accuracy: theme.taxa_acerto || 0,
          totalQuestions: theme.total_questoes || 0
        }));

        criticalThemes.sort((a: any, b: any) => {
          const getDiffWeight = (d: string) => {
            const val = (d || '').toLowerCase();
            if (val.includes('dif')) return 3;
            if (val.includes('méd') || val.includes('med')) return 2;
            return 1;
          };
          const weightA = getDiffWeight(a.difficulty);
          const weightB = getDiffWeight(b.difficulty);
          if (weightA !== weightB) return weightB - weightA;
          return a.accuracy - b.accuracy;
        });

        setFocusThemes(criticalThemes.slice(0, 5));
      } else {
        setGeneralAccuracy(null);
        setTotalQuestionsAnswered(0);
        setEffortByArea([]);
        setFocusThemes([]);
      }

    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Não foi possível carregar suas estatísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchAnalytics(session.user.id);
      }
    });
  }, [profile, dataVersion]);

  // PROTECT View
  if (!loading && !canAccess(Feature.ADVANCED_ANALYTICS)) {
    return (
      <PageLayout
        header={<Header title="Análise" subtitle="Recurso Premium" onCalendar={() => onNavigate(View.PLAN)} onHistory={onHistory} />}
        bottomNav={<Navbar currentView={View.ANALYTICS} onNavigate={onNavigate} />}
      >
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-card-dark m-4 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800">
          <div className="size-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-indigo-600 dark:text-indigo-400">lock</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Estatísticas Avançadas</h2>
          <p className="text-slate-500 mb-8 max-w-sm">
            Desbloqueie análises detalhadas do seu desempenho, esforço por área e pontos fracos com o plano Premium.
          </p>
          <button
            onClick={() => onNavigate(View.PREMIUM)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25"
          >
            Desbloquear Premium
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={
        <Header
          title="Análise"
          subtitle="Seu progresso"
          onCalendar={() => onNavigate(View.PLAN)}
          onInfo={() => setShowInfoModal(true)}
        />
      }
      bottomNav={<Navbar currentView={View.ANALYTICS} onNavigate={onNavigate} />}
    >

      <main className="flex flex-col gap-6 p-4 px-6 w-full relative mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
            <p className="text-slate-500 text-sm">Carregando estatísticas...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/10 p-6 border border-red-100 dark:border-red-900/30 text-center">
            <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        ) : (
          <>
            {/* Top Stats Grid: Questions + Accuracy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Total Questions Section */}
              <section className="rounded-2xl bg-white dark:bg-card-dark p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-xl">format_list_numbered</span>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Questões Realizadas</p>
                  </div>
                  <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {totalQuestionsAnswered}
                  </h2>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Total acumulado de questões resolvidas em todos os temas.
                </p>
              </section>

              {/* General Accuracy Section */}
              <section className="rounded-2xl bg-white dark:bg-card-dark p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Precisão Geral</p>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-extrabold tracking-tight">{generalAccuracy !== null ? `${generalAccuracy}%` : '---'}</h2>
                    {generalAccuracy !== null && (
                      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${generalAccuracy >= 80
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : generalAccuracy >= 60
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                        <span className="material-symbols-outlined text-sm font-bold">
                          {generalAccuracy >= 80 ? 'trending_up' : generalAccuracy >= 60 ? 'remove' : 'trending_down'}
                        </span>
                        <span>
                          {generalAccuracy >= 80 ? 'Excelente' : generalAccuracy >= 60 ? 'Bom' : 'Atenção'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {generalAccuracy !== null
                      ? <><span className="text-slate-700 dark:text-slate-300 font-bold">
                        {generalAccuracy >= 80 ? 'Ótimo trabalho!' : generalAccuracy >= 60 ? 'Continue praticando.' : 'Foque mais nos erros.'}
                      </span> Mantenha a constância.</>
                      : <>Comece a estudar para ver suas <span className="text-slate-700 dark:text-slate-300 font-bold">estatísticas</span>.</>
                    }
                  </p>
                </div>
                <div className="mt-6 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${generalAccuracy && generalAccuracy >= 80 ? 'bg-green-500' : generalAccuracy && generalAccuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${generalAccuracy || 0}%` }}>
                  </div>
                </div>
              </section>
            </div>

            {/* Desktop: 2-column grid for Esforço/Focus. Mobile: stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Effort by Area Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold">Esforço por Área</h3>
                </div>
                <div className="rounded-2xl bg-white dark:bg-card-dark p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
                  {effortByArea.length > 0 ? (
                    effortByArea.map(item => (
                      <div key={item.area} className="group">
                        <div className="flex justify-between text-xs mb-1.5 font-bold">
                          <span>{item.area}</span>
                          <span className="text-slate-500 font-normal">{item.percentage > 0 ? `${item.percentage}%` : 'Sem atividade ainda'}</span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                          <div className="absolute h-full rounded-full bg-primary" style={{ width: `${item.percentage}%` }}></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhuma atividade registrada.</p>
                  )}
                </div>
              </section>

              {/* Focus Areas Section (NOW: Focus THEMES) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <h3 className="text-base font-bold">Áreas de Foco (Temas)</h3>
                </div>

                {focusThemes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {focusThemes.map((theme) => (
                      <div key={theme.id} className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-red-200 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={theme.name}>{theme.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{theme.specialty}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{theme.area}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            {theme.difficulty && (theme.difficulty.toLowerCase() === 'difícil' || theme.difficulty.toLowerCase() === 'dificil') && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                Difícil
                              </span>
                            )}

                            {generalAccuracy && theme.accuracy < generalAccuracy && (
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                                Abaixo da Média
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xl font-extrabold ${theme.accuracy < 60 ? 'text-red-500' : 'text-orange-500'}`}>
                            {theme.accuracy}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Acerto</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full text-center py-8 text-slate-500 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p>Nenhum tema crítico identificado.</p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-50 duration-200 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                <h3 className="font-bold text-lg dark:text-white">Sobre as Estatísticas</h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                Nesta área, você acompanha sua evolução nos estudos de forma clara e organizada.
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">analytics</span>
                    Precisão Geral
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mostra a porcentagem de acertos considerando todas as questões que você já respondeu. Ela é calculada dividindo o total de acertos pelo total de questões feitas, ajudando você a entender seu nível real de domínio dos conteúdos.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">pie_chart</span>
                    Esforço por Área
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Indica em quais especialidades você mais está se dedicando, com base na quantidade de questões resolvidas em cada uma. Quanto maior a porcentagem, maior foi seu foco naquela área.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">target</span>
                    Áreas de Foco (Temas)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Destaca os temas em que seu desempenho está mais baixo ou que exigem mais atenção, ajudando você a priorizar suas revisões.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium text-center">
                    Use essas informações para ajustar seu planejamento, reforçar pontos fracos e manter constância até a prova.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full py-3 rounded-xl font-bold text-white bg-primary hover:bg-blue-600 transition-colors shadow-lg shadow-primary/25"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
};

export default Analytics;
