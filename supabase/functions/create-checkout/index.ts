import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Validate Auth
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized: User not logged in')
        }

        // 2. Parse Body & Validate Plan
        let plan: string;
        try {
            const body = await req.json();
            plan = body.plan;
        } catch (e) {
            throw new Error('Invalid request body');
        }

        if (!plan || !['monthly', 'lifetime'].includes(plan)) {
            throw new Error(`Invalid plan: ${plan}. Must be 'monthly' or 'lifetime'.`)
        }

        // Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 3. Get or Create Stripe Customer
        // Check local database (profiles table)
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('stripe_customer_id, email')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('Profile fetch error:', profileError)
            // Proceeding might be risky if we can't save the customer ID back, but let's try.
        }

        let customerId = profile?.stripe_customer_id

        if (!customerId) {
            console.log('No stripe_customer_id found in profile. Searching in Stripe...')
            // Search in Stripe by email
            const customers = await stripe.customers.search({
                query: `email:'${user.email}'`,
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id
                console.log('Found existing customer in Stripe:', customerId)
            } else {
                console.log('Creating new Stripe Customer...')
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    metadata: { supabase_uid: user.id },
                })
                customerId = newCustomer.id
            }

            // Update profiles table with the new ID
            if (customerId) {
                const { error: updateError } = await supabaseClient
                    .from('profiles')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', user.id)

                if (updateError) console.error('Error saving stripe_customer_id to profile:', updateError)
            }
        }

        // 4. Select Price ID
        const priceId = plan === 'monthly'
            ? Deno.env.get('STRIPE_PRICE_MONTHLY') // Matching prompt instructions to check env vars
            : Deno.env.get('STRIPE_PRICE_LIFETIME')

        // Fallback checks for implicit naming if user used ID suffix
        const finalPriceId = priceId
            || (plan === 'monthly' ? Deno.env.get('STRIPE_PRICE_MONTHLY_ID') : Deno.env.get('STRIPE_PRICE_LIFETIME_ID'));


        if (!finalPriceId || finalPriceId.includes('PLACEHOLDER')) {
            throw new Error(`Stripe Price ID not configured for plan: ${plan}`)
        }

        // 5. Create Checkout Session
        const mode = plan === 'monthly' ? 'subscription' : 'payment'
        const siteUrl = Deno.env.get('SITE_URL') || req.headers.get('origin') || 'http://localhost:3000'; // Robust fallback

        const sessionPayload = {
            customer: customerId,
            client_reference_id: user.id, // CRITICAL: Link session to Supabase User
            line_items: [{ price: finalPriceId, quantity: 1 }],
            mode: mode,
            success_url: `${siteUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/billing/cancel`,
        };

        console.log('Creating checkout session with payload:', sessionPayload);

        const session = await stripe.checkout.sessions.create(sessionPayload);

        if (!session?.url) {
            throw new Error('Failed to create Stripe Checkout URL')
        }

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error in create-checkout:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
