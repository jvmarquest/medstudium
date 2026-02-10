
import React, { useState, useEffect } from 'react';
import { View, Theme } from '../types';
import { Header, Navbar } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { supabase } from '../supabase';
import { useNetwork } from '../contexts/NetworkContext';
import { generateTopicIllustration } from '../services/imageService';
import { useUser } from '../contexts/UserContext';
import { useAccess, Feature } from '../lib/planAccess';
import { UpgradeModal } from '../components/UpgradeModal';

interface Props {
  onNavigate: (view: View, themeId?: string) => void;
  onBack: () => void;
  onHistory: () => void;
}

const AddTheme: React.FC<Props> = ({ onNavigate, onBack, onHistory }) => {
  console.log("AddTheme loaded");
  const { isOnline } = useNetwork();
  const { session, profile } = useUser(); // Using Context
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [area, setArea] = useState('');
  const [studyDate, setStudyDate] = useState(new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState<string>('');
  const [correct, setCorrect] = useState<string>('');
  const [studyMode, setStudyMode] = useState<'questions' | 'free'>('questions');
  const [selfEvaluation, setSelfEvaluation] = useState<'confiante' | 'razoavel' | 'revisar' | ''>('');
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { canAccess } = useAccess();

  useEffect(() => {
    // Populate areas from Profile (DB) or Session metadata (Fallback)
    const areas = profile?.especialidades || session?.user.user_metadata?.specialties || [];
    console.log('[AddTheme] Available Areas Options:', areas);
    setAvailableAreas(areas);
  }, [profile, session]);

  const [accuracy, setAccuracy] = useState(0);
  const [difficulty, setDifficulty] = useState('Difícil');
  const [status, setStatus] = useState('Estudo Inicial');

  useEffect(() => {
    if (studyMode === 'questions') {
      const t = parseInt(total) || 0;
      const c = parseInt(correct) || 0;
      const acc = t > 0 ? Math.round((c / t) * 100) : 0;
      setAccuracy(acc);

      if (acc >= 80) setDifficulty('Fácil');
      else if (acc >= 50) setDifficulty('Médio');
      else setDifficulty('Difícil');
    } else {
      // Free Mode Logic
      if (selfEvaluation === 'confiante') {
        setAccuracy(100);
        setDifficulty('Fácil');
      } else if (selfEvaluation === 'razoavel') {
        setAccuracy(70);
        setDifficulty('Médio');
      } else if (selfEvaluation === 'revisar') {
        setAccuracy(30);
        setDifficulty('Difícil');
      } else {
        setAccuracy(0);
        setDifficulty('Difícil');
      }
    }
  }, [total, correct, studyMode, selfEvaluation]);

  // Calculate Next Review Date Live for UI
  const getNextReviewDate = () => {
    // Basic Classification first (duplicate logic for preview)
    // Basic Classification first (duplicate logic for preview)
    let acc = 0;

    if (studyMode === 'questions') {
      const t = parseInt(total) || 0;
      const c = parseInt(correct) || 0;
      acc = t > 0 ? Math.round((c / t) * 100) : 0;
    } else {
      if (selfEvaluation === 'confiante') acc = 100;
      else if (selfEvaluation === 'razoavel') acc = 70;
      else if (selfEvaluation === 'revisar') acc = 30;
    }

    let diff = 'Difícil';
    if (acc >= 80) diff = 'Fácil';
    else if (acc >= 50) diff = 'Médio';

    const intervals: Record<string, number> = { 'Fácil': 7, 'Médio': 3, 'Difícil': 1 };
    const interval = intervals[diff];

    // Calc Date
    const study = new Date(studyDate + 'T00:00:00'); // Treat as local YYYY-MM-DD
    const next = new Date(study);
    next.setDate(next.getDate() + interval);

    // Retroactive Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Removed retroactive logic here too to match handleSubmit
    // if (next <= today) { ... }

    return next;
  };

  const nextReviewDateObj = getNextReviewDate();
  const nextReviewLabel = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = nextReviewDateObj;
    d.setHours(0, 0, 0, 0);

    // Simple comparison
    if (d.getTime() === tomorrow.getTime()) return 'Amanhã';
    if (d.getTime() === today.getTime()) return 'Hoje';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' });
  })();

  const handleSubmit = async () => {
    if (!name || !specialty || !area) return;
    if (studyMode === 'free' && !selfEvaluation) return; // Validate evaluation

    // --- PREMIUM GUARD: UNLIMITED TOPICS ---
    if (!canAccess(Feature.UNLIMITED_TOPICS)) {
      // Check current theme count
      const { count, error } = await supabase
        .from('themes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session?.user.id);

      // Limit updated to 10
      if (count !== null && count >= 10) {
        setShowUpgradeModal(true);
        return;
      }
    }

    const t = parseInt(total) || 0;
    const c = parseInt(correct) || 0;

    // 1. Calculate Accuracy
    let calculatedAccuracy = 0;
    let calculatedDifficulty = 'Difícil';

    if (studyMode === 'questions') {
      calculatedAccuracy = t > 0 ? Math.round((c / t) * 100) : 0;
      if (calculatedAccuracy >= 80) calculatedDifficulty = 'Fácil';
      else if (calculatedAccuracy >= 50) calculatedDifficulty = 'Médio';
    } else {
      if (selfEvaluation === 'confiante') {
        calculatedAccuracy = 100;
        calculatedDifficulty = 'Fácil';
      } else if (selfEvaluation === 'razoavel') {
        calculatedAccuracy = 70;
        calculatedDifficulty = 'Médio';
      } else if (selfEvaluation === 'revisar') {
        calculatedAccuracy = 30;
        calculatedDifficulty = 'Difícil';
      }
    }

    // 3. Calculate Review Dates
    const intervals: Record<string, number[]> = {
      'Fácil': [7, 30, 90],
      'Médio': [3, 14, 45],
      'Difícil': [1, 7, 21]
    };

    const difficultyKey = calculatedDifficulty as 'Fácil' | 'Médio' | 'Difícil';
    const selectedIntervals = intervals[difficultyKey] || intervals['Difícil'];

    // --- REPLACED LOGIC START ---
    // User Requirement: If retroactive (or calculated date <= today), set next review to Tomorrow.

    // We utilize the same logic logic as the UI preview:
    // First Interval Date
    const studyFn = new Date(studyDate + 'T00:00:00');
    const firstInterval = selectedIntervals[0];

    const theoreticalFirstReview = new Date(studyFn);
    theoreticalFirstReview.setDate(theoreticalFirstReview.getDate() + firstInterval);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let actualFirstReview = theoreticalFirstReview;
    // Removed logic that forced retroactive reviews to "Tomorrow".
    // Now we respect the calculated date (Study Date + Interval),
    // so if it falls on Today or in the Past, it will be due immediately.

    const nextReviewDate = actualFirstReview.toISOString().split('T')[0];

    // NOTE: For subsequent reviews (Review 2, 3...), usually we base them off the previous review.
    // But the current simple logic calculates them from Study Date. 
    // If Study Date was 1 year ago, Review 2 [30 days] would also be in the past.
    // For now, to keep it simple and fulfill the immediate request, we calculate valid future dates relative to NOW if needed,
    // OR just strictly filter future dates as before, but ensuring the first one is nextReviewDate.

    // Let's stick to the existing "filter future themes" logic but ensure our calculated `nextReviewDate` is the primary one.

    const reviewDates = selectedIntervals.map(days => {
      const d = new Date(studyDate + 'T00:00:00');
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    });

    // We already fixed the *first* date in `nextReviewDate`.
    // We should probably allow the system to recalculate the schedule naturally on next review.
    // So we just ensure `nextReviewDate` is set correctly in the DB theme.

    // And for the `reviews` table (scheduled reviews log), we should ideally insert this `nextReviewDate` and any subsequent valid ones.
    // The previous logic `futureReviews` might miss the 2nd/3rd review if they were also in the past.
    // If I studied 1 year ago, ALL generated dates are in the past.
    // The user wants valid study plan.
    // If 1st review is forced to tomorrow, 2nd review should be Tomorrow + Interval2? 
    // Or just 1st review triggers the next steps.
    // Let's just insert the `nextReviewDate` as the pending review.

    const todayStr = new Date().toISOString().split('T')[0];
    // Filter purely future dates from the standard calculation
    const futureReviews = reviewDates.filter(date => date >= todayStr);

    // Ensure our fixed 'nextReviewDate' is included if it's not already covered
    // Actually, `nextReviewDate` is the crucial one.
    // --- REPLACED LOGIC END ---

    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      // Insert Theme
      const dbTheme = {
        user_id: userData.user.id,
        nome: name,
        especialidade: specialty,
        grande_area: area,
        data_estudo_inicial: studyDate,
        total_questoes: t,
        acertos: c,
        taxa_acerto: calculatedAccuracy,
        dificuldade: calculatedDifficulty,
        proxima_revisao: nextReviewDate,
        srs_level: 1,
        study_mode: studyMode,
        self_evaluation: selfEvaluation || null
      };

      const { data: themeData, error: themeError } = await supabase
        .from('themes')
        .insert(dbTheme)
        .select()
        .single();

      if (themeError) {
        console.error('Error saving theme to DB:', themeError);

        // 1. Plan Limit Error (Trigger Exception)
        if (themeError.message && themeError.message.includes('Limite do plano gratuito')) {
          setShowUpgradeModal(true);
          return;
        }

        // 2. Connection Error
        if (themeError.message && (themeError.message.includes('fetch') || themeError.message.includes('connection') || !isOnline)) {
          alert('Erro de conexão. Verifique sua internet e tente novamente.');
          return;
        }

        // 3. Auth/Permission Error
        if (themeError.code === '42501' || themeError.code === 'PGRST301') {
          alert('Sessão expirada ou sem permissão. Faça login novamente.');
          return;
        }

        // 4. Other DB Errors
        alert(`Não foi possível salvar: ${themeError.message || 'Erro desconhecido'}`);
        return;
      }

      if (themeData) {
        // Insert Scheduled Reviews
        // We only really NEED to insert the NEXT review. 
        // Inserting 2nd/3rd steps now might be redundant if the algorithm changes later, but let's persist.
        // We make sure `nextReviewDate` is the first one.

        // Remove `nextReviewDate` from futureReviews to avoid duplicates if it matches
        const others = futureReviews.filter(d => d !== nextReviewDate);
        const scheduledReviews = [nextReviewDate, ...others];

        if (scheduledReviews.length > 0) {
          const reviewsToInsert = scheduledReviews.map(date => ({
            theme_id: themeData.id,
            data_prevista: date,
            taxa_acerto: null,
            dificuldade_resultante: null
          }));

          const { error: reviewsError } = await supabase
            .from('reviews')
            .insert(reviewsToInsert);

          if (reviewsError) {
            console.error("Error creating reviews:", reviewsError);
          }
        }
        // ... (rest of function unchanged)


        // Trigger Image Generation
        generateTopicIllustration(name, themeData.id).then(url => {
          console.log('Image generated for theme:', name);
        });

        // Update Sync Status
        await supabase
          .from('user_preferences')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', userData.user.id);

        // Update Local
        const newTheme: Theme = {
          id: themeData.id,
          name: themeData.nome,
          specialty: themeData.especialidade,
          area: themeData.grande_area,
          accuracy: themeData.taxa_acerto,
          lastReview: 'Hoje',
          nextReview: themeData.proxima_revisao || 'Nenhuma',
          srsLevel: themeData.srs_level,
          difficulty: themeData.dificuldade as 'Fácil' | 'Médio' | 'Difícil',
          retentionRate: themeData.taxa_acerto,
          questionsTotal: themeData.total_questoes,
          questionsCorrect: themeData.acertos,
          studyMode: themeData.study_mode,
          selfEvaluation: themeData.self_evaluation
        };

        // onSave(newTheme);
        onNavigate(View.DASHBOARD);
      }
    }
  };

  const difficultyColor = difficulty === 'Fácil' ? 'text-green-500' : difficulty === 'Médio' ? 'text-orange-500' : 'text-red-500';
  const difficultyBg = difficulty === 'Fácil' ? 'bg-green-500' : difficulty === 'Médio' ? 'bg-orange-500' : 'bg-red-500';

  const header = (
    <Header
      title="Novo Tema"
      onBack={onBack}
      onHistory={onHistory}
    />
  );

  return (
    <PageLayout
      header={header}
      bottomNav={<Navbar currentView={View.ADD_THEME} onNavigate={onNavigate} />}
    >
      <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">


        <main className="flex-1 pb-32 relative w-full max-w-md lg:max-w-3xl xl:max-w-4xl mx-auto">
          <div className="px-4 py-6 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Nome do Tema</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 px-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-400 transition-all outline-none"
                placeholder="ex: Infarto Agudo do Miocárdio"
                type="text"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Especialidade</label>
                <input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full h-14 px-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="ex: Cardiologia"
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Grande Área</label>
                <div className="relative">
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full h-14 px-4 pr-10 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary appearance-none outline-none bg-none"
                  >
                    <option value="" disabled>Selecionar</option>
                    {availableAreas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <span className="material-symbols-outlined">arrow_drop_down</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800 w-full"></div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold">Modo de Estudo</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => setStudyMode('questions')}
                  className={`py-2 rounded-lg text-sm font-bold transition-all ${studyMode === 'questions' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Por Questões
                </button>
                <button
                  onClick={() => setStudyMode('free')}
                  className={`py-2 rounded-lg text-sm font-bold transition-all ${studyMode === 'free' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Estudo Livre
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800 w-full"></div>

            <div className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Dados de Desempenho</h3>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Data do Estudo</label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={studyDate}
                    onChange={(e) => setStudyDate(e.target.value)}
                    className="w-full h-14 px-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {studyMode === 'questions' ? (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold">Total de Questões</label>
                      <input
                        className="w-full h-14 px-4 text-center text-lg font-medium rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        inputMode="numeric"
                        placeholder="0"
                        type="number"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-green-600 dark:text-green-400">Acertos</label>
                      <input
                        className="w-full h-14 px-4 text-center text-lg font-medium rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 text-green-600 dark:text-green-400 outline-none"
                        inputMode="numeric"
                        placeholder="0"
                        type="number"
                        value={correct}
                        onChange={(e) => setCorrect(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 space-y-2">
                    <label className="block text-sm font-semibold">Como você se sentiu?</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelfEvaluation('revisar')}
                        className={`h-14 rounded-xl font-bold text-sm transition-all border-2 ${selfEvaluation === 'revisar' ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-500' : 'bg-white dark:bg-surface-dark border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                        Preciso Revisar
                      </button>
                      <button
                        onClick={() => setSelfEvaluation('razoavel')}
                        className={`h-14 rounded-xl font-bold text-sm transition-all border-2 ${selfEvaluation === 'razoavel' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-500' : 'bg-white dark:bg-surface-dark border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                        Razoável
                      </button>
                      <button
                        onClick={() => setSelfEvaluation('confiante')}
                        className={`h-14 rounded-xl font-bold text-sm transition-all border-2 ${selfEvaluation === 'confiante' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-500' : 'bg-white dark:bg-surface-dark border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                        Confiante
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 relative overflow-hidden rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-xl">analytics</span>
                  <h3 className="text-base font-bold">Análise</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Dificuldade</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${difficultyColor}`}>{difficulty}</span>
                      <span className={`text-sm font-medium ${difficultyColor}/80`}>{accuracy}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className={`${difficultyBg} h-full rounded-full transition-all duration-500`} style={{ width: `${accuracy}%` }}></div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Próxima Revisão</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold capitalize">{nextReviewLabel}</span>
                    </div>
                    <span className="text-xs text-primary mt-1 font-medium">Repetição Espaçada Ativa</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="fixed bottom-[100px] left-0 right-0 px-4 z-10 w-full max-w-md mx-auto pointer-events-none">
          <button
            onClick={handleSubmit}
            disabled={!name || !specialty || !area}
            className="pointer-events-auto w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">save</span>
            Salvar Tema
          </button>
        </div>

      </div>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onNavigate={onNavigate}
        title="Limite de Temas Atingido"
        description="No plano gratuito você pode criar até 10 temas. Faça upgrade para criar ilimitados."
      />
    </PageLayout>
  );
};

export default AddTheme;
