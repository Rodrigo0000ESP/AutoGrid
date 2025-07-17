from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from BaseRepository import SessionLocal
from job_service import JobService
from models import JobType, JobStatus
from jwt_utils import get_current_user
from html_parser import HtmlParser
from llm_job_parser import LlmJobParser

router = APIRouter(prefix="/jobs", tags=["jobs"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for request/response
class JobBase(BaseModel):
    position: str
    company: str
    location: Optional[str] = None
    salary: Optional[str] = None
    job_type: Optional[str] = None  # Will convert to enum
    status: Optional[str] = "Saved"  # Default to SAVED
    link: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    position: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    job_type: Optional[str] = None
    status: Optional[str] = None
    link: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class JobResponse(JobBase):
    id: int
    user_id: int
    date_added: datetime
    date_modified: datetime

    class Config:
        from_attributes = True

class JobStatusCount(BaseModel):
    Saved: int = 0
    Applied: int = 0
    Interview: int = 0
    Offer: int = 0
    Rejected: int = 0
    Accepted: int = 0
    Withdrawn: int = 0
    total: int = 0

@router.post("/", response_model=JobResponse)
def create_job(job: JobCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Create a new job entry
    """
    service = JobService()
    
    try:
        # Convert to dict for service
        job_data = job.dict()
        created_job = service.create_job(
            db=db,
            user_id=current_user["id"],
            job_data=job_data
        )
        return created_job
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[JobResponse])
def get_jobs(
    skip: int = 0, 
    limit: int = 100,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all jobs for the current user, with optional filtering by status
    """
    service = JobService()
    
    try:
        if status:
            return service.get_jobs_by_status(db, current_user["id"], status, skip, limit)
        
        return service.get_jobs_by_user(db, current_user["id"], skip, limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid options are: {[s.value for s in JobStatus]}")

@router.get("/status-counts", response_model=JobStatusCount)
def get_job_status_counts(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get counts of jobs by status for the current user
    """
    service = JobService()
    return service.count_jobs_by_status(db, current_user["id"])

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get a specific job by ID
    """
    service = JobService()
    job = service.get_job_by_id(db, job_id, current_user["id"])
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job

@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int, 
    job_update: JobUpdate, 
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Update a job by ID
    """
    service = JobService()
    
    # Check if job exists
    existing_job = service.get_job_by_id(db, job_id, current_user["id"])
    if not existing_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Prepare update data
    update_data = job_update.dict(exclude_unset=True)
    
    try:
        updated_job = service.update_job(db, job_id, current_user["id"], update_data)
        return updated_job
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Delete a job by ID
    """
    service = JobService()
    success = service.delete_job(db, job_id, current_user["id"])
    
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return None

@router.post("/preparse-job-offer", status_code=status.HTTP_200_OK)
def preparse_job_offer(
    job_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Pre-parse job offer HTML to prepare it for LLM processing
    """
    # Extract data from the request
    html_content = job_data.get("html_content", "")
    url = job_data.get("url", "")
    title = job_data.get("title", "")
    
    if not html_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HTML content is required"
        )
    
    # Pre-parse HTML
    html_parser = HtmlParser()
    parsed_html = html_parser.preparse_html(html_content, url)
    
    # For backward compatibility, also include parsed_text
    parsed_text = parsed_html.get("content", "")
    
    return {
        "status": "success",
        "parsed_html": parsed_html,
        "parsed_text": parsed_text,  # For backward compatibility
        "url": url,
        "title": title
    }

@router.post("/parse-job-with-ai", status_code=status.HTTP_200_OK)
def parse_job_with_ai(
    job_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Parse job offer text using AI to extract structured data
    """
    # Extract data from the request
    url = job_data.get("url", "")
    title = job_data.get("title", "")
    
    # Handle all possible input formats
    parsed_text = job_data.get("parsed_text", "")
    parsed_html = job_data.get("parsed_html", None)
    html_content = job_data.get("html_content", "")
    
    # If we have raw HTML content but no parsed content, try to parse it
    if html_content and not parsed_html and not parsed_text:
        try:
            html_parser = HtmlParser()
            parsed_html = html_parser.preparse_html(html_content, url)
        except Exception as e:
            print(f"Error pre-parsing HTML: {str(e)}")
            # Create a basic structure if parsing fails
            parsed_html = {"content": html_content[:10000], "portal": None}
    
    # If we have the old format but not the new format, convert it
    elif parsed_text and not parsed_html:
        parsed_html = {"content": parsed_text, "portal": None}
    # If we have neither, use the title and URL as minimal content
    elif not parsed_html:
        minimal_content = f"Job Title: {title}\nURL: {url}"
        parsed_html = {"content": minimal_content, "portal": None}
    
    # Parse job with LLM
    try:
        # Try to use the parser with OpenAI API
        llm_parser = LlmJobParser()
        parsed_job_data = llm_parser.parse_job_listing(parsed_html, url, title)
        
        return {
            "status": "success",
            "parsed_job_data": parsed_job_data
        }
    except Exception as e:
        # If it fails, use test mode
        print(f"Error using LLM parser: {str(e)}. Falling back to test mode.")
        llm_parser = LlmJobParser(test_mode=True)
        parsed_job_data = llm_parser.parse_job_listing(parsed_html, url, title)
        
        return {
            "status": "success",
            "parsed_job_data": parsed_job_data,
            "note": "Used test mode due to API issues"
        }

@router.post("/save", status_code=status.HTTP_201_CREATED, response_model=JobResponse)
def save_job_offer(
    job_data: dict = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a job offer from the extension
    """
    service = JobService()
    
    # Check if we have parsed job data
    parsed_job_data = job_data.get("parsed_job_data", {})
    html_content = job_data.get("html_content", "")
    
    # If we have HTML content but no parsed data, try to parse it
    if html_content and not parsed_job_data:
        try:
            # Pre-parse HTML
            html_parser = HtmlParser()
            url = job_data.get("url", "")
            parsed_html = html_parser.preparse_html(html_content, url)
            
            # Parse with LLM
            llm_parser = LlmJobParser()
            parsed_job_data = llm_parser.parse_job_listing(
                parsed_html, 
                url, 
                job_data.get("title", "")
            )
        except Exception as e:
            print(f"Error parsing job data: {str(e)}")
            # Continue with basic info if parsing fails
    
    # Extract data from the job offer or use parsed data
    if parsed_job_data:
        position = parsed_job_data.get("position", job_data.get("title", "Untitled Position"))
        company = parsed_job_data.get("company", "")
        location = parsed_job_data.get("location", "")
        salary = parsed_job_data.get("salary", "")
        job_type = parsed_job_data.get("job_type", "")
        description = parsed_job_data.get("description", "")
        url = parsed_job_data.get("link", job_data.get("url", ""))
    else:
        position = job_data.get("title", "Untitled Position")
        company = ""
        location = ""
        salary = ""
        job_type = ""
        description = ""
        url = job_data.get("url", "")
    
    # Create job data dictionary
    job_dict = {
        "position": position,
        "company": company,
        "location": location,
        "salary": salary,
        "job_type": job_type,
        "description": description,
        "link": url
    }
    
    # Create a new job with the extracted information
    job = service.create_job(db, current_user["id"], job_dict)
    
    return job
