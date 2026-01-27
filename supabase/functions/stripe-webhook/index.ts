import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')

    // 1. Verify Signature
    const body = await req.text()
    let event
    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
            undefined,
            cryptoProvider
        )
    } catch (err) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // 2. Init Supabase Admin
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        switch (event.type) {
            // HANDLE CHECKOUT SUCCESS
            case 'checkout.session.completed': {
                const session = event.data.object
                const userId = session.client_reference_id

                if (!userId) {
                    console.log('No user_id in session')
                    break;
                }

                const mode = session.mode
                let plan = 'free'
                let isPremium = false
                let status = 'active' // Default for lifetime payment

                if (mode === 'subscription') {
                    plan = 'monthly'
                    isPremium = true
                    status = 'active'
                } else if (mode === 'payment') {
                    plan = 'lifetime'
                    isPremium = true
                    status = 'active'
                }

                // Update Profile
                await supabase.from('profiles').update({
                    plan: plan,
                    is_premium: isPremium,
                    subscription_status: status,
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription || null,
                    updated_at: new Date().toISOString()
                }).eq('id', userId)

                console.log(`User ${userId} upgraded to ${plan}`)
                break
            }

            // HANDLE SUBSCRIPTION UPDATES
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const customerId = subscription.customer

                // Find user by stripe_customer_id
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (!profile) break;

                const status = subscription.status
                // Convert Stripe status to App logic
                let plan = 'monthly' // Assume monthly if subscription exists
                let isPremium = false

                if (status === 'active' || status === 'trialing') {
                    isPremium = true
                } else {
                    // canceled, unpaid, past_due (maybe strict?), incomplete_expired
                    isPremium = false
                    plan = 'free' // Revert to free if not active
                }

                /* 
                   SPECIAL CASE: If user deleted subscription, status is 'canceled'.
                   We explicitly set plan to 'free' and is_premium to false.
                */
                if (event.type === 'customer.subscription.deleted') {
                    plan = 'free'
                    isPremium = false
                }

                await supabase.from('profiles').update({
                    plan: isPremium ? 'monthly' : 'free',
                    is_premium: isPremium,
                    subscription_status: status,
                    updated_at: new Date().toISOString()
                }).eq('id', profile.id)

                console.log(`Subscription updated for ${profile.id}: ${status}`)
                break
            }

            // HANDLE INVOICE PAID (Optional, good for logging/extending validity)
            case 'invoice.paid': {
                // Usually handled by subscription.updated, but good to have.
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })

    } catch (err: any) {
        console.error(err)
        return new Response(`Server Error: ${err.message}`, { status: 400 })
    }
})
