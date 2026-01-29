import React, { useEffect, useState } from 'react';
import { View, Theme } from '../types';
import { Navbar, Header } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { supabase } from '../supabase';
import { useUser } from '../contexts/UserContext';

interface Props {
  onNavigate: (view: View, themeId?: string) => void;
  onBack: () => void;
  onHistory: () => void;
}

const Plan: React.FC<Props> = ({ onNavigate, onBack, onHistory }) => {
  const { session, profile, dataVersion } = useUser();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [filteredThemes, setFilteredThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [userSpecialties, setUserSpecialties] = useState<string[]>([]);

  // Edit State
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [editForm, setEditForm] = useState({ name: '', specialty: '', nextReview: '' });
  const [saving, setSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingThemeId, setDeletingThemeId] = useState<string | null>(null);

  // Fetch Data
  const fetchThemes = async () => {
    setLoading(true);
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;

      if (data) {
        const mappedThemes: Theme[] = data.map(t => ({
          id: t.id,
          name: t.nome,
          specialty: t.especialidade,
          area: t.grande_area,
          accuracy: t.taxa_acerto,
          lastReview: t.ultima_revisao || null,
          nextReview: t.proxima_revisao,
          srsLevel: t.srs_level,
          difficulty: t.dificuldade as 'Fácil' | 'Médio' | 'Difícil',
          retentionRate: t.taxa_acerto,
          questionsTotal: t.total_questoes,
          questionsCorrect: t.acertos,
          imageUrl: t.image_url
        }));
        setThemes(mappedThemes);
      }
    } catch (err) {
      console.error('Error fetching themes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, [session, dataVersion]);

  useEffect(() => {
    const specs = profile?.especialidades || session?.user.user_metadata?.specialties || [];
    setUserSpecialties(specs);

    if (activeFilter !== 'Todas' && !specs.includes(activeFilter)) {
      setActiveFilter('Todas');
    }
  }, [profile, session, activeFilter]);

  // Filtering & Sorting Logic
  useEffect(() => {
    let result = [...themes];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(lower) ||
        (t.specialty && t.specialty.toLowerCase().includes(lower))
      );
    }

    const normalizeText = (text: string) => {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };

    if (activeFilter !== 'Todas') {
      const normalizedFilter = normalizeText(activeFilter);
      result = result.filter(t => t.area && normalizeText(t.area) === normalizedFilter);
    }

    const getStatus = (t: Theme) => {
      if (!t.nextReview) return 'EM DIA';
      const today = new Date().toISOString().split('T')[0];
      return t.nextReview < today ? 'ATRASADO' : 'EM DIA';
    };

    const diffWeight = { 'Difícil': 3, 'Médio': 2, 'Fácil': 1, 'Falha': 0 };

    result.sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);

      if (statusA === 'ATRASADO' && statusB !== 'ATRASADO') return -1;
      if (statusA !== 'ATRASADO' && statusB === 'ATRASADO') return 1;

      const dateA = a.nextReview || '9999-12-31';
      const dateB = b.nextReview || '9999-12-31';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const wA = diffWeight[a.difficulty] || 0;
      const wB = diffWeight[b.difficulty] || 0;
      return wB - wA;
    });

    setFilteredThemes(result);
  }, [themes, searchTerm, activeFilter]);

  const handleDelete = (themeId: string) => {
    setMenuOpenId(null);
    setDeletingThemeId(themeId);
  };

  const confirmDelete = async () => {
    if (!deletingThemeId || !session) return;

    try {
      const { error } = await supabase
        .from('themes')
        .delete()
        .eq('id', deletingThemeId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      fetchThemes();
    } catch (err) {
      alert('Erro ao apagar tema.');
    } finally {
      setDeletingThemeId(null);
    }
  };

  const handleEdit = (theme: Theme) => {
    setMenuOpenId(null);
    setEditForm({
      name: theme.name,
      specialty: theme.specialty,
      nextReview: theme.nextReview || ''
    });
    setEditingTheme(theme);
  };

  const handleUpdate = async () => {
    if (!editingTheme || !session) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('themes')
        .update({
          nome: editForm.name,
          especialidade: editForm.specialty,
          proxima_revisao: editForm.nextReview || null
        })
        .eq('id', editingTheme.id)
        .eq('user_id', session.user.id);

      if (error) throw error;
      setEditingTheme(null);
      fetchThemes();
    } catch (err) {
      alert('Erro ao atualizar tema.');
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyBadge = (level: string) => {
    const colors = {
      'Fácil': 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      'Médio': 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      'Difícil': 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${colors[level as keyof typeof colors] || 'bg-slate-100 text-slate-500'}`}>
        {level}
      </span>
    );
  };

  const customHeader = (
    <div className="flex flex-col">
      <Header
        title="Plano de Estudo"
        subtitle="Sua Jornada de Aprendizado"
        onBack={onBack}
        onHistory={onHistory}
      />

      <div className="px-6 py-2 lg:py-3 w-full mx-auto">
        <label className="relative flex items-center w-full">
          <div className="absolute left-3 text-slate-400">
            <span className="material-symbols-outlined text-xl">search</span>
          </div>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border-none bg-slate-100 dark:bg-card-dark focus:ring-2 focus:ring-primary text-base placeholder:text-slate-400 transition-all outline-none"
            placeholder="Pesquisar temas..."
            type="text"
          />
        </label>
      </div>

      <div className="flex gap-2 px-6 py-3 overflow-x-auto hide-scrollbar w-full mx-auto">
        <button
          onClick={() => setActiveFilter('Todas')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-1 rounded-full px-4 text-sm font-semibold transition-colors ${activeFilter === 'Todas'
            ? 'bg-primary text-white'
            : 'bg-slate-100 dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
        >
          Todas
        </button>

        {userSpecialties.map(spec => (
          <button
            key={spec}
            onClick={() => setActiveFilter(activeFilter === spec ? 'Todas' : spec)}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-1 rounded-full px-4 text-sm font-semibold transition-colors ${activeFilter === spec
              ? 'bg-primary text-white'
              : 'bg-slate-100 dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
          >
            {spec}
          </button>
        ))}
      </div>
    </div >
  );

  return (
    <PageLayout
      header={customHeader}
      bottomNav={<Navbar currentView={View.PLAN} onNavigate={onNavigate} />}
    >
      <div className="flex flex-col gap-4 px-6 py-4 min-h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white w-full mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl mb-2">progress_activity</span>
            <p className="text-slate-500">Carregando plano...</p>
          </div>
        ) : filteredThemes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">sentiment_dissatisfied</span>
            <p className="text-slate-500 font-medium">
              {searchTerm || activeFilter !== 'Todas' ? 'Nenhum tema encontrado com este filtro.' : 'Nenhum tema cadastrado ainda.'}
            </p>
            {themes.length === 0 && (
              <button onClick={() => onNavigate(View.ADD_THEME)} className="mt-4 text-primary font-bold text-sm">Cadastrar Agora</button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Atrasados Section */}
            {filteredThemes.filter(t => {
              const today = new Date().toISOString().split('T')[0];
              return t.nextReview && t.nextReview < today;
            }).length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-1 h-5 bg-red-500 rounded-full"></span>
                    <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Atrasados</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredThemes
                      .filter(t => {
                        const today = new Date().toISOString().split('T')[0];
                        return t.nextReview && t.nextReview < today;
                      })
                      .map(theme => (
                        <div
                          key={theme.id}
                          className="relative bg-white dark:bg-card-dark rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 transition-transform active:scale-[0.98]"
                        >
                          <div className="flex-1 p-5">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 uppercase">
                                  ATRASADO
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{theme.specialty}</span>
                                {getDifficultyBadge(theme.difficulty)}
                              </div>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(menuOpenId === theme.id ? null : theme.id);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                >
                                  <span className="material-symbols-outlined">more_vert</span>
                                </button>
                                {menuOpenId === theme.id && (
                                  <div className="absolute right-0 top-8 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-10 py-1 animate-in fade-in zoom-in duration-100 origin-top-right">
                                    <button
                                      onClick={() => handleEdit(theme)}
                                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-base">edit</span> Editar
                                    </button>
                                    <button
                                      onClick={() => handleDelete(theme.id)}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-base">delete</span> Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <h3 onClick={() => onNavigate(View.THEME_DETAILS, theme.id)} className="text-lg font-bold leading-tight mb-4 cursor-pointer">{theme.name}</h3>
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                <span>Próxima: {theme.nextReview ? new Date(theme.nextReview).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' }) : 'Sem data'}</span>
                              </div>
                              <button
                                onClick={() => onNavigate(View.THEME_DETAILS, theme.id)}
                                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                              >
                                Estudar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

            {/* Em Dia Section */}
            {filteredThemes.filter(t => {
              const today = new Date().toISOString().split('T')[0];
              return !t.nextReview || t.nextReview >= today;
            }).length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-1 h-5 bg-green-500 rounded-full"></span>
                    <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Em Dia</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredThemes
                      .filter(t => {
                        const today = new Date().toISOString().split('T')[0];
                        return !t.nextReview || t.nextReview >= today;
                      })
                      .map(theme => (
                        <div
                          key={theme.id}
                          className="relative bg-white dark:bg-card-dark rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 transition-transform active:scale-[0.98]"
                        >
                          <div className="flex-1 p-5">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                                  EM DIA
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{theme.specialty}</span>
                                {getDifficultyBadge(theme.difficulty)}
                              </div>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(menuOpenId === theme.id ? null : theme.id);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                >
                                  <span className="material-symbols-outlined">more_vert</span>
                                </button>
                                {menuOpenId === theme.id && (
                                  <div className="absolute right-0 top-8 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-10 py-1 animate-in fade-in zoom-in duration-100 origin-top-right">
                                    <button
                                      onClick={() => handleEdit(theme)}
                                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-base">edit</span> Editar
                                    </button>
                                    <button
                                      onClick={() => handleDelete(theme.id)}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-base">delete</span> Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <h3 onClick={() => onNavigate(View.THEME_DETAILS, theme.id)} className="text-lg font-bold leading-tight mb-4 cursor-pointer">{theme.name}</h3>
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                <span>Próxima: {theme.nextReview ? new Date(theme.nextReview).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' }) : 'Sem data'}</span>
                              </div>
                              <button
                                onClick={() => onNavigate(View.THEME_DETAILS, theme.id)}
                                className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              >
                                Revisar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}
          </div>
        )}
      </div>

      {editingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg">Editar Tema</h3>
              <button onClick={() => setEditingTheme(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Tema</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Especialidade</label>
                <input
                  type="text"
                  value={editForm.specialty}
                  onChange={e => setEditForm({ ...editForm, specialty: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Próxima Revisão</label>
                <input
                  type="date"
                  value={editForm.nextReview}
                  onChange={e => setEditForm({ ...editForm, nextReview: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-5 pt-2 flex gap-3">
              <button
                onClick={() => setEditingTheme(null)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-blue-600 transition-colors shadow-lg shadow-primary/25 disabled:opacity-70 flex justify-center items-center"
              >
                {saving ? <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {deletingThemeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">delete</span>
              </div>
              <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Excluir Tema?</h3>
              <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                Tem certeza que deseja apagar este tema? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingThemeId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-600/20 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Plan;
