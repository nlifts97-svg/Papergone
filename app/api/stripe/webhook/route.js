import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { userId, plan } = session.metadata

    await supabase
      .from('profiles')
      .update({ plan, stripe_customer_id: session.customer })
      .eq('id', userId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', sub.customer)
      .single()

    if (profile) {
      await supabase.from('profiles').update({ plan: 'starter' }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ received: true })
}
