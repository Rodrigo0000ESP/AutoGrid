from fastapi import HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Callable, Any, Optional, Dict, Type, Tuple
from datetime import datetime

from models import User, UserSubscription, Job, ExtractionCounter
from plan_features import PlanType, PlanFeature, get_plan, has_feature, PlanLimitsExceeded
from stripe_service import StripeService
from BaseRepository import SessionLocal, get_db
from jwt_utils import verify_token, oauth2_scheme

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token"""
    try:
        token_data = verify_token(token.credentials)
        user = db.query(User).filter(User.id == token_data["id"]).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

class PlanChecker:
    """Middleware to check user's plan limits before performing actions"""
    
    @classmethod
    def get_user_plan(cls, db: Session, user: User) -> tuple[str, dict, bool]:
        """
        Get the user's current plan details with actual usage
        Returns a tuple of (plan_name, plan_details, is_trial)
        """
        # Default to Free plan
        plan_name = PlanType.FREE.value
        plan_details = get_plan(plan_name)
        is_trial = False
        
        # Refresh the user object to get the latest subscription data
        db.refresh(user)
        
        if hasattr(user, 'subscription') and user.subscription:
            # Get fresh subscription data from database
            subscription = db.query(UserSubscription).filter(
                UserSubscription.user_id == user.id
            ).first()
            
            if subscription and cls._is_subscription_active(subscription):
                try:
                    # Get plan details from Stripe
                    stripe_plan, is_trial = StripeService.get_subscription_limits(db, user.id, subscription)
                    
                    # Find the matching plan based on stripe_price_id
                    for plan_type in PlanType:
                        plan_data = get_plan(plan_type.value)
                        if plan_data.get('stripe_price_id') == stripe_plan.get('stripe_price_id'):
                            plan_name = plan_type.value
                            plan_details = plan_data.copy()  # Use the predefined plan details
                            break
                    
                    # Update with the actual Stripe plan details
                    plan_details.update(stripe_plan)
                    
                except Exception as e:
                    print(f"Error getting Stripe subscription: {str(e)}")
        
        # Get current extraction count and stored jobs
        try:
            # Get extraction counter
            counter = ExtractionCounter.get_or_create_counter(db, user.id)
            plan_details['current_extractions'] = counter.count
            
            # Get stored jobs count
            stored_jobs = db.query(Job).filter(Job.user_id == user.id).count()
            plan_details['current_stored'] = stored_jobs
            
            # Calculate remaining usage
            plan_details['remaining_extractions'] = max(0, plan_details.get('max_extractions', 0) - counter.count)
            plan_details['remaining_storage'] = max(0, plan_details.get('max_store_capacity', 0) - stored_jobs)
            
        except Exception as e:
            print(f"Error getting usage data: {str(e)}")
            plan_details['current_extractions'] = 0
            plan_details['current_stored'] = 0
            plan_details['remaining_extractions'] = plan_details.get('max_extractions', 0)
            plan_details['remaining_storage'] = plan_details.get('max_store_capacity', 0)
            
        return plan_name, plan_details, is_trial
    
    @staticmethod
    def _is_subscription_active(subscription: UserSubscription) -> bool:
        """Check if subscription is active and not expired"""
        if subscription.status not in ['active', 'trialing']:
            return False
            
        if (subscription.current_period_end and 
            subscription.current_period_end < datetime.utcnow()):
            return False
            
        return True
    
    @staticmethod
    def _get_stripe_plan_details(db: Session, user: User, subscription: UserSubscription) -> tuple[str, dict, bool]:
        """Get plan details from Stripe subscription"""
        try:
            plan_limits, is_trial = StripeService.get_subscription_limits(
                db, user.id, subscription
            )
            for plan_name, plan in get_plan(PlanType.FREE.value).items():
                if plan.get('stripe_price_id') == plan_limits.get('stripe_price_id'):
                    return plan_name, plan_limits, is_trial
        except Exception as e:
            print(f"Error getting subscription details: {str(e)}")
            
        return PlanType.FREE.value, get_plan(PlanType.FREE.value), False
        
    @classmethod
    def check_limits(
        cls,
        db: Session,
        user: User,
        action: str,
        **kwargs: Any
    ) -> None:
        """
        Check if user can perform an action based on their plan limits
        Raises PlanLimitsExceeded if the action is not allowed
        """
        plan_name, plan_details, is_trial = cls.get_user_plan(db, user)
        
        if not has_feature(plan_name, action):
            raise PlanLimitsExceeded(
                f"Action '{action}' not allowed on plan '{plan_name}'"
            )
        
        # Check any additional limits
        if action == 'create_job' and 'job_data' in kwargs:
            cls._check_job_limits(db, user, plan_details, **kwargs)
    
    @classmethod
    def _check_job_limits(
        cls,
        db: Session,
        user: User,
        plan_details: dict,
        **kwargs
    ) -> None:
        """Check job creation limits"""
        if 'max_jobs' in plan_details:
            job_count = db.query(Job).filter(Job.user_id == user.id).count()
            if job_count >= plan_details['max_jobs']:
                raise PlanLimitsExceeded(
                    f"Maximum job limit of {plan_details['max_jobs']} reached"
                )
    
    @classmethod
    def get_plan_usage(
        cls,
        db: Session,
        user: User
    ) -> Dict[str, Any]:
        """Get the user's current plan usage statistics"""
        plan_name, plan_details, is_trial = cls.get_user_plan(db, user)
        
        return {
            'plan_name': plan_name,
            'is_trial': is_trial,
            'limits': {
                'max_jobs': plan_details.get('max_jobs', 0),
                'used_jobs': db.query(Job).filter(Job.user_id == user.id).count(),
                'features': plan_details.get('features', [])
            },
            'subscription': {
                'status': user.subscription.status if hasattr(user, 'subscription') and user.subscription else 'inactive',
                'current_period_end': user.subscription.current_period_end.isoformat() 
                    if hasattr(user, 'subscription') and user.subscription and user.subscription.current_period_end 
                    else None
            }
        }
    @classmethod
    def can_perform_action(
        cls,
        db: Session,
        user: User,
        action: str,
        current_usage: Optional[int] = None
    ) -> bool:
        """
        Check if the user can perform an action based on their plan limits
        
        Args:
            db: Database session
            user: The user object
            action: The action being performed (e.g., 'create_job', 'extract_job')
            current_usage: Current usage count for the resource
            
        Returns:
            bool: True if the action is allowed, False otherwise
        """
        try:
            cls.check_limits(db, user, action, current_usage=current_usage)
            return True
        except PlanLimitsExceeded:
            return False
    
    @classmethod
    def require_feature(
        cls,
        feature: PlanFeature,
        error_message: Optional[str] = None
    ) -> Callable:
        """
        Dependency to require a specific feature for a route
        
        Usage:
            @router.get("/some-route")
            async def some_route(
                _ = Depends(PlanChecker.require_feature(PlanFeature.ADVANCED_ANALYTICS))
            ):
                # This route requires the ADVANCED_ANALYTICS feature
        """
        async def feature_checker(
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db)
        ) -> bool:
            plan_name, plan_details, _ = cls.get_user_plan(db, current_user)
            
            if not has_feature(plan_name, feature):
                if not error_message:
                    error_message = f"This feature requires the {plan_details.get('name', 'Pro')} plan or higher"
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "message": error_message,
                        "required_feature": feature.value,
                        "current_plan": plan_name,
                        "upgrade_required": True
                    }
                )
            return True
            
        return feature_checker

# Example usage in FastAPI routes:
# 
# @router.post("/jobs/")
# async def create_job(
#     job_data: dict,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     # Check if user can create more jobs
#     PlanChecker.check_limits(db, current_user, "create_job")
#     
#     # Check if a specific feature is required
#     _ = await PlanChecker.require_feature(PlanFeature.EXPORT_JSON)(current_user, db)
#     
#     # Proceed with job creation
#     ...
