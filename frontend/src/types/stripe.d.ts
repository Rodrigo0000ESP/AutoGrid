// Type definitions for Stripe.js
declare module '@stripe/stripe-js' {
  interface Stripe {
    redirectToCheckout(params: { sessionId: string }): Promise<{ error?: Error }>;
  }

  interface StripeConstructor {
    (publicKey: string): Stripe;
  }

  const loadStripe: (publicKey: string) => Promise<Stripe>;
  
  export { loadStripe };
  export type { Stripe, StripeConstructor };
}

// Extend the Window interface
declare global {
  interface Window {
    Stripe: import('@stripe/stripe-js').StripeConstructor;
  }
}

export {};
