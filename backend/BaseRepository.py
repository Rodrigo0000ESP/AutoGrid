from dotenv import load_dotenv
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Type, TypeVar, Generic, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Dict, Any
from pagination import PaginationParams, PaginatedResult

load_dotenv()

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)
DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL environment variable not set. Please check your .env file and its location.")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
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
        
    def get_paginated_from_db(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search_terms: str = None,
        search_fields: List[str] = None,
        order_by=None,
        **filters
    ) -> Any:
        """
        Get paginated results from the database with optional search and filtering
        
        Args:
            db: Database session
            page: Page number (1-based)
            page_size: Number of items per page
            search_terms: Search string to filter results
            search_fields: List of field names to search in
            order_by: SQLAlchemy column to order by
            **filters: Additional filters to apply (field=value)
            
        Returns:
            Paginated results with metadata
        """
        from sqlalchemy import or_, func
        
        # Start building the query
        query = db.query(self.model)
        
        # Apply search if search_terms and search_fields are provided
        if search_terms and search_fields:
            search_conditions = []
            for term in search_terms.split():
                term_conditions = []
                for field in search_fields:
                    if hasattr(self.model, field):
                        column = getattr(self.model, field)
                        if column is not None:  # Only add condition if column exists
                            term_conditions.append(column.ilike(f'%{term}%'))
                
                if term_conditions:
                    search_conditions.append(or_(*term_conditions))
            
            if search_conditions:
                query = query.filter(or_(*search_conditions))
        
        # Apply additional filters
        for field, value in filters.items():
            if hasattr(self.model, field) and value is not None:
                column = getattr(self.model, field)
                if isinstance(value, (list, tuple, set)):
                    query = query.filter(column.in_(value))
                else:
                    query = query.filter(column == value)
        
        # Get total count before pagination
        total = query.count()
        
        # Calculate total pages
        pages = (total + page_size - 1) // page_size if page_size > 0 else 1
        
        # Apply pagination
        offset = (page - 1) * page_size
        items = query.order_by(order_by).offset(offset).limit(page_size).all()
        
        # Convert SQLAlchemy models to dictionaries
        items_dict = []
        for item in items:
            item_dict = {}
            for column in self.model.__table__.columns:
                item_dict[column.name] = getattr(item, column.name)
            items_dict.append(item_dict)
        
        # Return as a dictionary with the correct field names
        return {
            "items": items_dict,
            "total": total,
            "page": page,
            "size": len(items),
            "pages": pages,
            "hasPrev": page > 1,
            "hasNext": page < pages
        }

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
