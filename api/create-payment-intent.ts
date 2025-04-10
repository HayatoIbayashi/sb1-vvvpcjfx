import Stripe from 'stripe';
import { supabase } from '../src/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { movieId, amount } = await req.json();

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      metadata: {
        movieId,
        userId: session.user.id,
      },
    });

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: session.user.id,
        movie_id: movieId,
        payment_intent_id: paymentIntent.id,
        status: 'pending',
      });

    if (purchaseError) {
      throw purchaseError;
    }

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}