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

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        // 2. Get Profile & Subscription ID
        // Note: Using service role key for profile access might be safer if RLS restricts reading stripe_subscription_id, 
        // but typically user can read own profile. Let's use user client first.
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('stripe_subscription_id, plan')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            throw new Error('Profile not found')
        }

        if (profile.plan !== 'monthly') {
            throw new Error('Only monthly plans can be canceled.')
        }

        if (!profile.stripe_subscription_id) {
            throw new Error('No active subscription found to cancel.')
        }

        // 3. Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 4. Cancel at period end
        const subscription = await stripe.subscriptions.update(
            profile.stripe_subscription_id,
            { cancel_at_period_end: true }
        )

        // Optimistic update to avoid race condition with webhook for UI responsiveness
        await supabaseClient
            .from('profiles')
            .update({
                subscription_status: 'canceled_pending',
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
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
