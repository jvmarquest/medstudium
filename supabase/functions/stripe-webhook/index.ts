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

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const userId = session.client_reference_id

                if (!userId) {
                    console.warn('checkout.session.completed: Missing client_reference_id (user_id)')
                    break
                }

                const mode = session.mode
                let plan = 'free'
                let isPremium = false
                let status = 'active'

                if (mode === 'subscription') {
                    plan = 'monthly'
                    isPremium = true
                    // Status defaults to active, but realtime update will come from subscription.created
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
                const customerId = subscription.customer

                // Find user by stripe_customer_id
                // Note: use 'maybeSingle' to avoid error if not found instantly (race condition)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .maybeSingle()

                if (!profile) {
                    console.warn(`[Webhook] No profile found for customer: ${customerId}`)
                    break
                }

                const status = subscription.status
                let plan = 'monthly' // Default for subs
                let isPremium = false

                if (['active', 'trialing'].includes(status)) {
                    isPremium = true
                } else {
                    isPremium = false
                    plan = 'free'
                }

                // Explicit deletion overrides generic status check logic
                if (event.type === 'customer.subscription.deleted') {
                    isPremium = false
                    plan = 'free'
                }

                console.log(`[Webhook] Subscription Update for User ${profile.id}: Status=${status}, Premium=${isPremium}`)

                const { error } = await supabase.from('profiles').update({
                    plan: isPremium ? 'monthly' : 'free',
                    is_premium: isPremium,
                    subscription_status: status,
                    updated_at: new Date().toISOString()
                }).eq('id', profile.id)

                if (error) console.error('[Webhook] Profile Update Error:', error)
                break
            }

            case 'invoice.paid': {
                // Good for logging or extending expiration dates if we managed that manually
                console.log('[Webhook] Invoice Paid:', event.data.object.id)
                break
            }
        }

        return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })

    } catch (err: any) {
        console.error(`[Webhook] Server Error: ${err.message}`)
        return new Response(`Server Error: ${err.message}`, { status: 400 })
    }
})
