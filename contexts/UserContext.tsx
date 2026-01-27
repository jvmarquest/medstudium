
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';
import { isUserPremium } from '../lib/premiumUtils';

interface UserProfile {
    nome?: string;
    data_prova?: string;
    dias_disponiveis_semana?: number;
    especialidades?: string[];
    prioridades_por_especialidade?: Record<string, string>;
    onboarding_completed?: boolean;
    plan?: 'free' | 'monthly' | 'lifetime';
    subscription_status?: string;
    is_premium?: boolean;
    trial_expires_at?: string | null;
    trial_started_at?: string | null;
    current_period_end?: string | null;
}

interface Subscription {
    status: string;
    plan: string;
    expires_at: string | null;
}

interface UserContextData {
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    session: Session | null;
    dataVersion: number;
    refreshUserData: () => Promise<void>;
    subscription: Subscription | null;
    isPremium: boolean;
    trialExpiresAt: string | null;
}

const UserContext = createContext<UserContextData>({
    profile: null,
    loading: true,
    refreshProfile: async () => { },
    session: null,
    dataVersion: 0,
    refreshUserData: async () => { },
    subscription: null,
    isPremium: false,
    trialExpiresAt: null,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);

    // Derived premium status
    // Derived premium status
    // Derived premium status
    const isPremium = React.useMemo(() => {
        // Use Centralized Helper
        const result = isUserPremium(profile);
        console.log("[UserContext] Premium Check (Helper):", { result, plan: profile?.plan });
        return result;
    }, [profile]);

    const fetchProfile = useCallback(async (currentSession: Session | null) => {
        if (!currentSession?.user) {
            setProfile(null);
            setSubscription(null);
            setTrialExpiresAt(null);
            setLoading(false);
            return;
        }

        try {
            const userId = currentSession.user.id;

            // 1. Fetch Core Profile
            let { data: coreProfile, error: profileError } = await supabase
                .from('profiles')
                .select('trial_expires_at, trial_started_at, onboarding_completed, plan, subscription_status, is_premium, current_period_end')
                .eq('id', userId)
                .maybeSingle() as any;

            // 2. Auto-create Profile if missing
            if (!coreProfile && !profileError) {
                console.log('[UserContext] Profile missing, creating default...');
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        onboarding_completed: false,
                        // trial logic handled elsewhere or triggers
                    })
                    .select('trial_expires_at, onboarding_completed')
                    .single();

                if (createError) {
                    console.error('[UserContext] Failed to create profile:', createError);
                    // If we can't create a profile, it might be an orphaned session (user deleted).
                    // Verify auth status against server to be sure.
                    const { error: authError } = await supabase.auth.getUser();
                    if (authError) {
                        console.warn('[UserContext] User invalid on server, signing out.');
                        await supabase.auth.signOut();
                        setSession(null);
                        return;
                    }
                } else {
                    coreProfile = newProfile;
                }
            }

            // 3. Update State from Core Profile
            if (coreProfile?.trial_expires_at) {
                setTrialExpiresAt(coreProfile.trial_expires_at);
            } else {
                setTrialExpiresAt(null);
            }

            const isOnboardingCompleted = coreProfile?.onboarding_completed === true;

            // 4. Fetch User Preferences (Legacy/Extended Data)
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (data) {
                // ... (Parsing logic)
                let parsedSpecialties: string[] = [];
                if (Array.isArray(data.especialidades)) {
                    parsedSpecialties = data.especialidades;
                } else if (typeof data.especialidades === 'string') {
                    try {
                        parsedSpecialties = JSON.parse(data.especialidades);
                        if (!Array.isArray(parsedSpecialties)) parsedSpecialties = [];
                    } catch (e) {
                        parsedSpecialties = [];
                    }
                }

                let parsedDate = data.data_prova;
                if (parsedDate && parsedDate.includes('T')) {
                    parsedDate = parsedDate.split('T')[0];
                }

                const finalProfile = {
                    ...data,
                    especialidades: parsedSpecialties,
                    data_prova: parsedDate,
                    onboarding_completed: isOnboardingCompleted,
                    // CRITICAL FIX: Merge Core Profile Data (Plan, Status)
                    // otherwise these are lost if user_preferences exists
                    plan: coreProfile?.plan || 'free',
                    subscription_status: coreProfile?.subscription_status || 'free',
                    is_premium: coreProfile?.is_premium || false,
                    current_period_end: coreProfile?.current_period_end
                };

                // Sync Name logic ...
                if (!finalProfile.nome && (currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name)) {
                    const nameToSave = currentSession.user.user_metadata.full_name || currentSession.user.user_metadata.name;
                    supabase.from('user_preferences').update({ nome: nameToSave }).eq('user_id', userId).then();
                    setProfile({ ...finalProfile, nome: nameToSave });
                } else {
                    setProfile(finalProfile);
                }
            } else {
                // Default Profile logic
                const defaultProfile: UserProfile = {
                    onboarding_completed: isOnboardingCompleted,
                    plan: coreProfile?.plan as any || 'free',
                    subscription_status: coreProfile?.subscription_status || 'free',
                    is_premium: coreProfile?.is_premium || false,
                    trial_expires_at: coreProfile?.trial_expires_at,
                    trial_started_at: coreProfile?.trial_started_at,
                    current_period_end: coreProfile?.current_period_end
                };

                if (currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name) {
                    const nameToSave = currentSession.user.user_metadata.full_name || currentSession.user.user_metadata.name;
                    supabase.from('user_preferences').upsert({ user_id: userId, nome: nameToSave }).then();
                    defaultProfile.nome = nameToSave;
                }
                setProfile(defaultProfile);
            }

            // 5. Fetch Subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('status, plan, expires_at')
                .eq('user_id', userId)
                .maybeSingle();

            if (subData) {
                setSubscription(subData);
            } else {
                setSubscription(null);
            }

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const [dataVersion, setDataVersion] = useState(0);

    const refreshUserData = useCallback(async () => {
        setLoading(true); // Force loading state for UI feedback
        setDataVersion(prev => prev + 1);
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
                await fetchProfile(currentSession);
            } else {
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    }, [fetchProfile]);

    const refreshProfile = async () => {
        await refreshUserData();
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            fetchProfile(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            fetchProfile(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    return (
        <UserContext.Provider value={{ profile, loading, refreshProfile, session, dataVersion, refreshUserData, subscription, isPremium, trialExpiresAt }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
