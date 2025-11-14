# Updated Pydantic models for job_controller.py
# Add these to replace the existing models in job_controller.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Pydantic models for request/response
class JobBase(BaseModel):
    position: str
    company: str
    location: Optional[str] = None
    salary: Optional[str] = None
    job_type: Optional[str] = None  
    status: Optional[str] = "Saved"  
    link: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[str] = None  
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
    skills: Optional[str] = None
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
    status: str  
    job_type: Optional[str] = None  

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class JobStatusCount(BaseModel):
    Saved: int = 0
    Applied: int = 0
    Interview: int = 0
    Offer: int = 0
    Rejected: int = 0
    Accepted: int = 0
    Withdrawn: int = 0
