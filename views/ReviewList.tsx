import React, { useEffect, useState } from 'react';
import { View, Theme } from '../types';
import { Navbar, Header } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { supabase } from '../supabase';
import { useUser } from '../contexts/UserContext';

interface Props {
  onNavigate: (view: View, themeId?: string) => void;
}

const ReviewList: React.FC<Props> = ({ onNavigate }) => {
  const { profile, session, dataVersion, refreshUserData } = useUser();
  const [reviewThemes, setReviewThemes] = useState<Theme[]>([]);
  const [tomorrowThemes, setTomorrowThemes] = useState<Theme[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, remaining: 0 });
  const [userName, setUserName] = useState('Dr. Silva');
  const [greeting, setGreeting] = useState('Bom dia');

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [reviewForm, setReviewForm] = useState({ questions: '', correct: '' });
  const [saving, setSaving] = useState(false);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Bom dia');
    else if (hour >= 12 && hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  };

  const fetchDailyData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fix: Use Local Time for "Today"
    const localDate = new Date();
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const todayStr = localDate.toISOString().split('T')[0];

    // Calculate Tomorrow
    const tomorrowDate = new Date(localDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    // 2. Fetch Remaining Themes (Scheduled for Today or Past)
    const { data: themesData } = await supabase
      .from('themes')
      .select('*')
      .eq('user_id', session.user.id)
      .lte('proxima_revisao', todayStr); // Include overdue


    // 2b. Fetch Themes Scheduled for Tomorrow
    const { data: tomorrowData } = await supabase
      .from('themes')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('proxima_revisao', tomorrowStr);

    // 2c. Fetch Themes UPDATED Today (Completed Reviews)
    // We already have the count, but we need the actual theme data for the UI
    const { data: reviewsToday } = await supabase
      .from('reviews')
      .select('theme_id')
      .eq('user_id', session.user.id)
      .eq('data_realizada', todayStr);

    let reviewedThemeIds: string[] = [];
    if (reviewsToday && reviewsToday.length > 0) {
      reviewedThemeIds = reviewsToday.map((r: any) => r.theme_id);
    }

    let reviewedThemesData: any[] = [];
    if (reviewedThemeIds.length > 0) {
      const { data: themes } = await supabase
        .from('themes')
        .select('*')
        .in('id', reviewedThemeIds);
      if (themes) reviewedThemesData = themes;
    }

    const mapTheme = (t: any) => ({
      id: t.id,
      name: t.nome,
      specialty: t.especialidade,
      area: t.grande_area,
      accuracy: t.taxa_acerto,
      lastReview: t.ultima_revisao || null,
      nextReview: t.proxima_revisao,
      srsLevel: t.srs_level || 0,
      difficulty: t.dificuldade as 'Fácil' | 'Médio' | 'Difícil',
      retentionRate: t.taxa_acerto,
      questionsTotal: t.total_questoes,
      questionsCorrect: t.acertos,
      imageUrl: t.image_url
    });

    let remainingThemes: Theme[] = [];
    if (themesData) {
      remainingThemes = themesData.map(mapTheme);
    }

    let reviewedThemesList: Theme[] = [];
    if (reviewedThemesData) {
      reviewedThemesList = reviewedThemesData.map(mapTheme).map(t => ({ ...t, isReviewed: true }));
    }

    // Filter out potential duplicates if a theme is somehow in both lists (shouldn't happen with correct logic but safe to do)
    // Actually, if a theme was reviewed today, it's proxima_revisao is likely future, so it won't be in remainingThemes (lte today).
    // So distinct lists should remain distinct.

    const allTodayThemes = [...remainingThemes, ...reviewedThemesList];

    let tomorrowThemesList: Theme[] = []; // Process tomorrow data
    if (tomorrowData) {
      tomorrowThemesList = tomorrowData.map(mapTheme);
    }

    const completed = reviewedThemesList.length; // Use actual list length
    const remaining = remainingThemes.length;
    const total = completed + remaining;

    setStats({ total, completed, remaining });
    setReviewThemes(allTodayThemes); // Show ALL themes for today
    setTomorrowThemes(tomorrowThemesList); // Set State

    // 3. User Name from Context
    const formatName = (fullName: string) => {
      const cleanName = fullName.replace(/^(Dr\.|Dra\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim();
      const parts = cleanName.split(/\s+/);
      if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) return 'Dr.';
      if (parts.length >= 2) return `Dr. ${parts[0]} ${parts[1]}`;
      return `Dr. ${parts[0]}`;
    };

    let finalName = 'Dr.';
    if (profile?.nome) finalName = formatName(profile.nome);
    else if (session?.user?.user_metadata?.full_name) finalName = formatName(session.user.user_metadata.full_name);
    else if (session?.user?.user_metadata?.name) finalName = formatName(session.user.user_metadata.name);

    setUserName(finalName);
  };

  useEffect(() => {
    fetchDailyData();
    updateGreeting();
  }, [profile, session, dataVersion]);

  const openReviewModal = (theme: Theme) => {
    setActiveTheme(theme);
    setReviewForm({ questions: '', correct: '' });
    setReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (!activeTheme || !reviewForm.questions || !reviewForm.correct) return;
    setSaving(true);

    try {
      const q = parseInt(reviewForm.questions);
      const c = parseInt(reviewForm.correct);

      if (isNaN(q) || isNaN(c) || q <= 0 || c < 0 || c > q) {
        alert("Por favor, insira valores válidos.");
        setSaving(false);
        return;
      }

      const accuracy = (c / q) * 100;
      let difficulty = 'Médio';
      if (accuracy >= 80) difficulty = 'Fácil';
      if (accuracy < 50) difficulty = 'Difícil';

      // --- SRS Logic (User Defined) ---
      // Rule 2 & 3: Level increases after review. First interval was 1d (Level 1).
      // Arrays are 1-based index (index 0 = level 1, index 1 = level 2...)

      const srsIntervals: Record<string, number[]> = {
        'Fácil': [1, 7, 30, 90, 180],
        'Médio': [1, 5, 15, 45, 90],
        'Difícil': [1, 2, 5, 10, 10]
      };

      const currentLevel = activeTheme.srsLevel || 0;
      const newLevel = currentLevel + 1;

      const difficultyKey = difficulty as 'Fácil' | 'Médio' | 'Difícil';
      const intervals = srsIntervals[difficultyKey] || srsIntervals['Difícil'];

      // Level 1 = Index 0. Level 2 = Index 1.
      // Cap at max length
      const intervalIndex = Math.min(newLevel - 1, intervals.length - 1);
      const daysToAdd = intervals[Math.max(0, intervalIndex)];

      const nextDate = new Date(); // Current local date
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      // Fix: Adjust for timezone offset
      nextDate.setMinutes(nextDate.getMinutes() - nextDate.getTimezoneOffset());
      const nextReviewStr = nextDate.toISOString().split('T')[0];

      const localDate = new Date();
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      const todayStr = localDate.toISOString().split('T')[0];

      // Insert Review Record (Legacy/Summary)
      await supabase.from('reviews').insert({
        theme_id: activeTheme.id,
        user_id: session?.user.id,
        data_prevista: activeTheme.nextReview || todayStr,
        data_realizada: todayStr,
        taxa_acerto: accuracy,
        dificuldade_resultante: difficulty
      });

      // Insert Detailed History Record
      await supabase.from('theme_reviews').insert({
        user_id: session?.user.id,
        theme_id: activeTheme.id,
        total_questions: q,
        correct_answers: c,
        accuracy_percent: accuracy,
        difficulty: difficulty
      });

      // Update Theme Stats
      const newTotal = (activeTheme.questionsTotal || 0) + q;
      const newCorrect = (activeTheme.questionsCorrect || 0) + c;
      const newAccuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;

      await supabase.from('themes').update({
        ultima_revisao: todayStr,
        proxima_revisao: nextReviewStr,
        srs_level: newLevel,
        taxa_acerto: newAccuracy,
        total_questoes: newTotal,
        acertos: newCorrect,
        dificuldade: difficulty // Update current difficulty status
      }).eq('id', activeTheme.id);

      // Refresh
      setReviewModalOpen(false);
      await refreshUserData(); // Trigger global update

    } catch (err) {
      console.error('Error saving review:', err);
      alert('Erro ao salvar revisão.');
    } finally {
      setSaving(false);
    }
  };


  // Calculate Progress
  const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const minsRemaining = stats.remaining * 10;
  const now = new Date();
  now.setMinutes(now.getMinutes() + minsRemaining);
  const finishTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const header = (
    <Header title="Revisões Diárias" subtitle={`${greeting}, ${userName}`} onCalendar={() => onNavigate(View.PLAN)} />
  );

  return (
    <PageLayout
      header={header}
      bottomNav={<Navbar currentView={View.REVIEWS} onNavigate={onNavigate} />}
    >
      <div className="flex flex-col gap-6 p-4 max-w-md lg:max-w-6xl xl:max-w-7xl mx-auto w-full relative">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <p className="text-base font-bold">Seu Progresso</p>
            <p className="text-slate-500 text-sm font-medium">{stats.completed}/{stats.total} Revisados</p>
          </div>
          <div className="rounded-full bg-slate-200 dark:bg-[#324467] overflow-hidden h-3">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percentage}%` }}></div>
          </div>
          {stats.remaining === 0 && (
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              Tudo pronto por hoje!
            </p>
          )}
        </div>

        {/* Desktop: 2-column grid for Hoje/Amanhã. Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
          {/* Left Column: HOJE */}
          <div className="flex flex-col gap-3">
            {/* SEÇÃO: HOJE */}
            <div className="flex items-center gap-2 px-1 mt-2">
              <span className="w-1 h-5 bg-primary rounded-full"></span>
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Hoje</h2>
            </div>

            {reviewThemes.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhuma revisão programada para hoje.
              </div>
            )}

            {reviewThemes.map(theme => (
              <div
                key={theme.id}
                className={`flex flex-col bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden ${(theme as any).isReviewed ? 'opacity-75' : ''
                  }`}
              >
                <div className="p-5 flex flex-col gap-1 cursor-pointer" onClick={() => onNavigate(View.THEME_DETAILS, theme.id)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${(theme as any).isReviewed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-primary/10 text-primary'}`}>
                      {(theme as any).isReviewed ? 'Concluído' : 'Para Hoje'}
                    </span>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">{theme.specialty}</p>
                  </div>
                  <h3 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">{theme.name}</h3>
                </div>
                <div className="px-5 pb-5 pt-2 flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <span className="material-symbols-outlined text-[18px]">history</span>
                      <span>
                        {theme.lastReview
                          ? `Última: ${new Date(theme.lastReview).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`
                          : 'Primeira revisão'}
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate(View.THEME_DETAILS, theme.id)}
                      className="text-primary text-sm font-bold hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                    >
                      Ver Detalhes
                    </button>
                  </div>

                  {(theme as any).isReviewed ? (
                    <button
                      disabled
                      className="w-full h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                      Revisado
                    </button>
                  ) : (
                    <button
                      onClick={() => openReviewModal(theme)}
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">play_circle</span>
                      Revisar Tema
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: AMANHÃ */}
          <div className="flex flex-col gap-3">
            {/* SEÇÃO: AMANHÃ */}
            {/* SEÇÃO: AMANHÃ */}
            <div className="flex items-center gap-2 px-1 mt-6">
              <span className="w-1 h-5 bg-indigo-400 rounded-full"></span>
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Amanhã</h2>
            </div>

            {tomorrowThemes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum estudo agendado para amanhã.
              </div>
            ) : (
              tomorrowThemes.map(theme => (
                <div
                  key={theme.id}
                  className="flex flex-col bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden opacity-90 hover:opacity-100 transition-opacity"
                >
                  <div className="p-5 flex flex-col gap-1 cursor-pointer" onClick={() => onNavigate(View.THEME_DETAILS, theme.id)}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                        Amanhã
                      </span>
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">{theme.specialty}</p>
                    </div>
                    <h3 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">{theme.name}</h3>
                  </div>
                  <div className="px-5 pb-5 pt-2 flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span className="material-symbols-outlined text-[18px]">event</span>
                        <span>
                          Agendado para Amanhã
                        </span>
                      </div>
                      <button
                        onClick={() => onNavigate(View.THEME_DETAILS, theme.id)}
                        className="text-slate-500 text-sm font-bold hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </div>

                    {/* Disabled Review Button for Tomorrow */}
                    <button
                      disabled
                      className="w-full h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">lock_clock</span>
                      Disponível Amanhã
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Review Modal */}
        {reviewModalOpen && activeTheme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{activeTheme.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Registro de Desempenho</p>
                </div>
                <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Questões Realizadas</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary font-bold text-lg"
                    value={reviewForm.questions}
                    onChange={e => setReviewForm({ ...reviewForm, questions: e.target.value })}
                    placeholder="Ex: 10"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Acertos</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-green-500 font-bold text-lg text-green-600"
                    value={reviewForm.correct}
                    onChange={e => setReviewForm({ ...reviewForm, correct: e.target.value })}
                    placeholder="Ex: 8"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveReview}
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors flex justify-center items-center"
                >
                  {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Concluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default ReviewList;
