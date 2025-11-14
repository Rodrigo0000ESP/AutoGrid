from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, TypeVar
from BaseRepository import BaseRepository
from models import Job, JobStatus, JobType, UserSubscription
from pagination import PaginatedResult
from datetime import datetime

# Define a type variable for generic type hints
T = TypeVar('T', bound=Job)

class JobService:
    def __init__(self):
        self.repository = BaseRepository(Job)
    
    def create_job(self, db: Session, user_id: int, job_data: dict) -> Job:
        """
        Create a new job entry for a user
        
        Args:
            db: Database session
            user_id: ID of the user creating the job
            job_data: Dictionary containing job details
            
        Returns:
            Job: The created job object
        """
        # Convert string to enum for job_type if provided
        job_type_enum = None
        if job_data.get("job_type"):
            job_type_enum = JobType(job_data["job_type"])
        
        # Convert string to enum for status
        status_enum = JobStatus.SAVED
        if job_data.get("status"):
            status_enum = JobStatus(job_data["status"])
        
        try:
            # Create job object
            job = Job(
                user_id=user_id,
                position=job_data.get("position", ""),
                company=job_data.get("company", ""),
                location=job_data.get("location"),
                salary=job_data.get("salary"),
                job_type=job_type_enum,
                status=status_enum,
                link=job_data.get("link"),
                description=job_data.get("description"),
                notes=job_data.get("notes")
            )
            
            # Add to database
            db.add(job)
            db.commit()
            db.refresh(job)
            return job
            
        except Exception as e:
            db.rollback()
            raise e
        except Exception as e:
            db.rollback()
            raise e
    
    def get_jobs_by_user(self, db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Job]:
        """
        Get all jobs for a specific user with pagination
        """
        return db.query(Job).filter(Job.user_id == user_id).offset(skip).limit(limit).all()
    
    def get_job_by_id(self, db: Session, job_id: int, user_id: int) -> Optional[Job]:
        """
        Get a specific job by ID, ensuring it belongs to the specified user
        """
        return db.query(Job).filter(Job.id == job_id, Job.user_id == user_id).first()
    
    def update_job(self, db: Session, job_id: int, user_id: int, update_data: dict) -> Optional[Job]:
        """
        Update a job with the provided fields
        """
        # Get the job
        job = self.get_job_by_id(db, job_id, user_id)
        if not job:
            return None
            
        # Convert job_type string to enum if provided
        if "job_type" in update_data and update_data["job_type"]:
            update_data["job_type"] = JobType(update_data["job_type"])
        
        # Convert status string to enum if provided
        if "status" in update_data and update_data["status"]:
            update_data["status"] = JobStatus(update_data["status"])
        
        # Update job fields
        for key, value in update_data.items():
            if hasattr(job, key):
                setattr(job, key, value)
        
        # Update modified date
        job.date_modified = datetime.utcnow()
        
        # Save changes
        db.commit()
        db.refresh(job)
        return job
    
    def delete_job(self, db: Session, job_id: int, user_id: int) -> bool:
        """
        Delete a job by ID, ensuring it belongs to the specified user
        """
        job = self.get_job_by_id(db, job_id, user_id)
        if not job:
            return False
            
        db.delete(job)
        db.commit()
        return True
        
    def delete_all_user_jobs(self, db: Session, user_id: int) -> int:
        """
        Delete all jobs belonging to a specific user
        
        Args:
            db: Database session
            user_id: ID of the user whose jobs should be deleted
            
        Returns:
            int: Number of jobs deleted
        """
        try:
            # Get the count before deletion for the return value
            count = db.query(Job).filter(Job.user_id == user_id).count()
            
            # Delete all jobs for the user
            db.query(Job).filter(Job.user_id == user_id).delete(synchronize_session=False)
            db.commit()
            return count
        except Exception as e:
            db.rollback()
            raise e
    
    def get_jobs_by_status(self, db: Session, user_id: int, status: str, 
                          skip: int = 0, limit: int = 100) -> List[Job]:
        """
        Get all jobs for a user with a specific status
        """
        status_enum = JobStatus(status)
        return db.query(Job).filter(
            Job.user_id == user_id, 
            Job.status == status_enum
        ).offset(skip).limit(limit).all()
    
    def count_jobs_by_status(self, db: Session, user_id: int) -> Dict[str, int]:
        """
        Count jobs by status for a specific user
        
        Returns:
            Dict with status counts matching the JobStatusCount model
        """
        result = {}
        for status in JobStatus:
            count = db.query(Job).filter(
                Job.user_id == user_id,
                Job.status == status
            ).count()
            # Use status.name to get the enum name (e.g., 'SAVED') and capitalize it ('Saved')
            result[status.name.capitalize()] = count
        
        # Add total count
        result["total"] = db.query(Job).filter(Job.user_id == user_id).count()
        return result
        
    def get_paginated_jobs(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search_terms: str = None,
        search_fields: List[str] = None,
        **filters: Any
    ) -> Dict[str, Any]:
        """
        Get paginated jobs with optional search and filtering using BaseRepository
        
        Args:
            db: Database session
            page: Page number (1-based)
            page_size: Number of items per page
            search_terms: Search string to filter jobs
            search_fields: List of field names to search in
            **filters: Additional filters to apply (field=value)
            
        Returns:
            Dictionary containing jobs and pagination metadata
        """
        # Convert filter values from string to appropriate types
        processed_filters = {}
        for key, value in filters.items():
            if value is not None:
                # Handle status filter
                if key == 'status' and isinstance(value, str):
                    try:
                        processed_filters[key] = JobStatus[value.upper()]
                    except KeyError:
                        pass  # Invalid status, skip this filter
                # Handle job_type filter
                elif key == 'job_type' and isinstance(value, str):
                    try:
                        # Convert "Part-Time" to "PART_TIME" for enum lookup
                        enum_key = value.upper().replace('-', '_')
                        processed_filters[key] = JobType[enum_key]
                    except KeyError:
                        pass  # Invalid job type, skip this filter
                # Handle boolean filters
                elif key in ['is_remote', 'is_hybrid']:
                    if isinstance(value, str):
                        processed_filters[key] = value.lower() in ('true', '1', 't')
                    else:
                        processed_filters[key] = bool(value)
                # Handle numeric filters
                elif key in ['min_salary', 'max_salary', 'experience_years']:
                    try:
                        processed_filters[key] = int(value)
                    except (ValueError, TypeError):
                        pass  # Invalid number, skip this filter
                else:
                    processed_filters[key] = value
        
        # Use BaseRepository's get_paginated_from_db method
        return self.repository.get_paginated_from_db(
            db=db,
            page=page,
            page_size=page_size,
            search_terms=search_terms,
            search_fields=search_fields or ["position", "company", "description", "location"],
            order_by=Job.date_modified.desc(),
            **processed_filters
        )
    
    def save_job_offer(self, db: Session, user_id: int, title: str, url: str, html_content: str = None) -> Job:
        """
        Save a job offer from the extension
        
        Args:
            db: Database session
            user_id: ID of the current user
            title: Job title from the page
            url: URL of the job listing
            html_content: Optional HTML content of the page
            
        Returns:
            Created Job object
        """
        # Initialize job data with minimal information
        job_data = {
            "position": title or "Untitled Position",
            "company": "",
            "link": url
        }
        
        # If HTML content is provided, try to extract more data
        if html_content and url:
            try:
                from llm_job_parser import LlmJobParser
                llm_parser = LlmJobParser()
                
                # Extract job data from HTML
                extracted_data = llm_parser.extract_job_data(html_content, url)
                
                # Update job data with extracted information
                if extracted_data:
                    for key, value in extracted_data.items():
                        if value:  # Only update if value is not empty
                            job_data[key] = value
                            
                    # Use extracted position if available
                    if "position" in extracted_data and extracted_data["position"]:
                        job_data["position"] = extracted_data["position"]
                        
            except Exception as e:
                import logging
                logging.error(f"Error extracting job data: {str(e)}")
                # Continue with minimal job data
        
        # Create job with available data
        job = Job(
            user_id=user_id,
            position=job_data.get("position", "Untitled Position"),
            company=job_data.get("company", ""),
            location=job_data.get("location"),
            salary=job_data.get("salary"),
            job_type=job_data.get("job_type"),
            link=job_data.get("link"),
            description=job_data.get("description"),
            status=JobStatus.SAVED
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
