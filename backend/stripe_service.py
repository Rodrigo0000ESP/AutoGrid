import os
import stripe
import json
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.orm import Session
from models import User, UserSubscription, ExtractionCounter
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
            stripe_sub = stripe.Subscription.retrieve(subscription_id, expand=['latest_invoice'])
            customer_id = stripe_sub.get('customer')
            
            if not customer_id:
                print("No customer ID found in subscription")
                return False
                
            # Debug log the subscription object structure
            print(f"Stripe subscription object: {json.dumps(stripe_sub, default=str)}")
            print(f"Current period start: {stripe_sub.get('current_period_start', 'N/A')}")
            print(f"Current period end: {stripe_sub.get('current_period_end', 'N/A')}")
            
            latest_invoice = stripe_sub.get('latest_invoice')
            if latest_invoice:
                print(f"Latest invoice period: {latest_invoice.get('period_start', 'N/A')} to {latest_invoice.get('period_end', 'N/A')}")
            
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
                print(f"Creating new subscription for user {user.id}")
                subscription = UserSubscription(
                    user_id=user.id,
                    status='active',  # Default status
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(subscription)
                db.flush()  # Ensure we have an ID
                print(f"Created subscription with ID: {subscription.id}")
            
            print(f"Updating subscription with data from Stripe: {stripe_sub}")
            
            # Get period dates from the subscription
            current_period_start = stripe_sub.get('current_period_start')
            current_period_end = stripe_sub.get('current_period_end')
            
            # If not found at subscription level, try to get from items
            if not current_period_start and 'items' in stripe_sub and 'data' in stripe_sub['items'] and stripe_sub['items']['data']:
                item = stripe_sub['items']['data'][0]
                if 'current_period_start' in item:
                    current_period_start = item['current_period_start']
                if 'current_period_end' in item:
                    current_period_end = item['current_period_end']
                
                # If still not found, try the period object
                if not current_period_start and 'period' in item:
                    current_period_start = item['period'].get('start')
                    current_period_end = item['period'].get('end')
            
            # Final fallback to latest_invoice
            if not current_period_start and latest_invoice:
                current_period_start = latest_invoice.get('period_start')
                current_period_end = latest_invoice.get('period_end')
                
                # Check invoice lines if still not found
                if not current_period_start and 'lines' in latest_invoice and 'data' in latest_invoice['lines'] and latest_invoice['lines']['data']:
                    line = latest_invoice['lines']['data'][0]
                    if 'period' in line:
                        current_period_start = line['period'].get('start')
                        current_period_end = line['period'].get('end')
            
            print(f"Resolved period dates - Start: {current_period_start}, End: {current_period_end}")
            print(f"Current time: {datetime.utcnow()}")
            
            # Update subscription fields
            subscription.stripe_subscription_id = subscription_id or subscription.stripe_subscription_id
            subscription.status = stripe_sub.get('status', subscription.status or 'active')
            
            # Update period dates if available
            if current_period_start is not None:
                # Handle both Unix timestamps and datetime objects
                if isinstance(current_period_start, int):
                    subscription.current_period_start = datetime.fromtimestamp(current_period_start)
                else:
                    subscription.current_period_start = current_period_start
                    
            if current_period_end is not None:
                # Handle both Unix timestamps and datetime objects
                if isinstance(current_period_end, int):
                    subscription.current_period_end = datetime.fromtimestamp(current_period_end)
                else:
                    subscription.current_period_end = current_period_end
            
            # Update cancel_at_period_end with fallback to existing value
            subscription.cancel_at_period_end = stripe_sub.get('cancel_at_period_end', 
                                                             getattr(subscription, 'cancel_at_period_end', False))
            
            # Set plan name if available
            if 'plan' in stripe_sub and stripe_sub['plan']:
                plan = stripe_sub['plan']
                if 'nickname' in plan:
                    subscription.plan_name = plan['nickname']
                elif 'product' in plan and isinstance(plan['product'], str):
                    # If product is just an ID, we can use it as the plan name
                    subscription.plan_name = plan['product']
            
            # Ensure timestamps are set
            now = datetime.utcnow()
            if not subscription.created_at:
                subscription.created_at = now
            subscription.updated_at = now
            
            db.commit()
            print(f"Successfully updated subscription {subscription_id} for user {user.id}")
            return True
            
        except Exception as e:
            print(f"Error handling checkout.session.completed: {str(e)}")
            import traceback
            print(traceback.format_exc())
            if db:
                db.rollback()
            return False
    
    @classmethod
    def _handle_subscription_updated(cls, db: Session, stripe_sub: dict) -> bool:
        """Handle subscription updates from Stripe"""
        try:
            # Find the subscription in our database
            subscription = db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == stripe_sub['id']
            ).first()
            
            if not subscription:
                print(f"No local subscription found for Stripe subscription: {stripe_sub['id']}")
                return False
                
            # Get the subscription item (first item in the items array)
            subscription_item = stripe_sub['items']['data'][0] if stripe_sub['items']['data'] else None
            
            # Update subscription details
            subscription.status = stripe_sub['status']
            
            # Get period dates from the subscription item if available, otherwise from the root
            if subscription_item:
                subscription.current_period_start = datetime.fromtimestamp(subscription_item['current_period_start'])
                subscription.current_period_end = datetime.fromtimestamp(subscription_item['current_period_end'])
            else:
                # Fallback to root level dates if item not found
                subscription.current_period_start = datetime.fromtimestamp(stripe_sub['current_period_start'])
                subscription.current_period_end = datetime.fromtimestamp(stripe_sub['current_period_end'])
                
            subscription.cancel_at_period_end = stripe_sub['cancel_at_period_end']
            
            extraction_counter = ExtractionCounter.get_or_create_counter(db, subscription.user_id)
            extraction_counter.reset_counter(db)
            
            db.commit()
            print(f"Reset extraction counter for user {subscription.user_id} due to subscription update")
            print(f"Updated subscription {stripe_sub['id']} to status: {stripe_sub['status']}")
            return True
            
        except Exception as e:
            print(f"Error handling subscription update: {str(e)}")
            import traceback
            print(traceback.format_exc())
            db.rollback()
            return False
    
    @classmethod
    def _handle_subscription_deleted(cls, db: Session, stripe_sub: dict) -> bool:
        """Handle subscription cancellation/deletion from Stripe"""
        try:
            # Find the subscription in our database
            subscription = db.query(UserSubscription).filter(
                UserSubscription.stripe_subscription_id == stripe_sub['id']
            ).first()
            
            if not subscription:
                print(f"No local subscription found for deleted Stripe subscription: {stripe_sub['id']}")
                return False
                
            # Get the user to update their subscription status
            user = db.query(User).filter(User.id == subscription.user_id).first()
            if user:
                user.subscription_status = 'canceled'
            
            # Instead of deleting, update the subscription status to 'canceled'
            # This preserves the subscription history
            subscription.status = 'canceled'
            subscription.ended_at = datetime.utcnow()
            
            db.commit()
            
            print(f"Marked subscription {stripe_sub['id']} as canceled in local database")
            return True
            
        except Exception as e:
            print(f"Error handling subscription deletion: {str(e)}")
            import traceback
            print(traceback.format_exc())
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
