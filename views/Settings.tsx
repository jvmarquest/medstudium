
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { View } from '../types';
import { Navbar, Header } from '../components/Layout';
import { PageLayout } from '../components/PageLayout';
import { useUser } from '../contexts/UserContext';
import { SubscriptionStatusCard } from '../components/SubscriptionStatusCard';

interface Props {
  onNavigate: (view: View) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Settings: React.FC<Props> = ({ onNavigate, isDarkMode, onToggleTheme }) => {
  const { profile, refreshProfile } = useUser(); // De-structure profile here

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [tempName, setTempName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Priority: Profile (user_preferences) -> Auth Metadata
    if (profile?.nome) {
      setDisplayName(profile.nome);
    } else {
      const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.user_metadata?.full_name) {
          setDisplayName(session.user.user_metadata.full_name);
        }
      };
      fetchData();
    }
  }, [profile]);

  const handleEditProfile = () => {
    setTempName(displayName);
    setIsEditingProfile(true);
  };

  // Specialties Logic
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [addingSpec, setAddingSpec] = useState(false);
  const [specialtyToRemove, setSpecialtyToRemove] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (profile?.especialidades) {
      setSpecialties(profile.especialidades);
    }
  }, [profile]);

  const handleAddSpecialty = async () => {
    if (!newSpecialty.trim()) return;
    const cleanSpec = newSpecialty.trim();

    if (specialties.some(s => s.toLowerCase() === cleanSpec.toLowerCase())) {
      alert('Esta especialidade já existe.');
      return;
    }

    setAddingSpec(true);
    const updatedSpecialties = [...specialties, cleanSpec];

    // Optimistic Update
    setSpecialties(updatedSpecialties);
    setNewSpecialty('');

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Use JSON.stringify explicitly if strictly needed, but Supabase handles array columns automatically if defined as such.
      // Based on UserContext, it seems it might be stored as JSON string or array.
      // Code in UserContext tries to parse JSON, implying it might be stored as text/json.
      // Let's safe-guard by checking existing logic or just sending the array. 
      // Best bet: send array, Supabase handles it if column is jsonb/array.
      // If it was stored as string locally in legacy, UserContext handles it.
      // We will send the array directly.
      const { error } = await supabase
        .from('user_preferences')
        .update({ especialidades: updatedSpecialties })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error adding specialty:', error);
        alert('Erro ao salvar especialidade.');
        setSpecialties(specialties); // Revert
      } else {
        await refreshProfile();
      }
    }
    setAddingSpec(false);
  };

  const executeRemoveSpecialty = async () => {
    if (!specialtyToRemove) return;
    const specToRemove = specialtyToRemove;
    setSpecialtyToRemove(null);

    const updatedSpecialties = specialties.filter(s => s !== specToRemove);
    setSpecialties(updatedSpecialties); // Optimistic

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ especialidades: updatedSpecialties })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing specialty:', error);
        setSpecialties(specialties); // Revert
      } else {
        await refreshProfile();
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!tempName.trim()) return;
    setLoading(true);

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: tempName }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: dbError } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, nome: tempName });

      if (dbError) console.error('Error updating preferences:', dbError);
    }

    if (authError) {
      alert('Erro ao atualizar perfil.');
    } else {
      // alert('Perfil atualizado com sucesso!'); // Removed as requested
      setDisplayName(tempName);
      await refreshProfile(); // Call refreshProfile after successful update
      setIsEditingProfile(false);
    }
    setLoading(false);
  };


  const handleResetApp = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        console.log('Starting app reset for user:', user.id);

        // 1. Fetch user's theme IDs to ensure we clean up all related data strictly by relation
        const { data: userThemes, error: fetchError } = await supabase
          .from('themes')
          .select('id')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        const themeIds = userThemes?.map(t => t.id) || [];

        if (themeIds.length > 0) {
          console.log(`Found ${themeIds.length} themes to delete.`);

          // 2. Delete ALL dependencies using theme_ids
          // 2a. Delete history (theme_reviews)
          const { error: historyError } = await supabase
            .from('theme_reviews')
            .delete()
            .in('theme_id', themeIds);

          if (historyError) {
            console.error('Error deleting theme_reviews:', historyError);
            throw historyError;
          }

          // 2b. Delete revisions (reviews)
          const { error: reviewsError } = await supabase
            .from('reviews')
            .delete()
            .in('theme_id', themeIds);

          if (reviewsError) {
            console.error('Error deleting reviews:', reviewsError);
            throw reviewsError;
          }

          // 2c. Delete themes
          const { error: themesError } = await supabase
            .from('themes')
            .delete()
            .in('id', themeIds);

          if (themesError) {
            console.error('Error deleting themes:', themesError);
            throw themesError;
          }
        } else {
          console.log('No themes found to delete.');
        }

        // 3. Reset preferences
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .update({
            onboarding_completed: false,
            especialidades: []
          })
          .eq('user_id', user.id);

        if (prefsError) {
          console.error('Error updating preferences:', prefsError);
          throw prefsError;
        }

        console.log('App reset successful. Refreshing profile...');
        await refreshProfile();
        setIsResetting(false);
        console.log('Navigating to onboarding...');
        onNavigate(View.ONBOARDING);

      } catch (err: any) {
        console.error('Error resetting app:', err);
        alert(`Erro ao resetar aplicativo: ${err.message || 'Erro desconhecido'}`);
      }
    }
    setLoading(false);
  };

  const header = (
    <Header title="Configurações" onBack={() => onNavigate(View.DASHBOARD)} onCalendar={() => onNavigate(View.PLAN)} />
  );

  return (
    <PageLayout
      header={header}
      bottomNav={<Navbar currentView={View.SETTINGS} onNavigate={onNavigate} />}
    >
      <div className="flex flex-col gap-6 p-4 max-w-md lg:max-w-4xl xl:max-w-5xl mx-auto w-full">

        {/* Profile */}
        <div>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 pb-2 pt-4">Perfil</h3>
          <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <p className="font-medium">Nome de Exibição</p>
                  <p className="text-xs text-slate-500">{displayName || 'Não definido'}</p>
                </div>
              </div>
              <button
                onClick={handleEditProfile}
                className="text-primary text-xs font-bold hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Status - NEW SECTION */}
        <SubscriptionStatusCard onNavigate={onNavigate} />

        {/* Specialties */}
        <div>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 pb-2 pt-4">Grandes Áreas</h3>
          <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-800 p-4 gap-4">

            <div className="flex flex-wrap gap-2">
              {specialties.map(spec => (
                <div key={spec} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>{spec}</span>
                  <button
                    onClick={() => setSpecialtyToRemove(spec)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
              {specialties.length === 0 && (
                <span className="text-slate-400 text-sm italic py-1">Nenhuma grande área cadastrada.</span>
              )}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSpecialty()}
                placeholder="Adicionar grande área..."
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                onClick={handleAddSpecialty}
                disabled={!newSpecialty.trim() || addingSpec}
                className="bg-primary hover:bg-primary-dark text-white rounded-lg px-3 py-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingSpec ? (
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">add</span>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Account Actions */}
        <div>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 pb-2 pt-4">Conta</h3>
          <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            <button
              onClick={async () => {
                console.log('[profile] refazer onboarding clicked');
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { error } = await supabase
                    .from('user_preferences')
                    .update({
                      onboarding_completed: false
                    })
                    .eq('user_id', user.id);

                  if (error) {
                    console.error('[profile] Error resetting onboarding:', error);
                    alert('Erro ao resetar onboarding. Tente novamente.');
                    return;
                  }

                  console.log('[profile] onboarding_completed set to false');
                  console.log('[profile] redirecting to onboarding');
                  onNavigate(View.ONBOARDING);
                }
              }}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <span className="material-symbols-outlined">restart_alt</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900 dark:text-white">Refazer Onboarding</p>
                  <p className="text-xs text-slate-500">Reinicia o tutorial de boas-vindas</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => setIsResetting(true)}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 flex items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <span className="material-symbols-outlined">delete_forever</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-red-600">Resetar Tudo</p>
                  <p className="text-xs text-slate-500">Apaga dados e reinicia do zero</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                // App.tsx handles state change
              }}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 flex items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <span className="material-symbols-outlined">logout</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-red-600">Sair</p>
                  <p className="text-xs text-slate-500">Encerrar sessão</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 pb-2 pt-4">Aparência</h3>
          <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="size-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  <span className="material-symbols-outlined">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
                </div>
                <p className="font-medium">Modo Escuro</p>
              </div>
              <button
                onClick={onToggleTheme}
                className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${isDarkMode ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Editing Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold mb-4">Editar Perfil</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Specialty Removal Confirmation Modal */}
        {specialtyToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">delete</span>
                </div>
                <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Remover Grande Área?</h3>
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                  Você tem certeza que deseja remover <span className="font-bold text-slate-800 dark:text-slate-200">"{specialtyToRemove}"</span>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSpecialtyToRemove(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeRemoveSpecialty}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-600/20 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset App Confirmation Modal */}
        {isResetting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
                </div>
                <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Resetar o Aplicativo?</h3>
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                  Esta ação é irreversível. Todas as suas revisões, temas e progressos serão apagados permanentemente.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsResetting(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResetApp}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-600/20 transition-colors disabled:opacity-50 flex justify-center"
                  >
                    {loading ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
};

export default Settings;
