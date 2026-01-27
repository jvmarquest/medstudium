import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    try {
        const signature = req.headers.get('Stripe-Signature')
        if (!signature) {
            return new Response('No signature', { status: 400 })
        }

        const body = await req.text()

        let event
        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
                undefined,
                cryptoProvider
            )
        } catch (err: any) {
            console.error(`Webhook signature verification failed.`, err.message)
            return new Response(err.message, { status: 400 })
        }

        console.log(`[Webhook] Event Received: ${event.type}`)

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Helper to get user_id from various sources
        const getUserId = async (evtObj: any, customerId: string) => {
            // 1. Try metadata on the object itself (session or subscription)
            if (evtObj.metadata?.user_id) return evtObj.metadata.user_id;

            // 2. Try client_reference_id (checkout sessions)
            if (evtObj.client_reference_id) return evtObj.client_reference_id;

            // 3. Fallback: Lookup by Stripe Customer ID in DB
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('stripe_customer_id', customerId)
                .maybeSingle()

            return profile?.id;
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const userId = await getUserId(session, session.customer as string)

                if (!userId) {
                    console.error('[Webhook] Error: Could not find user_id for checkout session.')
                    return new Response('User not found', { status: 400 })
                }

                const mode = session.mode
                let plan = 'free'
                let isPremium = false
                let status = 'active'

                if (mode === 'subscription') {
                    plan = 'monthly'
                    isPremium = true
                } else if (mode === 'payment') {
                    plan = 'lifetime'
                    isPremium = true
                }

                console.log(`[Webhook] Checkout completed for User ${userId}. Plan: ${plan}`)

                const { error } = await supabase.from('profiles').update({
                    plan: plan,
                    is_premium: isPremium,
                    subscription_status: status,
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription || null,
                    updated_at: new Date().toISOString()
                }).eq('id', userId)

                if (error) console.error('[Webhook] Profile Update Error:', error)
                break
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const customerId = subscription.customer as string
                const userId = await getUserId(subscription, customerId)

                if (!userId) {
                    console.error(`[Webhook] Error: Could not find user_id for subscription ${subscription.id}`)
                    // We initiate a 400 to signal Stripe to retry, or maybe 200 to ignore if it's truly orphaned?
                    // User asked to "Logar erro e Retornar 400" if user not found.
                    return new Response('User not found', { status: 400 })
                }

                const status = subscription.status
                let plan = 'monthly' // Default assumption
                let isPremium = false

                if (['active', 'trialing'].includes(status)) {
                    isPremium = true
                } else {
                    isPremium = false
                    plan = 'free'
                }

                if (event.type === 'customer.subscription.deleted') {
                    isPremium = false
                    plan = 'free'
                }

                console.log(`[Webhook] Subscription Update for User ${userId}: Status=${status}, Premium=${isPremium}`)

                const { error } = await supabase.from('profiles').update({
                    plan: isPremium ? 'monthly' : 'free',
                    is_premium: isPremium,
                    subscription_status: status,
                    updated_at: new Date().toISOString()
                }).eq('id', userId)

                if (error) console.error('[Webhook] Profile Update Error:', error)
                break
            }

            case 'invoice.paid': {
                // If needed, can also update user here
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })

    } catch (err: any) {
        console.error(`[Webhook] Server Error: ${err.message}`)
        return new Response(`Server Error: ${err.message}`, { status: 400 })
    }
})
