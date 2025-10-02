from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from BaseRepository import Base
from pagination import PaginationParams, PaginatedResult
from pydantic import BaseModel
from typing import List, Generic, TypeVar, Optional
from datetime import datetime, timedelta
import enum
class ExtractionCounter(Base):
    __tablename__ = 'extraction_counters'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    count = Column(Integer, default=0, nullable=False)
    last_reset = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    @classmethod
    def get_or_create_counter(cls, db, user_id: int) -> 'ExtractionCounter':
        counter = db.query(cls).filter(cls.user_id == user_id).first()
        if not counter:
            counter = ExtractionCounter(user_id=user_id)
            db.add(counter)
            db.commit()
            db.refresh(counter)
        return counter
    
    def should_reset_counter(self) -> bool:
        """Check if the counter should be reset (monthly)"""
        return datetime.utcnow() >= self.last_reset + timedelta(days=30)
    
    def reset_counter(self, db):
        """Reset the counter and update the last reset timestamp"""
        self.count = 0
        self.last_reset = datetime.utcnow()
        db.commit()
    
    def increment(self, db, amount: int = 1) -> int:
        """Increment the counter and return the new count"""
        if self.should_reset_counter():
            self.reset_counter(db)
        
        self.count += amount
        db.commit()
        return self.count


class JobType(enum.Enum):
    FULL_TIME = "Full-Time"
    PART_TIME = "Part-Time"
    CONTRACT = "Contract"
    FREELANCE = "Freelance"
    INTERNSHIP = "Internship"
    TEMPORARY = "Temporary"
    OTHER = "Other"

class JobStatus(enum.Enum):
    SAVED = "Saved"
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    OFFER = "Offer"
    REJECTED = "Rejected"
    ACCEPTED = "Accepted"
    WITHDRAWN = "Withdrawn"

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    stripe_customer_id = Column(String, unique=True, nullable=True, index=True)  # ID del cliente en Stripe
    
    # Relationship with password reset requests
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship with jobs
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship with subscription
    subscription = relationship("UserSubscription", back_populates="user", uselist=False, cascade="all, delete-orphan")


class PasswordReset(Base):
    __tablename__ = 'password_resets'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationship with user
    user = relationship("User", back_populates="password_resets")


class EmailVerification(Base):
    __tablename__ = 'email_verifications'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    used = Column(Boolean, default=False)

T = TypeVar('T')

class PaginationParams(BaseModel):
    page: int = 1
    size: int = 10

class PaginatedResult(BaseModel, Generic[T]):
    total: int
    items: List[T]
    page: int
    size: int


class UserSubscription(Base):
    """Modelo para las suscripciones de usuarios
    
    Atributos:
        user_id: ID del usuario
        stripe_subscription_id: ID de la suscripción en Stripe
        status: Estado de la suscripción (active, past_due, canceled, etc.)
        current_period_start: Inicio del período de facturación actual
        current_period_end: Fin del período de facturación actual
        cancel_at_period_end: Si la suscripción se cancelará al final del período
    """
    __tablename__ = 'user_subscriptions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    stripe_subscription_id = Column(String(100), unique=True, nullable=True)
    status = Column(String(20), nullable=False, default='active')  # active, past_due, canceled, unpaid, incomplete, incomplete_expired, trialing
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="subscription")


class Job(Base):
    __tablename__ = 'jobs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    position = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    salary = Column(String, nullable=True)  # Using String for flexibility (can store ranges or currency symbols)
    job_type = Column(Enum(JobType), nullable=True)
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.SAVED)
    date_added = Column(DateTime, nullable=False, default=datetime.utcnow)
    date_modified = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    link = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationship with user
    user = relationship("User", back_populates="jobs")
