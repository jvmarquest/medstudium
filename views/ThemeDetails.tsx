
import React from 'react';
import { Theme, View } from '../types';
import { Header, Navbar } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { supabase } from '../supabase';
import { useNetwork } from '../contexts/NetworkContext';
import { useUser } from '../contexts/UserContext';


interface Props {
  themeId: string | null;
  onNavigate: (view: View, themeId?: string) => void;
  onHistory: () => void;
}

const ThemeDetails: React.FC<Props> = ({ themeId, onNavigate, onHistory }) => {
  const { isOnline } = useNetwork();
  const { refreshUserData } = useUser();
  const [theme, setTheme] = React.useState<Theme | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isReviewing, setIsReviewing] = React.useState(false);
  const [newQuestions, setNewQuestions] = React.useState('');
  const [newCorrect, setNewCorrect] = React.useState('');
  const [newSelfEvaluation, setNewSelfEvaluation] = React.useState<'confiante' | 'razoavel' | 'revisar' | ''>('');
  const [reviewHistory, setReviewHistory] = React.useState<any[]>([]); // New State
  const [reviewMode, setReviewMode] = React.useState<'questions' | 'free'>('questions');
  const [confirmDominadoOpen, setConfirmDominadoOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchThemeDetails = async () => {
      if (!themeId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Fetch Theme Data
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (data) {
        setTheme({
          id: data.id,
          name: data.nome,
          specialty: data.especialidade,
          area: data.grande_area,
          accuracy: data.taxa_acerto,
          lastReview: data.ultima_revisao || 'N/A',
          nextReview: data.proxima_revisao,
          srsLevel: data.srs_level,
          difficulty: data.dificuldade as 'Fácil' | 'Médio' | 'Difícil',
          retentionRate: data.taxa_acerto,
          questionsTotal: data.total_questoes,
          questionsCorrect: data.acertos,
          imageUrl: data.image_url
        });

        // 2. Fetch Review History
        fetchHistory();
      }
      setLoading(false);
    };

    fetchThemeDetails();
  }, [themeId]);

  const fetchHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && themeId) {
      const { data: historyData } = await supabase
        .from('theme_reviews')
        .select('*')
        .eq('theme_id', themeId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (historyData) {
        setReviewHistory(historyData);
      }
    }
  };

  const handleLogReview = async () => {
    try {
      if (!theme) return;
      if (reviewMode === 'free' && !newSelfEvaluation) return;
      if (reviewMode !== 'free' && (!newQuestions || !newCorrect)) return;

      let q = 0;
      let c = 0;
      let sessionAccuracy = 0;
      let sessionDifficulty = 'Difícil';

      if (reviewMode === 'free') {
        if (newSelfEvaluation === 'confiante') {
          sessionAccuracy = 100;
          sessionDifficulty = 'Fácil';
        } else if (newSelfEvaluation === 'razoavel') {
          sessionAccuracy = 70;
          sessionDifficulty = 'Médio';
        } else {
          sessionAccuracy = 30;
          sessionDifficulty = 'Difícil';
        }
      } else {
        q = parseInt(newQuestions) || 0;
        c = parseInt(newCorrect) || 0;
        sessionAccuracy = q > 0 ? (c / q) * 100 : 0;

        if (sessionAccuracy >= 80) sessionDifficulty = 'Fácil';
        else if (sessionAccuracy >= 50) sessionDifficulty = 'Médio';
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      const todayStr = localDate.toISOString().split('T')[0];

      // 1. Find the pending review for this theme (Today or Past)
      const { data: pendingReviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('theme_id', theme.id)
        .is('data_realizada', null)
        .lte('data_prevista', todayStr)
        .order('data_prevista', { ascending: true })
        .limit(1);

      let currentReviewId = null;
      if (pendingReviews && pendingReviews.length > 0) {
        currentReviewId = pendingReviews[0].id;
      }

      // 2. Update the review to "Done"
      if (currentReviewId) {
        await supabase
          .from('reviews')
          .update({
            data_realizada: todayStr,
            taxa_acerto: sessionAccuracy,
            dificuldade_resultante: sessionDifficulty
          })
          .eq('id', currentReviewId);
      } else {
        // If no review was scheduled but user reviewed anyway, create a log?
        // For now, let's Insert a realized review for record keeping
        await supabase.from('reviews').insert({
          theme_id: theme.id,
          user_id: session.user.id, // Ensure user_id is set
          data_prevista: todayStr,
          data_realizada: todayStr,
          taxa_acerto: sessionAccuracy,
          dificuldade_resultante: sessionDifficulty
        });
      }

      // Insert Detailed History Record
      await supabase.from('theme_reviews').insert({
        user_id: session.user.id,
        theme_id: theme.id,
        total_questions: q,
        correct_answers: c,
        accuracy_percent: sessionAccuracy,
        difficulty: sessionDifficulty
      });

      // Refresh History instantly
      fetchHistory();

      // 3. Spaced Repetition Logic (SRS)
      const srsIntervals: Record<string, number[]> = {
        'Fácil': [1, 7, 30, 90, 180],
        'Médio': [1, 5, 15, 45, 90],
        'Difícil': [1, 2, 5, 10, 10]
      };

      const currentSrsLevel = theme.srsLevel || 0;
      const newSrsLevel = currentSrsLevel + 1;

      const difficultyKey = sessionDifficulty as 'Fácil' | 'Médio' | 'Difícil';
      const intervals = srsIntervals[difficultyKey] || srsIntervals['Difícil'];

      // Get interval (days). Use last interval if level exceeds array length.
      // Level 1 = Index 0 (interval=1)
      const intervalIndex = Math.min(newSrsLevel - 1, intervals.length - 1);
      const daysToAdd = intervals[Math.max(0, intervalIndex)];

      const nextDateObj = new Date();
      nextDateObj.setDate(nextDateObj.getDate() + daysToAdd);
      // Fix: Adjust for timezone offset
      nextDateObj.setMinutes(nextDateObj.getMinutes() - nextDateObj.getTimezoneOffset());
      const calculatedNextReview = nextDateObj.toISOString().split('T')[0];

      // 4. Update Theme Stats
      const newTotal = (theme.questionsTotal || 0) + q;
      const newCorrectTotal = (theme.questionsCorrect || 0) + c;
      const newRate = (reviewMode === 'free')
        ? sessionAccuracy
        : (newTotal > 0 ? Math.round((newCorrectTotal / newTotal) * 100) : 0);

      const updatePayload: any = {
        total_questoes: newTotal,
        acertos: newCorrectTotal,
        taxa_acerto: newRate,
        ultima_revisao: todayStr,
        proxima_revisao: calculatedNextReview,
        dificuldade: sessionDifficulty,
        srs_level: newSrsLevel,
        study_mode: reviewMode // Update preference
      };

      if (reviewMode === 'free') {
        updatePayload.self_evaluation = newSelfEvaluation;
      }

      const { error: updateError } = await supabase.from('themes').update(updatePayload).eq('id', theme.id);

      if (updateError) {
        console.warn('Initial update failed, trying fallback without new columns...', updateError);
        // Fallback: Try updating without the new columns (migrations might be missing)
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.study_mode;
        delete fallbackPayload.self_evaluation;

        const { error: fallbackError } = await supabase.from('themes').update(fallbackPayload).eq('id', theme.id);
        if (fallbackError) throw fallbackError;
      }

      // Update Sync Status
      await supabase
        .from('user_preferences')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', session.user.id);

      await refreshUserData(); // Trigger global update

      setIsReviewing(false);
      onNavigate(View.DASHBOARD);

    } catch (err) {
      console.error("Error logging review:", err);
    }
  };
  const confirmDominate = async () => {
    if (!theme) return;
    // Removed window.confirm, handling via modal

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      const todayStr = localDate.toISOString().split('T')[0];

      const nextDateObj = new Date();
      nextDateObj.setDate(nextDateObj.getDate() + 180);
      // Fix: Adjust for timezone offset
      nextDateObj.setMinutes(nextDateObj.getMinutes() - nextDateObj.getTimezoneOffset());
      const nextReviewDate = nextDateObj.toISOString().split('T')[0];

      await supabase.from('themes').update({
        status: 'dominado',
        dificuldade: 'Fácil',
        srs_level: 5, // Max level for Easy
        ultima_revisao: todayStr,
        proxima_revisao: nextReviewDate
      }).eq('id', theme.id);

      // Update Sync Status
      await supabase
        .from('user_preferences')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', session.user.id);

      await refreshUserData(); // Trigger global update

      onNavigate(View.DASHBOARD);
    } catch (err) {
      console.error("Error dominating theme:", err);
    }
  };

  const handleUndoReview = async () => {
    if (!theme || !reviewHistory || reviewHistory.length === 0) return;

    // 1. Check if the last review was from TODAY
    const lastReview = reviewHistory[0];
    const reviewDate = new Date(lastReview.created_at);
    const localDate = new Date();
    // Simple check: same day, month, year
    const isToday = reviewDate.getDate() === localDate.getDate() &&
      reviewDate.getMonth() === localDate.getMonth() &&
      reviewDate.getFullYear() === localDate.getFullYear();

    if (!isToday) {
      alert("Apenas revisões feitas hoje podem ser desfeitas.");
      return;
    }

    if (!confirm("Deseja desfazer a última revisão? Isso reverterá as estatísticas e agendamento.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 2. Revert Stats
      const currentTotal = theme.questionsTotal || 0;
      const currentCorrect = theme.questionsCorrect || 0;
      const prevTotal = Math.max(0, currentTotal - (lastReview.total_questions || 0));
      const prevCorrect = Math.max(0, currentCorrect - (lastReview.correct_answers || 0));

      let prevRate = 0;
      if (prevTotal > 0) {
        prevRate = Math.round((prevCorrect / prevTotal) * 100);
      } else {
        // If we undo the FIRST/ONLY review, stats might go to 0. 
        // If there was a pre-existing rate (e.g. from import), we might lose it if we just imply 0.
        // But strictly based on questions math, 0 questions = 0% accuracy usually or keep existing?
        // Let's assume 0 for safety if total is 0.
        prevRate = 0;
      }

      // 3. Revert SRS Level & Difficulty
      // We can't know for sure what the PREVIOUS difficulty was without storing it in history (we store RESULT difficulty).
      // We'll decrement SRS level. 
      // Difficulty: We'll leave it as is or try to infer? 
      // Better to check the SECOND most recent review in history.
      const secondLastReview = reviewHistory[1];
      let prevDifficulty = 'Fácil'; // Default fallback
      if (secondLastReview) {
        prevDifficulty = secondLastReview.difficulty; // Assuming this field exists and is "Fácil"/"Médio"/"Difícil"
      } else {
        // If no previous review, maybe reset to "Fácil" or keep current? 
        // Let's set to "Fácil" as default for new themes.
        prevDifficulty = 'Fácil';
      }

      const currentSrs = theme.srsLevel || 0;
      const prevSrs = Math.max(0, currentSrs - 1);


      // 4. Revert Dates
      // "Próxima Revisão" should likely be reset to TODAY (since we are undoing a review that satisfied today's requirement).
      const localDateStr = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
      // Actually we use ISO YYYY-MM-DD
      const todayISO = new Date().toISOString().split('T')[0];

      // "Última Revisão": Set to date of second last review, or NULL.
      let prevLastReviewDate = null;
      if (secondLastReview) {
        prevLastReviewDate = new Date(secondLastReview.created_at).toISOString().split('T')[0];
      }

      // 5. Update Theme
      const updatePayload: any = {
        total_questoes: prevTotal,
        acertos: prevCorrect,
        taxa_acerto: prevRate,
        srs_level: prevSrs,
        dificuldade: prevDifficulty,
        proxima_revisao: todayISO, // Make it pending again for today
        ultima_revisao: prevLastReviewDate
      };

      await supabase.from('themes').update(updatePayload).eq('id', theme.id);

      // 6. Delete from valid Reviews (Revert Status)
      // Find the review entry in 'reviews' table for today and set it to NULL (pending) or Delete?
      // Logic in handleLogReview: IF existing pending found, UPDATE it. ELSE Insert.
      // So here: Update 'reviews' where theme_id=ID and data_realizada=TODAY -> data_realizada=NULL

      await supabase
        .from('reviews')
        .update({
          data_realizada: null,
          taxa_acerto: 0, // Reset these too
          dificuldade_resultante: null
        })
        .eq('theme_id', theme.id)
        .eq('data_realizada', todayISO);


      // 7. Delete Detailed Log (theme_reviews)
      await supabase
        .from('theme_reviews')
        .delete()
        .eq('id', lastReview.id);

      // Refresh
      await refreshUserData();
      fetchHistory(); // Refresh local history
      alert("Revisão desfeita com sucesso!");
      onNavigate(View.DASHBOARD); // Go back to list to see it pending

    } catch (err) {
      console.error("Error undoing review:", err);
      alert("Erro ao desfazer.");
    }
  };



  const retentionDelta = React.useMemo(() => {
    if (!theme || !reviewHistory || reviewHistory.length === 0) return null;

    const lastReview = reviewHistory[0]; // Most recent review

    // Current state (from Theme)
    const currentTotal = theme.questionsTotal || 0;
    const currentCorrect = theme.questionsCorrect || 0;
    const currentRate = theme.retentionRate || 0;

    // State BEFORE the last review
    const prevTotal = currentTotal - (lastReview.total_questions || 0);
    const prevCorrect = currentCorrect - (lastReview.correct_answers || 0);

    // If previous total is <= 0, it means the last review was the first one (or data inconsistency)
    // In this case, we can't calculate a "change" from a previous rate.
    // However, if it's the first review, the "delta" from 0% is simply the current rate? 
    // Usually "delta" implies change from previous established performance. 
    // Let's return null if it's the first review to keep it clean, or we could show positive.
    if (prevTotal <= 0) return null;

    const prevRate = Math.round((prevCorrect / prevTotal) * 100);
    const delta = currentRate - prevRate;

    return delta;
  }, [theme, reviewHistory]);

  const handleDominateClick = () => {
    setConfirmDominadoOpen(true);
  };

  if (loading) {
    return (
      <PageLayout
        header={<Header title="Carregando..." onBack={() => onNavigate(View.DASHBOARD)} />}
        bottomNav={<Navbar currentView={View.REVIEWS} onNavigate={onNavigate} />}
      >
        <div className="flex h-64 items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      </PageLayout>
    );
  }

  if (!theme) {
    return (
      <PageLayout
        header={<Header title="Detalhes do Tema" onBack={() => onNavigate(View.DASHBOARD)} />}
        bottomNav={<Navbar currentView={View.REVIEWS} onNavigate={onNavigate} />}
      >
        <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
          <span className="material-symbols-outlined text-slate-400 text-6xl mb-4">search_off</span>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Tema não encontrado</h2>
          <p className="text-slate-500 mt-2">Não foi possível carregar os detalhes deste tema.</p>
          <button onClick={() => onNavigate(View.DASHBOARD)} className="mt-6 px-4 py-2 bg-primary text-white rounded-lg font-bold">Voltar ao Início</button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={<Header title="Detalhes do Tema" onBack={() => onNavigate(View.DASHBOARD)} onCalendar={() => onNavigate(View.PLAN)} />}
      bottomNav={<Navbar currentView={View.REVIEWS} onNavigate={onNavigate} />}
    >

      <main className="flex flex-col gap-6 p-4 px-6 w-full mx-auto">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
                  {theme.specialty}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-400">
                  {theme.area}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">{theme.name}</h1>
            </div>

            {/* Undo Button - Only if last review was today */}
            {reviewHistory.length > 0 &&
              new Date(reviewHistory[0].created_at).getDate() === new Date().getDate() && (
                <button
                  onClick={handleUndoReview}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold transition-all"
                  title="Desfazer a última revisão feita hoje"
                >
                  <span className="material-symbols-outlined text-sm">undo</span>
                  Refazer Última
                </button>
              )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-surface-highlight shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="material-symbols-outlined text-xl">calendar_clock</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">Próxima Revisão</p>
              </div>
              <div>
                <p className="text-primary text-lg font-bold leading-tight">
                  {theme.nextReview ? (() => {
                    const date = new Date(theme.nextReview);
                    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
                    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                  })() : 'Concluído'}
                </p>
                <p className="text-slate-500 text-xs font-medium">{theme.nextReview ? '' : 'Sem data'}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-surface-highlight shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="material-symbols-outlined text-xl">psychology</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">Nível SRS</p>
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">Nível {theme.srsLevel}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`size-2 rounded-full ${theme.accuracy > 70 ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                  <p className="text-xs font-medium">{theme.difficulty}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-surface-highlight p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-text-secondary text-sm font-medium">
                {theme.studyMode === 'free' ? 'Autoavaliação' : 'Taxa de Retenção'}
              </p>
              {theme.studyMode === 'free' ? (
                <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  Estudo Livre
                </span>
              ) : (
                retentionDelta !== null && retentionDelta !== 0 && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${retentionDelta > 0
                    ? 'text-green-500 bg-green-500/10'
                    : 'text-red-500 bg-red-500/10'
                    }`}>
                    <span className="material-symbols-outlined text-xs">
                      {retentionDelta > 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    <span>{retentionDelta > 0 ? '+' : ''}{retentionDelta}%</span>
                  </div>
                )
              )}
            </div>

            {theme.studyMode === 'free' ? (
              <div className="flex flex-col gap-2">
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {theme.selfEvaluation || 'Não avaliado'}
                </p>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${theme.retentionRate}%` }}></div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold leading-tight mb-4">{theme.retentionRate}%</p>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${theme.retentionRate}%` }}></div>
                </div>
              </>
            )}
          </div>


          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (!isOnline) {
                  alert("Conecte-se à internet para realizar revisões.");
                  return;
                }
                setReviewMode(theme?.studyMode || 'questions');
                setIsReviewing(true);
              }}
              className={`flex items-center justify-center rounded-xl h-12 transition-colors text-white font-bold text-sm shadow-lg shadow-blue-900/20 active:scale-95 ${!isOnline ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}>
              <span className="mr-2 material-symbols-outlined text-[20px]">play_circle</span>
              Revisar Agora
            </button>

            {isReviewing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Como foi a revisão?</h3>

                  <div className="space-y-4">
                    {/* Study Mode Toggle */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                      <button
                        onClick={() => setReviewMode('questions')}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${reviewMode === 'questions' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Por Questões
                      </button>
                      <button
                        onClick={() => setReviewMode('free')}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${reviewMode === 'free' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Estudo Livre
                      </button>
                    </div>

                    {reviewMode === 'free' ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Como você se sentiu?</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setNewSelfEvaluation('revisar')}
                            className={`h-14 rounded-xl font-bold text-sm transition-all border-2 ${newSelfEvaluation === 'revisar' ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-500' : 'bg-white dark:bg-surface-dark border-transparent text-slate-500 hover:bg-slate-50'}`}
                          >
                            Preciso Revisar
                          </button>
                          <button
                            onClick={() => setNewSelfEvaluation('razoavel')}
                            className={`h-14 rounded-xl font-bold text-sm transition-all border-2 ${newSelfEvaluation === 'razoavel' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-500' : 'bg-white dark:bg-surface-dark border-transparent text-slate-500 hover:bg-slate-50'}`}
                          >
                            Razoável
                          </button>
                          <button
                            onClick={() => setNewSelfEvaluation('confiante')}
                            className={`h-14 rounded-xl font-bold text-sm transition-all border-2 ${newSelfEvaluation === 'confiante' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-500' : 'bg-white dark:bg-surface-dark border-transparent text-slate-500 hover:bg-slate-50'}`}
                          >
                            Confiante
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Questões Feitas</label>
                          <input
                            type="number"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary font-bold"
                            value={newQuestions}
                            onChange={e => setNewQuestions(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Acertos</label>
                          <input
                            type="number"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-green-500 font-bold text-green-600"
                            value={newCorrect}
                            onChange={e => setNewCorrect(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setIsReviewing(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                    <button onClick={handleLogReview} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors">Salvar</button>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleDominateClick} className="flex items-center justify-center rounded-xl h-12 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm active:scale-95">
              <span className="mr-2 material-symbols-outlined text-[20px]">check_circle</span>
              Dominado
            </button>


            {/* Dominate Confirmation Modal */}
            {confirmDominadoOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Dominar Tema?</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                    Tem certeza que deseja marcar este tema como <span className="font-bold text-primary">Dominado</span>?
                    <br /><br />
                    Ele só aparecerá novamente para revisão daqui a 6 meses.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDominadoOpen(false)}
                      className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmDominate}
                      className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
                    >
                      Sim, Dominado
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Sessões Anteriores</h3>
            {reviewHistory.length > 0 ? (
              <div className="flex flex-col gap-3">
                {reviewHistory.map((review, index) => (
                  <div key={review.id || index} className="flex items-center justify-between p-4 bg-white dark:bg-surface-highlight rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${review.accuracy_percent >= 80 ? 'bg-green-100 text-green-600' : review.accuracy_percent >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                        <span className="material-symbols-outlined text-xl">
                          {review.accuracy_percent >= 80 ? 'check_circle' : review.accuracy_percent >= 50 ? 'remove_circle' : 'cancel'}
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white font-bold text-sm">
                          {new Date(review.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}
                        </p>
                        <p className="text-slate-500 text-xs font-medium capitalize">
                          {review.difficulty.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-extrabold ${review.accuracy_percent >= 80 ? 'text-green-600' : review.accuracy_percent >= 50 ? 'text-orange-600' : 'text-red-500'}`}>
                        {Math.round(review.accuracy_percent)}%
                      </p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Acertos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm italic bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Nenhuma revisão registrada ainda.
              </div>
            )}
          </div>
      </main >


    </PageLayout >
  );
};

export default ThemeDetails;
