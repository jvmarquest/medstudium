import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
        return new Response('No signature', { status: 400 })
    }

    try {
        const body = await req.text()
        const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)

        // Use Service Role Key to bypass RLS and write to subscriptions
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const customerId = session.customer as string
                const mode = session.mode
                const subscriptionId = session.subscription as string | undefined

                let updateData: any = { status: 'active' }

                if (mode === 'subscription') {
                    updateData.plan = 'monthly' // Assuming subscription is monthly
                    updateData.stripe_subscription_id = subscriptionId
                } else if (mode === 'payment') {
                    updateData.plan = 'lifetime'
                    updateData.status = 'lifetime'
                }

                // Update row found by customer_id
                const { error } = await supabase
                    .from('subscriptions')
                    .update(updateData)
                    .eq('stripe_customer_id', customerId)

                if (error) console.error('Error updating subscription:', error)
                break
            }

            case 'invoice.paid': {
                const invoice = event.data.object
                const subscriptionId = invoice.subscription as string
                const periodEnd = invoice.lines.data[0].period.end

                // Convert to Date
                const expiresAt = new Date(periodEnd * 1000).toISOString()

                const { error } = await supabase
                    .from('subscriptions')
                    .update({ expires_at: expiresAt, status: 'active' })
                    .eq('stripe_subscription_id', subscriptionId)

                if (error) console.error('Error updating invoice:', error)
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const subscriptionId = subscription.id

                const { error } = await supabase
                    .from('subscriptions')
                    .update({ status: 'canceled' })
                    .eq('stripe_subscription_id', subscriptionId)

                if (error) console.error('Error canceling subscription:', error)
                break
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})
