import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Validate JWT (Auth)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        // 3. Parse Body
        const { plan } = await req.json()
        if (!['monthly', 'lifetime'].includes(plan)) {
            throw new Error("Invalid plan. Use 'monthly' or 'lifetime'.")
        }

        // 4. Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 5. Get or Create Customer
        let customerId;

        // Check Profile First
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('stripe_customer_id, email')
            .eq('id', user.id)
            .single()

        if (profile?.stripe_customer_id) {
            customerId = profile.stripe_customer_id
        } else {
            // Create new customer
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_uid: user.id }
            })
            customerId = customer.id

            // Save to profile
            await supabaseClient
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }

        // 6. Determine Price & Mode
        const priceId = plan === 'monthly'
            ? Deno.env.get('STRIPE_PRICE_MONTHLY')
            : Deno.env.get('STRIPE_PRICE_LIFETIME')

        if (!priceId) {
            throw new Error(`Price ID not found for plan: ${plan}`)
        }

        const mode = plan === 'monthly' ? 'subscription' : 'payment'
        const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'

        // 7. Create Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            client_reference_id: user.id, // CRITICAL for webhook
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: mode,
            success_url: `${siteUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/billing/cancel`,
            metadata: {
                plan: plan, // Pass plan info
            }
        })

        return new Response(
            JSON.stringify({ url: session.url }),
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
