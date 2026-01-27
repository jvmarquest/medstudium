
import { supabase } from '../supabase';

export async function createCheckoutSession(plan: 'monthly' | 'lifetime') {
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('Você precisa estar logado para assinar.');
    }

    // 2. Invoke Function
    console.log(`[Checkout] Invoking create-checkout for plan: ${plan}`);
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan },
    });

    // 3. Error Handling
    if (error) {
        console.error('[Checkout] Function Invocation Error:', error);
        // Try to extract a useful message if it's a known format
        let msg = 'Erro ao se comunicar com o servidor de pagamentos.';
        if (error instanceof Error) msg = error.message;
        if (typeof error === 'string') msg = error;

        // Check for specific http errors
        // invoke returns { error } as handle for network or function errors
        throw new Error(msg);
    }

    // 4. Data Validation
    if (!data) {
        throw new Error('Resposta vazia do servidor.');
    }

    if (data.error) {
        console.error('[Checkout] API Returned Error:', data.error);
        throw new Error(data.error);
    }

    if (data.url) {
        console.log('[Checkout] Redirecting to:', data.url);
        window.location.href = data.url;
    } else {
        console.error('[Checkout] No URL in response:', data);
        throw new Error('Link de pagamento não foi gerado. Contate o suporte.');
    }
}
