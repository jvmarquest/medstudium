import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth check
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Supabase Admin Client (Bypass RLS for status updates)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            console.error('Auth Error:', authError);
            return new Response(
                JSON.stringify({ success: false, error: 'Unauthorized: User not found or session invalid.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // 2. Get Profile & Subscription ID
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('stripe_subscription_id, plan')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Profile Error:', profileError);
            return new Response(
                JSON.stringify({ success: false, error: 'Profile not found. Please contact support.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (profile.plan !== 'monthly') {
            return new Response(
                JSON.stringify({ success: false, error: 'Apenas planos mensais podem ser cancelados por aqui.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (!profile.stripe_subscription_id) {
            // Edge case: User is marked as monthly but no ID. 
            // Do NOT auto-downgrade, just error out so we don't mess up manual testing states.
            return new Response(
                JSON.stringify({ success: false, error: 'Assinatura não encontrada. Contate o suporte ou verifique seus dados.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // SIMULATION MODE
        if (profile.stripe_subscription_id.startsWith('sim_')) {
            console.log('Simulating cancellation for mock ID');

            // Mock a date 30 days from now or use current_period_end if exists
            const mockDate = profile.current_period_end
                ? new Date(profile.current_period_end)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_status: 'canceled_pending',
                    current_period_end: mockDate.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            return new Response(
                JSON.stringify({
                    success: true,
                    subscription_status: 'canceled_pending',
                    current_period_end: Math.floor(mockDate.getTime() / 1000)
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 4. Cancel at period end
        let subscription;
        try {
            subscription = await stripe.subscriptions.update(
                profile.stripe_subscription_id,
                { cancel_at_period_end: true }
            )
        } catch (stripeError: any) {
            console.error('Stripe Error:', stripeError);

            if (stripeError.code === 'resource_missing') {
                console.warn('Subscription missing in Stripe. Updating local DB.');

                await supabaseAdmin
                    .from('profiles')
                    .update({
                        subscription_status: 'canceled',
                        plan: 'free',
                        is_premium: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Assinatura não existia mais no Stripe. Status atualizado localmente.',
                        subscription_status: 'canceled'
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({ success: false, error: `Erro no Stripe: ${stripeError.message}` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        }

        // Optimistic update
        await supabaseAdmin
            .from('profiles')
            .update({
                subscription_status: 'canceled_pending',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        return new Response(
            JSON.stringify({
                success: true,
                subscription_status: 'canceled_pending',
                current_period_end: subscription.current_period_end
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Function Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: `Erro Interno: ${error.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
