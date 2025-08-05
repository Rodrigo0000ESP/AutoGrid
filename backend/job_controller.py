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

class JobWorkflowRequest(BaseModel):
    url: str
    html_content: str
    title: Optional[str] = None

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

@router.post("/workflow", response_model=JobResponse)
def job_creation_workflow(
    request_data: JobWorkflowRequest, 
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Manages the entire job creation workflow from a single API call.
    1. Pre-parses HTML to clean it.
    2. Uses LLM to extract structured data.
    3. Saves the job offer to the database.
    """
    html_parser = HtmlParser()
    llm_parser = LlmJobParser()
    service = JobService()

    try:
        # 1. Pre-parse HTML
        pre_parsed_data = html_parser.preparse_html(request_data.html_content, request_data.url)
        if not pre_parsed_data or not pre_parsed_data.get("content"):
            raise HTTPException(status_code=400, detail="Could not extract content from HTML.")

        # 2. Use LLM to extract structured data
        extracted_data = llm_parser.parse_job_listing(
            parsed_text=pre_parsed_data["content"],
            url=request_data.url,
            title=request_data.title,
            portal=pre_parsed_data.get("portal")
        )

        # 3. Save the job offer
        created_job = service.create_job(
            db=db,
            user_id=current_user["id"],
            job_data=extracted_data
        )
        return created_job

    except Exception as e:
        import logging
        logging.error(f"Error in job creation workflow: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during the job creation workflow.")

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
    
    if not html_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HTML content is required"
        )
    
    # Pre-parse HTML
    html_parser = HtmlParser()
    parsed_html = html_parser.preparse_html(html_content, url)

    if parsed_html is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse HTML content"
        )
    if parsed_html.get("structured_data"):
        structured_data = parsed_html.get("structured_data", {})
    else:
        structured_data = { "portal": "To be Determined by LLM", "job_title": "To be Determined by LLM", "company": "To be Determined by LLM", "location": "To be Determined by LLM", "job_type": "To be Determined by LLM" }
    
    parsed_text = parsed_html.get("content", "")

    
    # Create response with all data
    response_data = {
        "status": "success",
        "parsed_text": parsed_text,
        "url": url,
        "portal": structured_data.get("portal", ""),
        "title": structured_data.get("job_title", ""),
        "company": structured_data.get("company", ""),
        "location": structured_data.get("location", ""),
        "job_type": structured_data.get("job_type", ""),
        "raw_data": parsed_html  
    }
    
    return response_data

@router.post("/parse-job-with-ai", status_code=status.HTTP_200_OK)
def parse_job_with_ai(
    job_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Parse job offer using AI to extract structured data.
    This version prioritizes the structured data extracted by the HTML parser.
    """
    parsed_data = job_data.get("parsed_html", {})
    title = parsed_data.get("title", "Untitled Position") 
    url = parsed_data.get("url", "")
    parsed_text = parsed_data.get("parsed_text", "")    
    company = parsed_data.get("company", "")
    location = parsed_data.get("location", "")
    job_type = parsed_data.get("job_type", "")
    portal = parsed_data.get("portal", "")
     
    
    try:
        # Try to use the parser with OpenAI API
        llm_parser = LlmJobParser()
        parsed_job_data = llm_parser.parse_job_listing(parsed_text, url, title,company,location,job_type,portal)
        
        return {
            "status": "success",
            "parsed_job_data": parsed_job_data
        }
    except Exception as e:
        # If it fails, use test mode
        print(f"Error using LLM parser: {str(e)}. Falling back to test mode.")
        llm_parser = LlmJobParser(test_mode=True)
        parsed_job_data = llm_parser.parse_job_listing(parsed_text, url, title,company,location,job_type)
        
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
    Save a job offer from the extension.
    
    This endpoint expects the job data to be already parsed by the HTML parser and/or AI parser.
    The parsing should be handled by the /jobs/preparse-job-offer and /jobs/parse-job-with-ai endpoints.
    
    Expected request format:
    {
        "position": "Job Title",
        "company": "Company Name",
        "location": "Location",
        "job_type": "Full-time",
        "description": "Job description...",
        "salary": "$100,000 - $120,000",
        "link": "https://example.com/job/123",
        "status": "Saved"  # Optional, defaults to "Saved"
    }
    """
    service = JobService()
    
    # Get the job data, using empty strings as defaults for required fields
    job_dict = {
        "position": job_data.get("position") or job_data.get("title") or "Untitled Position",
        "company": job_data.get("company", ""),
        "location": job_data.get("location", ""),
        "salary": job_data.get("salary", ""),
        "job_type": (job_data.get("job_type") or "Other").strip().title(),
        "description": job_data.get("description", ""),
        "link": job_data.get("link") or job_data.get("url", ""),
        "status": job_data.get("status", JobStatus.SAVED.value),
        "notes": job_data.get("notes", "")
    }
    
    # Ensure job_type is not empty
    if not job_dict["job_type"]:
        job_dict["job_type"] = "Other"
    
    # Create the job in the database
    try:
        job = service.create_job(db, current_user["id"], job_dict)
        return job
    except Exception as e:
        print(f"Error creating job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create job: {str(e)}"
        )
