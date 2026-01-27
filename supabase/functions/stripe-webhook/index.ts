import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (request) => {
    const signature = request.headers.get('Stripe-Signature')

    // 1. Verify Signature
    const body = await request.text()
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
        console.error(`Webhook signature verification failed: ${err.message}`)
        return new Response(err.message, { status: 400 })
    }

    // 2. Initialize Supabase Admin Client
    // Using Service Role Key to bypass RLS and update any profile
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Handle Events
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const userId = session.client_reference_id
                const customerId = session.customer

                if (!userId) {
                    console.warn('Webhook: checkout.session.completed missing client_reference_id. Ignoring.')
                    break;
                }

                console.log(`Processing checkout for user ${userId}, mode: ${session.mode}`)

                if (session.mode === 'payment') {
                    // Lifetime Plan
                    const { error } = await supabase.from('profiles').update({
                        plan: 'lifetime',
                        subscription_status: 'active',
                        is_premium: true,
                        stripe_customer_id: customerId,
                        stripe_price_id: session.metadata?.price_id || null, // fallback if needed
                        updated_at: new Date().toISOString()
                    }).eq('id', userId)

                    if (error) throw error

                } else if (session.mode === 'subscription') {
                    // Monthly Plan
                    const subscriptionId = session.subscription
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)

                    const { error } = await supabase.from('profiles').update({
                        plan: 'monthly',
                        subscription_status: 'active',
                        is_premium: true,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        stripe_price_id: subscription.items.data[0].price.id,
                        updated_at: new Date().toISOString()
                    }).eq('id', userId)

                    if (error) throw error
                }
                break
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const customerId = subscription.customer

                // Find user by stripe_customer_id
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, plan')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (!profile) {
                    console.log(`Webhook: No profile found for customer ${customerId}`)
                    break;
                }

                // Logic for Update
                const status = subscription.status
                const isActive = status === 'active' || status === 'trialing'

                // If deleted, revert to Free
                if (event.type === 'customer.subscription.deleted' || status === 'canceled') {
                    console.log(`Subscription deleted/canceled for user ${profile.id}`)
                    await supabase.from('profiles').update({
                        plan: 'free',
                        subscription_status: status, // canceled
                        is_premium: false,
                        stripe_subscription_id: null,
                        updated_at: new Date().toISOString()
                    }).eq('id', profile.id)

                } else {
                    // Update status (e.g. past_due, active, unpaid)
                    // If active, ensure premium is true. If unpaid/past_due, maybe revoke access?
                    // Strict rule: is_premium IF active AND plan in monthly/lifetime
                    // But here we are dealing with subscription updates, so likely plan is monthly.

                    // NOTE: If status is 'past_due', Stripe might retry. We can keep access or revoke.
                    // Requirement says: active => premium true. canceled/past_due/etc => premium false.

                    const isPremium = isActive

                    await supabase.from('profiles').update({
                        subscription_status: status,
                        is_premium: isPremium,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        stripe_price_id: subscription.items.data[0].price.id,
                        updated_at: new Date().toISOString()
                    }).eq('id', profile.id)
                }
                break
            }

            case 'invoice.payment_succeeded': {
                // Optional: Extend subscription period logic is handled by subscription.updated usually.
                // Monitoring only.
                break;
            }
        }
    } catch (err) {
        console.error(`Error processing webhook event: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
    })
})
