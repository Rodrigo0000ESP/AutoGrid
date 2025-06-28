
from dotenv import load_dotenv
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Type, TypeVar, Generic, List, Optional
from sqlalchemy.orm import Session
from backend.pagination import PaginationParams

load_dotenv()

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)
DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL environment variable not set. Please check your .env file and its location.")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T]):
        self.model = model

    def get_all(self, db: Session) -> List[T]:
        return db.query(self.model).all()

    def get_paginated_items(self, db: Session, params: PaginationParams) -> List[T]:
        offset = (params.page - 1) * params.size
        return db.query(self.model).offset(offset).limit(params.size).all()

    def update_by_id(self, db: Session, obj_id: int, update_data: dict) -> Optional[T]:
        obj = db.query(self.model).filter(self.model.id == obj_id).first()
        if obj:
            for key, value in update_data.items():
                setattr(obj, key, value)
            db.commit()
            db.refresh(obj)
        return obj

    def remove_by_id(self, db: Session, obj_id: int) -> bool:
        obj = db.query(self.model).filter(self.model.id == obj_id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False
