import React from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../supabase';

const DebugOverlay = () => {
    const { profile, loading, isPremium, error } = useUser();
    const [expanded, setExpanded] = React.useState(true);

    // Also fetch raw DB profile strictly for debug
    const [rawProfile, setRawProfile] = React.useState<any>(null);
    const [rawError, setRawError] = React.useState<any>(null);
    const [userId, setUserId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchRaw = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
                setRawProfile(data);
                setRawError(error);
            }
        };
        const interval = setInterval(fetchRaw, 5000);
        fetchRaw();
        return () => clearInterval(interval);
    }, []);

    if (!expanded) {
        return (
            <div
                onClick={() => setExpanded(true)}
                style={{ position: 'fixed', top: '10px', left: '10px', padding: '5px 10px', background: 'red', color: 'white', zIndex: 99999, fontSize: '12px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
            >
                DEBUG
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', top: '10px', left: '10px', width: '320px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.95)', color: '#0f0', padding: '10px', borderRadius: '8px', zIndex: 99999, fontSize: '10px', fontFamily: 'monospace', boxShadow: '0 0 10px rgba(0,255,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong>DEBUG CONTEXT</strong>
                <button onClick={() => setExpanded(false)} style={{ color: 'white' }}>MINIMIZE</button>
            </div>
            <div>Auth ID: {userId || 'Loading...'}</div>
            <div>Context Loading: {loading ? 'YES' : 'NO'}</div>
            <div>Context isPremium: {isPremium ? 'TRUE' : 'FALSE'}</div>

            <div style={{ marginTop: '5px', borderTop: '1px solid #333' }}>
                <strong>Current Profile (Context):</strong>
                <pre>{JSON.stringify(profile, null, 2)}</pre>
            </div>

            <div style={{ marginTop: '5px', borderTop: '1px solid #333', color: rawError ? 'red' : 'cyan' }}>
                <strong>Raw DB Fetch (Direct):</strong>
                {rawError && <div>Error: {rawError.message}</div>}
                {!rawProfile && !rawError && <div>Loading/Null...</div>}
                {rawProfile && (
                    <pre>
                        plan: {rawProfile.plan} {'\n'}
                        is_premium: {String(rawProfile.is_premium)} {'\n'}
                        sub_status: {rawProfile.subscription_status}
                    </pre>
                )}
            </div>

            <button
                onClick={() => window.location.reload()}
                style={{ marginTop: "10px", width: '100%', padding: "5px", background: "#3b82f6", border: "none", color: "white", borderRadius: "3px", cursor: 'pointer' }}
            >
                Force Reload
            </button>
        </div >
    );
};

export default DebugOverlay;
