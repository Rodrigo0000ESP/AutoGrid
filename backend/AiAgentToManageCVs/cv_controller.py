import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel

from dependencies import get_current_user, get_db
from AiAgentToManageCVs.cv_service import CVService
from storage.file_upload_service import FileUploadService

router = APIRouter(prefix="/cv", tags=["cv"])


class GenerateCVFromJobRequest(BaseModel):
    """Request model for generating CV from job offer"""
    job_id: int


@router.post("/generate")
async def generate_cv_from_offer(
    cv_file: UploadFile = File(..., description="Original CV file (PDF or DOCX)"),
    job_description: str = Form(..., description="Job offer description"),
    job_skills: str = Form(..., description="Required skills"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate CV based on job offer
    - PDF: Returns AI suggestions as JSON
    - DOCX: Returns modified CV file maintaining original style
    """
    # Validate file type
    allowed_extensions = ['pdf', 'docx']
    file_extension = cv_file.filename.split('.')[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 10MB)
    content = await cv_file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Generate CV using AI
        cv_service = CVService()
        result = cv_service.generate_cv(tmp_file_path, job_description, job_skills)
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        # Return based on result type
        if result["type"] == "suggestion":
            # PDF: Return suggestions as JSON
            return JSONResponse(content={
                "status": "success",
                "type": "suggestion",
                "data": {
                    "suggestions": result["content"],
                    "original_text": result["original_text"][:500] + "..."  # Preview only
                }
            })
        else:
            # DOCX: Return modified file
            return StreamingResponse(
                result["content"],
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename={result['filename']}"
                }
            )
        
    except Exception as e:
        # Clean up temp file if exists
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating CV: {str(e)}"
        )


@router.post("/analyze")
async def analyze_cv(
    cv_file: UploadFile = File(..., description="CV file to analyze"),
    job_description: str = Form(..., description="Job offer description"),
    job_skills: str = Form(..., description="Required skills"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze CV and get AI suggestions without generating new file
    Works with both PDF and DOCX
    """
    # Validate file type
    allowed_extensions = ['pdf', 'docx']
    file_extension = cv_file.filename.split('.')[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        content = await cv_file.read()
        
        # Save temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Extract text based on file type
        cv_service = CVService()
        
        if file_extension == 'pdf':
            import pdfplumber
            with pdfplumber.open(tmp_file_path) as pdf:
                cv_text = "\n".join([page.extract_text() for page in pdf.pages])
        else:
            from docx import Document
            doc = Document(tmp_file_path)
            cv_text = "\n".join([para.text for para in doc.paragraphs])
        
        # Generate suggestions
        suggestions = cv_service.generate_suggestion(cv_text, job_description, job_skills)
        
        # Clean up
        os.unlink(tmp_file_path)
        
        return JSONResponse(content={
            "status": "success",
            "data": {
                "suggestions": suggestions,
                "cv_preview": cv_text[:500] + "..."
            }
        })
        
    except Exception as e:
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing CV: {str(e)}"
        )


@router.post("/generate-from-job")
async def generate_cv_from_job_offer(
    request: GenerateCVFromJobRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate CV from stored user CV and job offer data
    - Fetches user's uploaded CV from storage
    - Retrieves job offer details from database
    - Generates customized CV based on job requirements
    - Returns PDF suggestions or DOCX file
    """
    from models import Job
    
    user_id = current_user.get("id")
    
    # Get job details from database
    job = db.query(Job).filter(Job.id == request.job_id, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to access it"
        )
    
    # Get user's uploaded CV from storage
    file_service = FileUploadService()
    user_file = file_service.get_user_file(user_id)
    
    if not user_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No CV found. Please upload your CV first in CV Management."
        )
    
    # Download CV content
    cv_content = file_service.download_file(user_id, user_file['file_id'])
    if not cv_content:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve CV from storage"
        )
    
    # Validate file type
    file_extension = user_file['original_filename'].split('.')[-1].lower()
    if file_extension not in ['pdf', 'docx']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CV must be in PDF or DOCX format"
        )
    
    try:
        # Save CV temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as tmp_file:
            tmp_file.write(cv_content)
            tmp_file_path = tmp_file.name
        
        # Get or create detailed job analysis
        from models import CVJobAnalysis
        from AiAgentToManageCVs.cv_job_analyzer import CVJobAnalyzer
        
        cv_analysis = db.query(CVJobAnalysis).filter(CVJobAnalysis.job_id == request.job_id).first()
        
        # If analysis exists but not yet processed, analyze now
        if cv_analysis and cv_analysis.raw_html and not cv_analysis.required_skills:
            try:
                import json
                # Parse the stored JSON data from HtmlParser
                parsed_data = json.loads(cv_analysis.raw_html)
                
                # Get the best content available
                # Priority: html_container (for LinkedIn) > content (cleaned text)
                html_content = parsed_data.get("html_container") or parsed_data.get("content", "")
                
                # Analyze with AI
                analyzer = CVJobAnalyzer()
                analysis_data = analyzer.analyze_job_html(
                    html_content,
                    job.description or ""
                )
                
                # Update analysis in database
                cv_analysis.required_skills = analysis_data.get("required_skills")
                cv_analysis.preferred_skills = analysis_data.get("preferred_skills")
                cv_analysis.required_qualifications = analysis_data.get("required_qualifications")
                cv_analysis.preferred_qualifications = analysis_data.get("preferred_qualifications")
                cv_analysis.responsibilities = analysis_data.get("responsibilities")
                cv_analysis.keywords = analysis_data.get("keywords")
                db.commit()
            except Exception as e:
                import logging
                logging.warning(f"Failed to analyze job HTML: {e}")
        
        # Prepare job information for CV generation
        if cv_analysis and cv_analysis.required_skills:
            # Use detailed analysis
            analyzer = CVJobAnalyzer()
            job_description = analyzer.format_for_cv_generation({
                "required_skills": cv_analysis.required_skills,
                "preferred_skills": cv_analysis.preferred_skills,
                "required_qualifications": cv_analysis.required_qualifications,
                "preferred_qualifications": cv_analysis.preferred_qualifications,
                "responsibilities": cv_analysis.responsibilities,
                "keywords": cv_analysis.keywords
            })
            job_skills = analyzer.get_all_skills_text({
                "required_skills": cv_analysis.required_skills,
                "preferred_skills": cv_analysis.preferred_skills
            })
        else:
            # Fallback to basic info
            job_description = job.description or f"{job.position} at {job.company}"
            job_skills = "Not specified"
        
        # Generate CV using AI
        cv_service = CVService()
        result = cv_service.generate_cv(tmp_file_path, job_description, job_skills)
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        # Return based on result type
        if result["type"] == "suggestion":
            # PDF: Return suggestions as JSON
            return JSONResponse(content={
                "status": "success",
                "type": "suggestion",
                "job_info": {
                    "position": job.position,
                    "company": job.company,
                    "location": job.location
                },
                "data": {
                    "suggestions": result["content"],
                    "original_filename": user_file['original_filename']
                }
            })
        else:
            # DOCX: Return modified file
            filename = f"CV_{job.company}_{job.position}.docx".replace(" ", "_")
            return StreamingResponse(
                result["content"],
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        
    except Exception as e:
        # Clean up temp file if exists
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating CV: {str(e)}"
        )
