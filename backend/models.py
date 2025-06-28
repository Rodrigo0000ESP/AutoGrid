from sqlalchemy import Column, Integer, String
from backend.BaseRepository import Base
from backend.pagination import PaginationParams, PaginatedResult
from pydantic import BaseModel
from typing import List, Generic, TypeVar, Optional


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)

T = TypeVar('T')

class PaginationParams(BaseModel):
    page: int = 1
    size: int = 10

class PaginatedResult(BaseModel, Generic[T]):
    total: int
    items: List[T]
    page: int
    size: int
