
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

interface UserContextData {
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    session: Session | null;
    dataVersion: number;
    refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextData>({
    profile: null,
    loading: true,
    refreshProfile: async () => { },
    session: null,
    dataVersion: 0,
    refreshUserData: async () => { },
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (currentSession: Session | null) => {
        if (!currentSession?.user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', currentSession.user.id)
                .single();

            if (data) {
                // --- Safe Types Parsing ---

                // 1. Specialties
                let parsedSpecialties: string[] = [];
                if (Array.isArray(data.especialidades)) {
                    parsedSpecialties = data.especialidades;
                } else if (typeof data.especialidades === 'string') {
                    try {
                        parsedSpecialties = JSON.parse(data.especialidades);
                        if (!Array.isArray(parsedSpecialties)) parsedSpecialties = [];
                    } catch (e) {
                        console.warn('[UserContext] Failed to parse specialties JSON', e);
                        parsedSpecialties = [];
                    }
                }

                // 2. Exam Date
                let parsedDate = data.data_prova;
                if (parsedDate) {
                    // Try to standardize to YYYY-MM-DD if in ISO format
                    if (parsedDate.includes('T')) {
                        parsedDate = parsedDate.split('T')[0];
                    }
                }

                const finalProfile = {
                    ...data,
                    especialidades: parsedSpecialties,
                    data_prova: parsedDate
                };

                console.log('[UserContext] === DIAGNOSTIC LOG: BOOTSTRAP ===');
                console.log('[UserContext] Raw Data:', data);
                console.log('[UserContext] Parsed Specialties:', finalProfile.especialidades);
                console.log('[UserContext] Parsed Exam Date:', finalProfile.data_prova);

                // Check if name is missing but metadata exists
                if (!finalProfile.nome && (currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name)) {
                    const nameToSave = currentSession.user.user_metadata.full_name || currentSession.user.user_metadata.name;

                    // Update Supabase
                    supabase.from('user_preferences')
                        .update({ nome: nameToSave })
                        .eq('user_id', currentSession.user.id)
                        .then(() => console.log('Auto-synced user name from metadata'));

                    // Update Local State immediately
                    setProfile({ ...finalProfile, nome: nameToSave });
                } else {
                    setProfile(finalProfile);
                }
            } else {
                // Row missing: Create default preferences if possible, or just set empty state with metadata name attempt
                if (currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name) {
                    const nameToSave = currentSession.user.user_metadata.full_name || currentSession.user.user_metadata.name;

                    // Attempt to create row (upsert)
                    supabase.from('user_preferences')
                        .upsert({ user_id: currentSession.user.id, nome: nameToSave })
                        .then(() => console.log('Auto-created user preferences with name'));

                    setProfile({ nome: nameToSave });
                } else {
                    setProfile({});
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const [dataVersion, setDataVersion] = useState(0);

    const refreshUserData = useCallback(async () => {
        // Just increment version to trigger effects in subscribers
        setDataVersion(prev => prev + 1);
        // Also refresh profile just in case
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
            await fetchProfile(currentSession);
        }
    }, [fetchProfile]);

    // Kept for backward compatibility if needed, but mapped to new logic
    const refreshProfile = async () => {
        await refreshUserData();
    };

    useEffect(() => {
        // Initial Session Check & Subscription
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
        <UserContext.Provider value={{ profile, loading, refreshProfile, session, dataVersion, refreshUserData }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
