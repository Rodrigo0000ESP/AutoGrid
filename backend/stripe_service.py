import os
import stripe
import json
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.orm import Session
from models import User, UserSubscription
from datetime import datetime
from dotenv import load_dotenv
from fastapi import HTTPException, status

# Load environment variables
load_dotenv()

# Configure Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Plan configuration - defined as constants
PLANS = {
    'free': {
        'name': 'Free',
        'stripe_price_id': os.getenv('STRIPE_FREE_PLAN_PRICE_ID'),
        'max_extractions': 15,
        'max_store_capacity': 10,
        'description': 'Plan gratuito con funcionalidades básicas',
        'features': [
            'Hasta 15 extracciones por mes',
            'Almacenamiento para 10 trabajos',
            'Soporte básico por correo electrónico'
        ]
    },
    'pro': {
        'name': 'Pro',
        'stripe_price_id': os.getenv('STRIPE_PRO_PLAN_PRICE_ID'),
        'max_extractions': 250,
        'max_store_capacity': 200,
        'description': 'Plan profesional para usuarios avanzados',
        'features': [
            'Hasta 250 extracciones por mes',
            'Almacenamiento para 200 trabajos',
            'Soporte prioritario',
            'Exportación de datos'
        ]
    },
    'unlimited': {
        'name': 'Unlimited',
        'stripe_price_id': os.getenv('STRIPE_UNLIMITED_PLAN_PRICE_ID'),
        'max_extractions': -1,  # -1 means unlimited
        'max_store_capacity': -1,  # -1 means unlimited
        'description': 'Plan ilimitado para uso profesional',
        'features': [
            'Extracciones ilimitadas',
            'Almacenamiento ilimitado',
            'Soporte prioritario 24/7',
            'Exportación de datos',
            'Acceso a funciones beta'
        ]
    }
}

class StripeService:
    """Service for handling all Stripe-related operations"""
    
    @staticmethod
    def get_plan(plan_name: str) -> Dict:
        """Get plan details by name"""
        plan = PLANS.get(plan_name.lower())
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plan '{plan_name}' no encontrado"
            )
        return plan
    
    @staticmethod
    def get_all_plans() -> List[Dict]:
        """Get all available plans"""
        return list(PLANS.values())
    
    @staticmethod
    def create_customer(email: str, name: str = None) -> stripe.Customer:
        """Create a new Stripe customer"""
        try:
            return stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    'created_at': datetime.utcnow().isoformat()
                }
            )
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al crear cliente en Stripe: {str(e)}"
            )
    
    @staticmethod
    def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str
    ) -> Dict:
        """Create a Stripe Checkout session"""
        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                allow_promotion_codes=True
            )
            return {
                'session_id': session.id,
                'url': session.url
            }
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al crear sesión de pago: {str(e)}"
            )
    
    @classmethod
    def get_subscription_limits(
        cls,
        db: Session,
        user_id: int,
        subscription: UserSubscription = None
    ) -> Tuple[Dict, bool]:
        """
        Get the plan limits for a user's subscription
        
        Returns:
            Tuple of (plan_limits, is_trial)
        """
        if not subscription:
            # Default to free plan if no subscription exists
            return PLANS['free'], False
            
        try:
            # If we have a Stripe subscription, check its status
            if subscription.stripe_subscription_id:
                stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
                
                # Check if subscription is active or in trial
                if stripe_sub.status in ['active', 'trialing']:
                    # Find which plan this subscription is for
                    price_id = stripe_sub['items'].data[0].price.id
                    
                    for plan in PLANS.values():
                        if plan['stripe_price_id'] == price_id:
                            is_trial = (
                                stripe_sub.status == 'trialing' and 
                                stripe_sub.trial_end and 
                                stripe_sub.trial_end > datetime.utcnow().timestamp()
                            )
                            return plan, is_trial
            
            # If we get here, return free plan as default
            return PLANS['free'], False
            
        except stripe.error.StripeError as e:
            # On Stripe error, log it but return free plan
            print(f"Stripe error getting subscription: {str(e)}")
            return PLANS['free'], False
    
    @classmethod
    def handle_webhook_event(
        cls, 
        payload: bytes, 
        sig_header: str, 
        endpoint_secret: str,
        db: Session = None
    ) -> bool:
        """
        Handle Stripe webhook events
        
        Args:
            payload: Raw webhook payload
            sig_header: Stripe signature header
            endpoint_secret: Webhook endpoint secret for verification
            db: Optional database session (will create one if not provided)
            
        Returns:
            bool: True if the event was handled successfully, False otherwise
        """
        from BaseRepository import SessionLocal
        
        # Use provided session or create a new one
        should_close_session = False
        if db is None:
            db = SessionLocal()
            should_close_session = True
            
        try:
            # Verify the webhook signature
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, endpoint_secret
                )
            except ValueError as e:
                print(f"Invalid webhook payload: {str(e)}")
                return False
            except stripe.error.SignatureVerificationError as e:
                print(f"Invalid webhook signature: {str(e)}")
                return False
                
            print(f"Processing webhook event: {event['type']}")
            
            # Route the event to the appropriate handler
            if event['type'] == 'checkout.session.completed':
                return cls._handle_checkout_session_completed(db, event['data']['object'])
                
            elif event['type'] == 'customer.subscription.updated':
                return cls._handle_subscription_updated(db, event['data']['object'])
                
            elif event['type'] == 'customer.subscription.deleted':
                return cls._handle_subscription_deleted(db, event['data']['object'])
                
            elif event['type'] == 'invoice.payment_succeeded':
                return cls._handle_invoice_payment_succeeded(db, event['data']['object'])
                
            elif event['type'] == 'invoice.payment_failed':
                return cls._handle_invoice_payment_failed(db, event['data']['object'])
                
            # Log unhandled event types
            print(f"Unhandled event type: {event['type']}")
            return False
            
        except Exception as e:
            print(f"Error processing webhook event: {str(e)}")
            if db:
                db.rollback()
            return False
            
        finally:
            if should_close_session and db:
                db.close()
    
    @classmethod
    def _handle_checkout_session_completed(cls, db: Session, session: dict) -> bool:
        """Handle successful checkout session completion"""
        try:
            # Get the subscription ID from the checkout session
            subscription_id = session.get('subscription')
            if not subscription_id:
                print("No subscription ID in checkout session")
                return False
                
            # Get the full subscription object from Stripe
            stripe_sub = stripe.Subscription.retrieve(subscription_id)
            customer_id = stripe_sub.customer
            
            # Find the user by Stripe customer ID
            user = db.query(User).filter(
                User.stripe_customer_id == customer_id
            ).first()
            
            if not user:
                print(f"No user found with Stripe customer ID: {customer_id}")
                return False
                
            # Get the subscription or create a new one
            subscription = db.query(UserSubscription).filter(
                UserSubscription.user_id == user.id
            ).first()
            
            if not subscription:
                subscription = UserSubscription(user_id=user.id)
                db.add(subscription)
            
            # Update subscription details
            subscription.stripe_subscription_id = subscription_id
            subscription.status = stripe_sub.status
            subscription.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start)
            subscription.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end)
            subscription.cancel_at_period_end = stripe_sub.cancel_at_period_end
            
            db.commit()
            print(f"Updated subscription for user {user.id}: {subscription_id}")
            return True
            
        except Exception as e:
            print(f"Error handling checkout.session.completed: {str(e)}")
            if db:
                db.rollback()
            return False
    
    @classmethod
    def _handle_subscription_updated(cls, db: Session, stripe_sub: dict) -> bool:
        """Handle subscription updates from Stripe"""
        try:
            # Find the subscription in our database
            subscription = db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == stripe_sub.id
            ).first()
            
            if not subscription:
                print(f"No local subscription found for Stripe subscription: {stripe_sub.id}")
                return False
                
            # Update subscription details
            subscription.status = stripe_sub.status
            subscription.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start)
            subscription.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end)
            subscription.cancel_at_period_end = stripe_sub.cancel_at_period_end
            
            db.commit()
            print(f"Updated subscription {stripe_sub.id} to status: {stripe_sub.status}")
            return True
            
        except Exception as e:
            print(f"Error handling subscription.updated: {str(e)}")
            if db:
                db.rollback()
            return False
    
    @classmethod
    def _handle_subscription_deleted(cls, db: Session, stripe_sub: dict) -> bool:
        """Handle subscription cancellation/deletion from Stripe"""
        try:
            # Find and update the subscription in our database
            subscription = db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == stripe_sub.id
            ).first()
            
            if not subscription:
                print(f"No local subscription found for deleted Stripe subscription: {stripe_sub.id}")
                return False
                
            # Mark as canceled but keep the record for history
            subscription.status = 'canceled'
            subscription.cancel_at_period_end = True
            
            db.commit()
            print(f"Marked subscription {stripe_sub.id} as canceled")
            return True
            
        except Exception as e:
            print(f"Error handling subscription.deleted: {str(e)}")
            if db:
                db.rollback()
            return False
    
    @classmethod
    def _handle_invoice_payment_succeeded(cls, db: Session, invoice: dict) -> bool:
        """Handle successful invoice payments"""
        try:
            subscription_id = invoice.get('subscription')
            if not subscription_id:
                return False
                
            # Get the subscription from Stripe to update our records
            stripe_sub = stripe.Subscription.retrieve(subscription_id)
            return cls._handle_subscription_updated(db, stripe_sub)
            
        except Exception as e:
            print(f"Error handling invoice.payment_succeeded: {str(e)}")
            return False
    
    @classmethod
    def _handle_invoice_payment_failed(cls, db: Session, invoice: dict) -> bool:
        """Handle failed invoice payments"""
        try:
            subscription_id = invoice.get('subscription')
            if not subscription_id:
                return False
                
            # Get the subscription from Stripe
            stripe_sub = stripe.Subscription.retrieve(subscription_id)
            
            # If the subscription is now past_due, update our records
            if stripe_sub.status == 'past_due':
                return cls._handle_subscription_updated(db, stripe_sub)
                
            return True
            
        except Exception as e:
            print(f"Error handling invoice.payment_failed: {str(e)}")
            return False
