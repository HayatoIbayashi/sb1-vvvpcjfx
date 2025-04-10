import Stripe from 'stripe';
import { supabase } from '../src/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig || !endpointSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update purchase status
        const { error } = await supabase
          .from('purchases')
          .update({ status: 'completed' })
          .eq('payment_intent_id', paymentIntent.id);

        if (error) {
          throw error;
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update purchase status
        const { error } = await supabase
          .from('purchases')
          .update({ status: 'failed' })
          .eq('payment_intent_id', paymentIntent.id);

        if (error) {
          throw error;
        }

        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}