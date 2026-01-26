import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const { plan } = await req.json()
        if (!plan || !['monthly', 'lifetime'].includes(plan)) {
            throw new Error('Invalid plan selected')
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 2. Get or Create Stripe Customer
        // Check local database first
        const { data: existingSubscription } = await supabaseClient
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .maybeSingle()

        let customerId = existingSubscription?.stripe_customer_id

        if (!customerId) {
            // Search in Stripe by email
            const customers = await stripe.customers.search({
                query: `email:\'${user.email}\'`,
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id
            } else {
                // Create new Stripe Customer
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    metadata: { supabase_uid: user.id },
                })
                customerId = newCustomer.id
            }

            // Update or Insert into subscriptions table
            // We use upsert on user_id if we have a unique constraint, otherwise we might duplicate if not careful.
            // Given 'maybeSingle' didn't find one, we 'insert' usually, but 'upsert' is safer for race conditions.
            // Assuming user_id has unique constraint or we just insert.
            // Ideally we should check if a row exists with user_id but null customer_id.
            // For now, let's look for any row for this user.
            const { data: row } = await supabaseClient.from('subscriptions').select('id').eq('user_id', user.id).maybeSingle()

            if (row) {
                await supabaseClient.from('subscriptions').update({ stripe_customer_id: customerId }).eq('id', row.id)
            } else {
                await supabaseClient.from('subscriptions').insert({ user_id: user.id, stripe_customer_id: customerId })
            }
        }

        // 3. Create Checkout Session
        const priceId = plan === 'monthly'
            ? Deno.env.get('STRIPE_PRICE_MONTHLY_ID')
            : Deno.env.get('STRIPE_PRICE_LIFETIME_ID')

        // Ensure we have a valid price ID
        if (!priceId || priceId.startsWith('PLACEHOLDER')) {
            throw new Error('Stripe Price ID not configured')
        }

        const mode = plan === 'monthly' ? 'subscription' : 'payment'

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: mode,
            success_url: `${req.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/payment/cancel`,
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
