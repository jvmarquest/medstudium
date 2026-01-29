import React, { useState } from 'react';
import { supabase } from '../supabase';
import { OnboardingStepLayout } from '../components/OnboardingStepLayout';
import { useUser } from '../contexts/UserContext';
import { View } from '../types';

interface OnboardingProps {
    onNavigate: (view: View) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onNavigate }) => {
    const { refreshProfile, profile } = useUser();
    const [step, setStep] = useState(0);

    const [loading, setLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    // ...
    // Note: skipping unchanged state declarations for brevity in replacement if possible, 
    // but replace_file_content requires exact context or block. 
    // Since I need to change imports and the handleFinish, I will do big chunks or separate calls.
    // Let's do imports first manually? No, I can do the import with the first chunk.

    // ... (Wait, I need to match exact lines)
    // I will use a larger chunk to cover the import and the component start.
    const [dataLoaded, setDataLoaded] = useState(false);

    // Form Data
    const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
    const [calendarDate, setCalendarDate] = useState(new Date()); // For navigation
    const [specialties, setSpecialties] = useState<string[]>(['Clínica Médica', 'Cirurgia Geral', 'Ginecologia / Obstetrícia', 'Pediatria', 'Preventiva']);
    const [studyDays, setStudyDays] = useState('5 dias');
    const [sex, setSex] = useState<'M' | 'F' | null>(null);

    // Pre-fill data from Profile
    React.useEffect(() => {
        if (profile && !dataLoaded) {
            console.log('[onboarding] pre-filling data from profile');

            if (profile.data_prova) {
                console.log("Preselect data_prova:", profile.data_prova);
                setExamDate(profile.data_prova);

                // Adjust calendar view to match exam date
                const [y, m, d] = profile.data_prova.split('-').map(Number);
                // Create date object (month is 0-indexed)
                if (y && m) {
                    // Set to the 1st of that month to avoid overflow issues (e.g. Feb 30)
                    setCalendarDate(new Date(y, m - 1, 1));
                }
            }

            if (profile.especialidades && profile.especialidades.length > 0) {
                setSpecialties(profile.especialidades);
            }

            if (profile.dias_disponiveis_semana) {
                setStudyDays(profile.dias_disponiveis_semana + ' dias');
            }

            if (profile.sexo) {
                setSex(profile.sexo as 'M' | 'F');
            }

            setDataLoaded(true);
        }
    }, [profile, dataLoaded]);


    // Let's use 'specialties' as the ordered list itself.
    const [fullName, setFullName] = useState('');


    // Custom Specialty State
    const [isAddingSpecialty, setIsAddingSpecialty] = useState(false);
    const [customSpecialty, setCustomSpecialty] = useState('');

    // --- Steps Navigation ---
    const nextStep = () => {
        if (step < 4) setStep(step + 1);
        else handleFinish();
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
        else onNavigate(View.DASHBOARD); // Or back to where they came from
    };

    // --- Logic for Step 1 (Date) ---
    // (Existing calendar logic reused)

    // --- Logic for Step 3 (Specialties) ---
    const toggleSpecialty = (spec: string) => {
        if (specialties.includes(spec)) {
            setSpecialties(specialties.filter(s => s !== spec));
        } else {
            setSpecialties([...specialties, spec]);
        }
    };




    const handleFinish = async () => {
        if (loading) return;
        setLoading(true);
        setHasError(false);
        let success = false;

        console.log('[onboarding] start');

        // Timeout helper
        const withTimeout = <T,>(promise: Promise<T>, ms: number = 12000): Promise<T> => {
            return Promise.race([
                promise,
                new Promise<T>((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout ao salvar dados. Verifique sua conexão.")), ms)
                )
            ]);
        };

        try {
            const { data: { user } } = await withTimeout(Promise.resolve(supabase.auth.getUser()));
            if (!user) {
                console.error('[onboarding] User not authenticated');
                throw new Error("User not authenticated");
            }

            console.log('[onboarding] validate inputs ok');

            const days = parseInt(studyDays) || 5;

            const priorities: Record<string, string> = {}; // Deprecated

            console.log('[onboarding] saving preferences...');

            console.log('[onboarding] === DIAGNOSTIC LOG: SAVE ATTEMPT ===');
            console.log('[onboarding] User ID:', user.id);
            console.log('[onboarding] Payload to Save:', {
                data_prova: examDate,
                dias_disponiveis_semana: days,
                especialidades: specialties,
                nome: fullName,
                sexo: sex || 'M'
            });

            // Explicitly specify onConflict: 'user_id' to ensure 1 row per user.

            // --- TRIAL & PROFILE UPDATE START ---
            // Check if user already has a trial_started_at to avoid resetting
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('trial_started_at')
                .eq('id', user.id)
                .single();

            const now = new Date();
            const profileUpdate: any = {
                onboarding_completed: true,
                onboarding_completed_at: now.toISOString()
            };

            if (!existingProfile?.trial_started_at) {
                console.log('[onboarding] Starting 7-day free trial');
                const expireDate = new Date(now);
                expireDate.setDate(expireDate.getDate() + 7);
                profileUpdate.trial_started_at = now.toISOString();
                profileUpdate.trial_expires_at = expireDate.toISOString();
            }

            // Update PROFILES table with onboarding status
            console.log('[onboarding] Updating profiles table with:', profileUpdate);
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                ...profileUpdate
            });

            if (profileError) {
                console.error('[onboarding] Error updating profiles:', profileError);
                throw profileError;
            }
            // --- PROFILE UPDATE END ---

            const { data: savedData, error: upsertError } = await withTimeout(Promise.resolve(supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    data_prova: examDate,
                    dias_disponiveis_semana: days,
                    especialidades: specialties,
                    nome: fullName,
                    sexo: sex || 'M',
                    onboarding_completed: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
                .select()
                .single()
            ));

            console.log('[onboarding] Supabase Response:', { upsertError, savedData });

            if (upsertError) {
                console.error('[onboarding] Supabase Upsert Error:', upsertError);
                alert(`Erro ao salvar preferências: ${upsertError.message} `);
                throw upsertError;
            }

            // B) Verification Fetch regarding the previous logs
            // ... (keeping verification fetch if desired for debug, but the upsert .select() already returns valid data)
            // I'll keep the logs I made before as they are useful.
            console.log('[onboarding] preferences saved ok (verified via select().single())');

            // B) Verification Fetch
            console.log('[onboarding] Verifying persistence...');
            const { data: verificationData, error: verError } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();

            console.log('[onboarding] Verification Fetch Result:', { verificationData, verError });


            console.log('[onboarding] preferences saved ok');

            // --- RECONCILIATION: Sanitize Orphaned Themes ---
            console.log('[onboarding] reconciling themes with new specialties...');
            // Set 'grande_area' to 'Não Categorizado' for themes that have an area NOT in the new list.
            if (specialties.length > 0) {
                const { error: reconciliationError } = await supabase
                    .from('themes')
                    .update({ grande_area: 'Não Categorizado' })
                    .eq('user_id', user.id)
                    .not('grande_area', 'in', `(${specialties.map(s => `"${s}"`).join(',')})`); // Using Postgres array syntax for safety if needed, or check supabase syntax support for arrays in .in()/.not()

                // Supabase .not('col', 'in', array) works for simple arrays usually. 
                // Let's rely on standard .not('grande_area', 'in', specialties).
                /*
                  NOTE: Supabase .not('col', 'in', values) expects values to be an array.
                */
                // Re-doing the call with standard syntax:
                const { error: recError } = await supabase
                    .from('themes')
                    .update({ grande_area: 'Não Categorizado' })
                    .eq('user_id', user.id)
                    .not('grande_area', 'in', specialties);

                if (recError) {
                    console.warn('[onboarding] Reconciliation warning (non-fatal):', recError);
                } else {
                    console.log('[onboarding] themes reconciled successfully');
                }
            }

            console.log('[onboarding] completed successfully');

            success = true;
        } catch (error: any) {
            console.error('[onboarding] Error saving onboarding data:', error);
            setHasError(true);

            let msg = 'Não foi possível salvar suas preferências.';
            if (error?.message) {
                msg += ` Motivo: ${error.message} `;
            } else {
                msg += ' Tente novamente.';
            }
            alert(msg);
        } finally {
            console.log('[onboarding] cleanup loading state');
            setLoading(false);
            if (success) {
                console.log('[onboarding] refreshing profile cache');
                await refreshProfile();
                console.log('[onboarding] navigate home');
                onNavigate(View.DASHBOARD);
            }
        }
    };

    // --- Renders ---

    // Welcome Step
    const renderWelcomeStep = () => (
        <div className="animate-fade-in flex flex-col items-center justify-center px-8 py-20 text-center min-h-[60vh]">
            <div className="mb-10 relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150"></div>
                <img
                    src="/logo.svg"
                    className="relative h-12 lg:h-20 w-auto shadow-2xl animate-float object-contain"
                    alt="MedStudium Logo"
                />
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Bem-vindo ao <span className="text-primary">MedStudium</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-sm leading-relaxed">
                Sua jornada para a residência médica começa agora. Vamos personalizar seu plano de estudos?
            </p>
        </div>
    );

    // Header Progress Bar
    const renderProgressBar = () => {
        const percentage = step === 0 ? 0 : (step / 4) * 100;
        return (
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
                <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${percentage}% ` }}></div>
            </div>
        );
    };

    // Step 1: Date
    const renderStep1 = () => (
        <div className="animate-fade-in px-6 py-10 max-w-md lg:max-w-7xl mx-auto w-full">
            <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
                <div>
                    <div className="px-2 mb-8">
                        <h1 className="text-slate-900 dark:text-white text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight mb-4">Quando será sua prova?</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-base lg:text-lg font-medium">Essa data define o ritmo das suas revisões inteligentes.</p>
                    </div>

                    <div className="hidden lg:flex items-start gap-4 p-6 rounded-2xl bg-primary/5 border border-primary/20">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-2xl">info</span>
                        </div>
                        <div>
                            <h4 className="text-slate-900 dark:text-white font-bold text-base">
                                {(() => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const exam = new Date(examDate);
                                    exam.setHours(0, 0, 0, 0);
                                    const diffTime = exam.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return diffDays > 0 ? `Faltam ${diffDays} dias` : diffDays === 0 ? 'A prova é hoje!' : 'Data passada';
                                })()}
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                                Com base na data selecionada ({new Date(examDate).toLocaleDateString('pt-BR')}), ajustaremos seu cronograma para cobrir todo o conteúdo.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm lg:shadow-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                            <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <div className="text-center">
                                <h3 className="text-slate-900 dark:text-white font-bold text-lg capitalize">{calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                            </div>
                            <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-7 mb-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <span key={day} className="text-center text-[11px] font-bold text-slate-400 uppercase py-2">{day}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-1">
                                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square"></div>
                                ))}
                                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toISOString().split('T')[0];
                                    const isSelected = examDate === dateStr;
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setExamDate(dateStr)}
                                            className={`aspect-square flex items-center justify-center text-sm font-medium rounded-xl ${isSelected
                                                ? 'font-bold bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20'
                                                : 'text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="lg:hidden mt-8 flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary">info</span>
                        </div>
                        <div>
                            <h4 className="text-slate-900 dark:text-white font-bold text-sm">
                                {(() => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const exam = new Date(examDate);
                                    exam.setHours(0, 0, 0, 0);
                                    const diffTime = exam.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return diffDays > 0 ? `Faltam ${diffDays} dias` : diffDays === 0 ? 'A prova é hoje!' : 'Data passada';
                                })()}
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                                Com base na data selecionada ({new Date(examDate).toLocaleDateString('pt-BR')}), ajustaremos seu cronograma para cobrir todo o conteúdo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );



    // Step 2: Specialties
    const renderStep3 = () => (
        <div className="animate-fade-in px-8 pt-12 pb-32 max-w-md lg:max-w-7xl mx-auto w-full">
            <section>
                <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl lg:text-4xl font-extrabold leading-tight">
                    Quais especialidades serão cobradas?
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-base lg:text-lg font-medium mt-4 leading-relaxed">
                    Selecione todas as áreas que fazem parte do seu edital.
                </p>
            </section>
            <section className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { label: 'Clínica Médica', icon: 'stethoscope' },
                    { label: 'Cirurgia Geral', icon: 'content_cut' },
                    { label: 'Pediatria', icon: 'child_care' },
                    { label: 'Ginecologia / Obstetrícia', icon: 'female' },
                    { label: 'Preventiva', icon: 'health_and_safety' },
                    ...specialties.filter(s => !['Clínica Médica', 'Cirurgia Geral', 'Pediatria', 'Ginecologia / Obstetrícia', 'Preventiva'].includes(s)).map(s => ({ label: s, icon: 'bookmark' }))
                ].map(item => {
                    const isSelected = specialties.includes(item.label);
                    return (
                        <button
                            key={item.label}
                            onClick={() => toggleSpecialty(item.label)}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all text-left h-full ${isSelected
                                ? 'border-2 border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-primary/50'
                                }`}
                        >
                            <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm lg:text-base">{item.label}</h3>
                            </div>
                            {isSelected ? (
                                <span className="material-symbols-outlined text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            ) : (
                                <div className="size-6 border-2 border-slate-200 dark:border-slate-700 rounded-full shrink-0"></div>
                            )}
                        </button>
                    );
                })}

                {/* Custom Specialty Input */}
                {isAddingSpecialty ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (customSpecialty.trim()) {
                                if (!specialties.includes(customSpecialty.trim())) {
                                    setSpecialties([...specialties, customSpecialty.trim()]);
                                }
                                setCustomSpecialty('');
                                setIsAddingSpecialty(false);
                            }
                        }}
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-primary bg-white dark:bg-slate-900/50 transition-all"
                    >
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">edit</span>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            value={customSpecialty}
                            onChange={(e) => setCustomSpecialty(e.target.value)}
                            placeholder="Digitando..."
                            className="flex-1 bg-transparent border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 text-sm lg:text-base"
                            onBlur={() => {
                                if (!customSpecialty.trim()) setIsAddingSpecialty(false);
                            }}
                        />
                        <button
                            type="submit"
                            className="size-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90"
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            <span className="material-symbols-outlined">check</span>
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAddingSpecialty(true)}
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group"
                    >
                        <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-2xl">add</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors text-sm lg:text-base">Outra</h3>
                        </div>
                    </button>
                )}
            </section>
        </div>
    );

    // Step 3: Availability
    const renderStep4 = () => (
        <div className="animate-fade-in flex flex-col px-8 pt-12 max-w-md lg:max-w-7xl mx-auto w-full">
            <section className="pb-8">
                <h2 className="text-slate-900 dark:text-white tracking-tight text-3xl lg:text-4xl font-extrabold leading-tight pb-3">Qual sua disponibilidade?</h2>
                <p className="text-slate-600 dark:text-slate-400 text-base lg:text-lg font-medium leading-relaxed">
                    Quantos dias por semana você pretende dedicar aos estudos?
                </p>
            </section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-32">
                {[
                    { val: '3 dias', desc: 'Ritmo leve', num: 3 },
                    { val: '4 dias', desc: 'Ritmo moderado', num: 4 },
                    { val: '5 dias', desc: 'Recomendado', num: 5 },
                    { val: '6 dias', desc: 'Ritmo intenso', num: 6 },
                    { val: '7 dias', desc: 'Total dedicação', num: 7 },
                ].map(item => {
                    const isSelected = studyDays === item.val;
                    return (
                        <button
                            key={item.val}
                            onClick={() => setStudyDays(item.val)}
                            className={`flex items-center justify-between p-5 rounded-2xl shadow-sm transition-all group ${isSelected
                                ? 'bg-white dark:bg-slate-900 border-2 border-primary shadow-lg shadow-primary/5'
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 flex items-center justify-center rounded-xl transition-colors shrink-0 ${isSelected
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 group-hover:text-primary'
                                    }`}>
                                    <span className="text-2xl font-extrabold">{item.num}</span>
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="font-bold text-lg dark:text-white truncate">{item.val}</p>
                                    <p className="text-sm text-slate-500 truncate">{item.desc}</p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected
                                ? 'border-primary bg-primary'
                                : 'border-slate-300 dark:border-slate-700 group-hover:border-primary'
                                }`}>
                                {isSelected && <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Step 4: Name Input (formerly Priorities)
    const renderStep5 = () => (
        <div className="animate-fade-in flex flex-col px-6 pt-8 max-w-md lg:max-w-xl mx-auto w-full">
            <section className="px-2 mb-8">
                <h2 className="text-slate-900 dark:text-white text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight mb-4">Como gostaria de ser chamado?</h2>
                <p className="text-slate-600 dark:text-slate-400 text-base lg:text-lg font-medium">
                    Vamos personalizar sua experiência.
                </p>
            </section>

            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
                <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full text-lg lg:text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent border-none outline-none p-4"
                    autoFocus
                />
            </div>

            <section className="mt-8 px-2">
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-3">Sexo</p>
                <div className="flex gap-4">
                    <button
                        onClick={() => setSex('M')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${sex === 'M'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-primary/50'
                            }`}
                    >
                        <span className="material-symbols-outlined">male</span>
                        <span className="font-bold">Masculino</span>
                    </button>
                    <button
                        onClick={() => setSex('F')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${sex === 'F'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-primary/50'
                            }`}
                    >
                        <span className="material-symbols-outlined">female</span>
                        <span className="font-bold">Feminino</span>
                    </button>
                </div>
            </section>

        </div>
    );

    // --- Dynamic Header & Footer per Step ---

    const renderHeader = () => {
        if (step === 0) {
            const showClose = profile?.onboarding_completed;
            return (
                <header className="bg-background-light dark:bg-background-dark shrink-0 z-10 w-full">
                    <div className="max-w-md lg:max-w-7xl mx-auto w-full px-6 lg:px-12 pt-8 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="w-12"></div>
                            <div className="flex-1 text-center">
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                    Boas-vindas
                                </span>
                            </div>
                            <div className="w-12 flex justify-end">
                                {showClose && (
                                    <button
                                        onClick={() => onNavigate(View.SETTINGS)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center size-10 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[22px]">close</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
            );
        }
        // Standardized Header Layout (Continuous Bar)
        const renderStandardHeader = (stepNum: number, percentage: number) => {
            const showClose = profile?.onboarding_completed;

            return (
                <header className="bg-background-light dark:bg-background-dark shrink-0 z-10 w-full">
                    <div className="max-w-md lg:max-w-7xl mx-auto w-full px-6 lg:px-12 pt-8 pb-4">
                        <div className="flex items-center justify-between mb-8">
                            {/* Left Slot: Back Button */}
                            <div className="w-12 flex justify-start">
                                <button
                                    onClick={prevStep}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center size-10 -ml-2 rounded-full active:scale-90 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
                                </button>
                            </div>

                            {/* Middle Slot: Step Indicator */}
                            <div className="flex-1 text-center">
                                <span className="text-[10px] lg:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                    Passo {stepNum} <span className="mx-1 opacity-50"> de </span> 4
                                </span>
                            </div>

                            {/* Right Slot: Close Button or Spacer */}
                            <div className="w-12 flex justify-end">
                                {showClose ? (
                                    <button
                                        onClick={() => onNavigate(View.SETTINGS)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center size-10 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                        title="Sair do onboarding"
                                    >
                                        <span className="material-symbols-outlined text-[22px]">close</span>
                                    </button>
                                ) : (
                                    <div className="size-10"></div>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                                className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                </header>
            );
        };

        if (step === 1) {
            // Step 1: Now standardized to Continuous Bar (25%)
            return renderStandardHeader(1, 25);
        }

        if (step === 2) {
            // Step 2: Continuous Bar (50%)
            return renderStandardHeader(2, 50);
        }

        if (step === 3) {
            // Step 3: Continuous Bar (75%)
            return renderStandardHeader(3, 75);
        }

        if (step === 4) {
            // Step 4: Now standardized to Continuous Bar (100%)
            return renderStandardHeader(4, 100);
        }
    };

    // --- Dynamic Footer per Step ---

    const renderFooter = () => {
        // Common footer wrapper
        const footerClass = "w-full p-6 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 mt-auto shrink-0 z-10";

        // Progress Dots Helper
        const renderDots = (activeStep: number) => (
            <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map(num => (
                    <div key={num} className={`h-1.5 rounded-full ${num === activeStep ? 'w-4 bg-primary' : 'w-1.5 bg-slate-300 dark:bg-slate-700'}`}></div>
                ))}
            </div>
        );

        // Step 0 Footer
        if (step === 0) {
            return (
                <footer className={footerClass}>
                    <div className="max-w-md lg:max-w-7xl mx-auto w-full flex flex-col items-center gap-6 px-8 lg:px-12">
                        <button onClick={nextStep} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
                            Começar
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                        {renderDots(0)}
                    </div>
                </footer>
            );
        }

        // Step 1 Footer
        if (step === 1) {
            return (
                <footer className={footerClass}>
                    <div className="max-w-md lg:max-w-7xl mx-auto w-full px-8 lg:px-12">
                        <button onClick={nextStep} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
                            Próximo
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 text-center mt-4">
                            Você pode alterar esta data a qualquer momento nas configurações.
                        </p>
                    </div>
                </footer>
            );
        }

        // Step 2 Footer
        if (step === 2) {
            return (
                <footer className={footerClass}>
                    <div className="max-w-md lg:max-w-7xl mx-auto w-full flex flex-col items-center gap-6 px-8 lg:px-12">
                        <button onClick={nextStep} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-primary/25">
                            Próximo
                        </button>
                        {renderDots(2)}
                    </div>
                </footer>
            );
        }

        // Step 3 Footer
        if (step === 3) {
            return (
                <footer className={footerClass}>
                    <div className="max-w-md lg:max-w-7xl mx-auto w-full flex flex-col items-center gap-6 px-8 lg:px-12">
                        <button onClick={nextStep} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/25">
                            Próximo
                        </button>
                        {renderDots(3)}
                    </div>
                </footer>
            );
        }

        // Step 4 Footer
        if (step === 4) {
            return (
                <footer className={footerClass}>
                    <div className="max-w-md lg:max-w-7xl mx-auto w-full flex flex-col items-center gap-6 px-8 lg:px-12">
                        <button
                            onClick={handleFinish}
                            disabled={loading}
                            className={`w-full h-16 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-primary/30 flex items-center justify-center gap-2 ${hasError ? 'bg-red-500' : ''}`}
                        >
                            {loading ? 'Salvando...' : 'Finalizar e Criar Plano'}
                            <span className="material-symbols-outlined">auto_awesome</span>
                        </button>
                    </div>
                </footer>
            );
        }
    };

    return (
        <OnboardingStepLayout
            header={renderHeader()}
            footer={renderFooter()}
        >
            {step === 0 && renderWelcomeStep()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep3()}
            {step === 3 && renderStep4()}
            {step === 4 && renderStep5()}
        </OnboardingStepLayout>
    );
};

export default Onboarding;
