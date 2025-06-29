from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Enum
from sqlalchemy.orm import relationship
from backend.BaseRepository import Base
from backend.pagination import PaginationParams, PaginatedResult
from pydantic import BaseModel
from typing import List, Generic, TypeVar, Optional
from datetime import datetime
import enum
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
    
    # Relationship with password reset requests
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship with jobs
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")


class PasswordReset(Base):
    __tablename__ = 'password_resets'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationship with user
    user = relationship("User", back_populates="password_resets")

T = TypeVar('T')

class PaginationParams(BaseModel):
    page: int = 1
    size: int = 10

class PaginatedResult(BaseModel, Generic[T]):
    total: int
    items: List[T]
    page: int
    size: int

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
