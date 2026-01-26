
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

interface UserProfile {
    nome?: string;
    data_prova?: string;
    dias_disponiveis_semana?: number;
    especialidades?: string[];
    prioridades_por_especialidade?: Record<string, string>;
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
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    // Derived premium status
    const isPremium = React.useMemo(() => {
        if (!subscription) return false;
        const validStatus = ['active', 'lifetime'].includes(subscription.status);
        if (!validStatus) return false;

        if (subscription.status === 'active' && subscription.expires_at) {
            return new Date(subscription.expires_at) > new Date();
        }
        return true; // Lifetime or active without hard expiration (managed by stripe)
    }, [subscription]);

    const fetchProfile = useCallback(async (currentSession: Session | null) => {
        if (!currentSession?.user) {
            setProfile(null);
            setSubscription(null);
            setLoading(false);
            return;
        }

        try {
            // Fetch Profile
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', currentSession.user.id)
                .maybeSingle();

            if (data) {
                // ... (Parsing logic kept same)
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
                    data_prova: parsedDate
                };

                // Sync Name logic ...
                if (!finalProfile.nome && (currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name)) {
                    const nameToSave = currentSession.user.user_metadata.full_name || currentSession.user.user_metadata.name;
                    supabase.from('user_preferences').update({ nome: nameToSave }).eq('user_id', currentSession.user.id).then();
                    setProfile({ ...finalProfile, nome: nameToSave });
                } else {
                    setProfile(finalProfile);
                }
            } else {
                // Default Profile logic
                if (currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name) {
                    const nameToSave = currentSession.user.user_metadata.full_name || currentSession.user.user_metadata.name;
                    supabase.from('user_preferences').upsert({ user_id: currentSession.user.id, nome: nameToSave }).then();
                    setProfile({ nome: nameToSave });
                } else {
                    setProfile({});
                }
            }

            // Fetch Subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('status, plan, expires_at')
                .eq('user_id', currentSession.user.id)
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
        setDataVersion(prev => prev + 1);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
            await fetchProfile(currentSession);
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
        <UserContext.Provider value={{ profile, loading, refreshProfile, session, dataVersion, refreshUserData, subscription, isPremium }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
