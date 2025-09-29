"""
File upload controller with DigitalOcean Spaces integration and plan limits
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import io

from dependencies import get_db
from jwt_utils import get_current_user
from models import User
from plan_middleware import PlanChecker
from .file_upload_service import FileUploadService, FileUploadError


router = APIRouter(prefix="/files", tags=["File Upload"])


def get_file_upload_service() -> FileUploadService:
    """Dependency to get file upload service instance"""
    return FileUploadService()


@router.post("/upload", response_model=Dict[str, Any])
async def upload_file(
    file: UploadFile = File(...),
    replace_existing: bool = True,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    """
    Upload a single file for the authenticated user.
    Each user can only have one file at a time.
    
    Args:
        file: The file to upload
        replace_existing: Whether to replace existing file (default: True)
        current_user: Authenticated user information
        db: Database session
        upload_service: File upload service instance
        
    Returns:
        Dict containing file metadata and upload status
    """
    try:
        # Get user and check plan limits
        user = db.query(User).filter(User.id == current_user["id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's plan details
        plan_name, plan_details, is_trial = PlanChecker.get_user_plan(db, user)
        
        # Check if user's plan allows file uploads
        # For now, we'll allow file uploads for all plans, but you can add restrictions here
        # Example: if plan_name == "free" and not is_trial: raise HTTPException(...)
        
        # Check if user already has a file and handle based on replace_existing flag
        existing_file = upload_service.get_user_file(current_user["id"])
        if existing_file and not replace_existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has a file. Set replace_existing=true to replace it."
            )
        
        # Read file content
        file_content = await file.read()
        
        # Upload file
        file_metadata = upload_service.upload_file(
            user_id=current_user["id"],
            file_content=file_content,
            filename=file.filename,
            replace_existing=replace_existing
        )
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "file": {
                "file_id": file_metadata["file_id"],
                "filename": file_metadata["original_filename"],
                "size": file_metadata["file_size"],
                "content_type": file_metadata["content_type"],
                "upload_date": file_metadata["upload_date"],
                "storage_type": file_metadata["storage_type"]
            },
            "user_plan": {
                "plan_name": plan_name,
                "is_trial": is_trial
            }
        }
        
    except FileUploadError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.get("/my-file", response_model=Dict[str, Any])
async def get_my_file(
    current_user: dict = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    """
    Get information about the current user's uploaded file.
    
    Returns:
        Dict containing file metadata or null if no file exists
    """
    try:
        file_metadata = upload_service.get_user_file(current_user["id"])
        
        if not file_metadata:
            return {
                "success": True,
                "file": None,
                "message": "No file found for this user"
            }
        
        return {
            "success": True,
            "file": {
                "file_id": file_metadata["file_id"],
                "filename": file_metadata["original_filename"],
                "size": file_metadata["file_size"],
                "content_type": file_metadata["content_type"],
                "upload_date": file_metadata["upload_date"],
                "storage_type": file_metadata["storage_type"]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file information: {str(e)}"
        )


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    """
    Download the user's uploaded file.
    
    Args:
        file_id: ID of the file to download
        current_user: Authenticated user information
        upload_service: File upload service instance
        
    Returns:
        StreamingResponse with file content
    """
    try:
        # Get user's file metadata
        file_metadata = upload_service.get_user_file(current_user["id"])
        
        if not file_metadata:
            raise HTTPException(status_code=404, detail="No file found for this user")
        
        if file_metadata["file_id"] != file_id:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Download file content
        file_content = upload_service.download_file(current_user["id"], file_id)
        
        if not file_content:
            raise HTTPException(status_code=404, detail="File content not found")
        
        # Create streaming response
        file_stream = io.BytesIO(file_content)
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=file_metadata["content_type"],
            headers={
                "Content-Disposition": f"attachment; filename=\"{file_metadata['original_filename']}\""
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}"
        )


@router.delete("/delete/{file_id}", response_model=Dict[str, Any])
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    """
    Delete the user's uploaded file.
    
    Args:
        file_id: ID of the file to delete
        current_user: Authenticated user information
        upload_service: File upload service instance
        
    Returns:
        Dict containing deletion status
    """
    try:
        # Get user's file metadata to verify ownership
        file_metadata = upload_service.get_user_file(current_user["id"])
        
        if not file_metadata:
            raise HTTPException(status_code=404, detail="No file found for this user")
        
        if file_metadata["file_id"] != file_id:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete file
        success = upload_service.delete_file(current_user["id"], file_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file"
            )
        
        return {
            "success": True,
            "message": "File deleted successfully",
            "deleted_file": {
                "file_id": file_id,
                "filename": file_metadata["original_filename"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )


@router.get("/storage-info", response_model=Dict[str, Any])
async def get_storage_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    """
    Get storage information for the current user including plan limits.
    
    Returns:
        Dict containing storage usage and plan information
    """
    try:
        # Get user and plan information
        user = db.query(User).filter(User.id == current_user["id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        plan_name, plan_details, is_trial = PlanChecker.get_user_plan(db, user)
        
        # Get current file information
        current_file = upload_service.get_user_file(current_user["id"])
        
        # Calculate storage usage
        used_storage = current_file["file_size"] if current_file else 0
        max_file_size = upload_service.config.max_file_size
        
        return {
            "success": True,
            "storage_info": {
                "has_file": current_file is not None,
                "used_storage": used_storage,
                "max_file_size": max_file_size,
                "storage_type": upload_service.config.storage_type.value,
                "allowed_extensions": list(upload_service.config.allowed_extensions)
            },
            "plan_info": {
                "plan_name": plan_name,
                "is_trial": is_trial,
                "plan_details": plan_details
            },
            "current_file": {
                "file_id": current_file["file_id"],
                "filename": current_file["original_filename"],
                "size": current_file["file_size"],
                "upload_date": current_file["upload_date"]
            } if current_file else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get storage information: {str(e)}"
        )
