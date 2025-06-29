from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.BaseRepository import Base
from backend.pagination import PaginationParams, PaginatedResult
from pydantic import BaseModel
from typing import List, Generic, TypeVar, Optional
from datetime import datetime


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    
    # Relationship with password reset requests
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")


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
