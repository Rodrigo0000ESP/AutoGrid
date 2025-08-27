from enum import Enum
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PlanType(Enum):
    FREE = "free"
    PRO = "pro"
    UNLIMITED = "unlimited"

class PlanFeature(Enum):
    # Core limits
    MAX_JOBS = "max_store_capacity"
    MAX_JOB_EXTRACTIONS = "max_extractions"
    
    # Features
    EXPORT_CSV = "export_csv"
    PRIORITY_SUPPORT = "priority_support"

# Plan configuration - matches the structure in stripe_service.py
PLANS = {
    PlanType.FREE.value: {
        'name': 'Free',
        'stripe_price_id': os.getenv('STRIPE_FREE_PLAN_PRICE_ID'),
        'max_extractions': 15,  # 15 extractions per month
        'max_store_capacity': 10,  # 10 jobs max
        'export_csv': False,
        'priority_support': False
    },
    PlanType.PRO.value: {
        'name': 'Pro',
        'stripe_price_id': os.getenv('STRIPE_PRO_PLAN_PRICE_ID'),
        'max_extractions': 100,  # 100 extractions per month
        'max_store_capacity': 100,  # 100 jobs max
        'export_csv': True,
        'priority_support': False
    },
    PlanType.UNLIMITED.value: {
        'name': 'Unlimited',
        'stripe_price_id': os.getenv('STRIPE_UNLIMITED_PLAN_PRICE_ID'),
        'max_extractions': 0,  # 0 means unlimited extractions
        'max_store_capacity': 0,  # 0 means unlimited jobs
        'export_csv': True,
        'priority_support': True
    }
}

def get_plan(plan_name: str) -> Dict[str, Any]:
    """Get plan details by name"""
    return PLANS.get(plan_name.lower(), PLANS[PlanType.FREE.value])

def get_plan_by_stripe_price(price_id: str) -> Tuple[Optional[str], Dict[str, Any]]:
    """Get plan name and details by Stripe price ID"""
    for plan_name, plan in PLANS.items():
        if plan['stripe_price_id'] == price_id:
            return plan_name, plan
    return None, PLANS[PlanType.FREE.value]

def get_plan_features(plan_name: str) -> Dict[str, Any]:
    """Get all features for a specific plan"""
    return get_plan(plan_name)

def has_feature(plan_name: str, feature: PlanFeature) -> bool:
    """Check if a plan includes a specific feature"""
    plan = get_plan(plan_name)
    return plan.get(feature.value, False)

def get_plan_limits(plan_name: str) -> Dict[str, int]:
    """Get the resource limits for a specific plan"""
    plan = get_plan(plan_name)
    return {
        "max_jobs": plan.get("max_store_capacity", 10),
        "max_job_extractions": plan.get("max_extractions", 15)
    }

def can_perform_action(plan_name: str, action: str, current_usage: int = 0) -> bool:
    """Check if a plan allows a specific action with current usage"""
    plan = get_plan(plan_name)
    
    if action == "create_job":
        max_jobs = plan.get("max_store_capacity", 10)
        return max_jobs == -1 or current_usage < max_jobs
        
    elif action == "extract_job":
        max_extractions = plan.get("max_extractions", 15)
        return max_extractions == -1 or current_usage < max_extractions
        
    return False

class PlanLimitsExceeded(Exception):
    """Exception raised when a user exceeds their plan limits"""
    def __init__(self, message: str, limit_type: str, current: int, limit: int, plan_name: str):
        self.message = message
        self.limit_type = limit_type
        self.current = current
        self.limit = limit
        self.plan_name = plan_name
        super().__init__(self.message)
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "message": self.message,
            "limit_type": self.limit_type,
            "current": self.current,
            "limit": self.limit,
            "plan_name": self.plan_name,
            "upgrade_required": True
        }
