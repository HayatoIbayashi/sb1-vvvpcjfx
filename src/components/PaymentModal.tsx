import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Movie } from '../lib/types';

interface PaymentModalProps {
  movie: Movie;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentModal({ movie, onClose, onSuccess, onError }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: movie.id,
          amount: movie.price * 100, // Convert to cents
        }),
      });

      if (!response.ok) {
        throw new Error('決済の処理中にエラーが発生しました');
      }

      const { clientSecret } = await response.json();

      // Load Stripe
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        throw new Error('Stripeの読み込みに失敗しました');
      }

      // Confirm payment
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            // Card details will be collected by Stripe Elements
          },
          billing_details: {
            // Billing details can be collected here if needed
          },
        },
      });

      if (error) {
        throw error;
      }

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : '決済処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-lighter p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-4">購入確認</h2>
        <div className="mb-6">
          <p className="text-gray-300 mb-2">{movie.title}</p>
          <p className="text-xl font-bold text-white">¥{movie.price.toLocaleString()}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '処理中...' : '購入する'}
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full bg-dark-light text-gray-300 py-3 rounded-lg font-semibold hover:bg-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}