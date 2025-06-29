from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from backend.BaseRepository import BaseRepository
from backend.models import Job, JobStatus, JobType
from datetime import datetime

class JobService:
    def __init__(self):
        self.repository = BaseRepository(Job)
    
    def create_job(self, db: Session, user_id: int, job_data: dict) -> Job:
        """
        Create a new job entry for a user
        """
        # Convert string to enum for job_type if provided
        job_type_enum = None
        if job_data.get("job_type"):
            job_type_enum = JobType(job_data["job_type"])
        
        # Convert string to enum for status
        status_enum = JobStatus.SAVED
        if job_data.get("status"):
            status_enum = JobStatus(job_data["status"])
        
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
        """
        result = {}
        for status in JobStatus:
            count = db.query(Job).filter(
                Job.user_id == user_id,
                Job.status == status
            ).count()
            result[status.value] = count
        
        # Add total count
        result["total"] = db.query(Job).filter(Job.user_id == user_id).count()
        return result
    
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
                from backend.llm_job_parser import LlmJobParser
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
