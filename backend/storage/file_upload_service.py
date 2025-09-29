"""
File upload service with DigitalOcean Spaces integration
"""
import os
import uuid
import hashlib
import mimetypes
from datetime import datetime
from typing import Optional, Dict, Any, BinaryIO
from pathlib import Path

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

from .storage_config import StorageConfig, StorageType, get_storage_config


class FileUploadError(Exception):
    """Custom exception for file upload errors"""
    pass


class FileUploadService:
    """Service for handling file uploads to DigitalOcean Spaces or local storage"""
    
    def __init__(self, config: Optional[StorageConfig] = None):
        self.config = config or get_storage_config()
        self._s3_client = None
        
        # Initialize storage backend
        if self.config.storage_type == StorageType.DIGITALOCEAN_SPACES:
            self._init_spaces_client()
        else:
            self._init_local_storage()
    
    def _init_spaces_client(self):
        """Initialize DigitalOcean Spaces client"""
        if not BOTO3_AVAILABLE:
            raise FileUploadError("boto3 is required for DigitalOcean Spaces integration. Install with: pip install boto3")
        
        try:
            self._s3_client = boto3.client(
                's3',
                region_name=self.config.do_spaces_region,
                endpoint_url=self.config.do_spaces_endpoint,
                aws_access_key_id=self.config.do_spaces_key,
                aws_secret_access_key=self.config.do_spaces_secret
            )
            
            # Test connection
            self._s3_client.head_bucket(Bucket=self.config.do_spaces_bucket)
            
        except NoCredentialsError:
            raise FileUploadError("Invalid DigitalOcean Spaces credentials")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise FileUploadError(f"Bucket '{self.config.do_spaces_bucket}' not found")
            else:
                raise FileUploadError(f"Failed to connect to DigitalOcean Spaces: {e}")
    
    def _init_local_storage(self):
        """Initialize local storage directory"""
        storage_path = Path(self.config.local_storage_path)
        storage_path.mkdir(parents=True, exist_ok=True)
    
    def _validate_file(self, file_content: bytes, filename: str) -> None:
        """Validate file size and type"""
        # Check file size
        if len(file_content) > self.config.max_file_size:
            raise FileUploadError(f"File size exceeds maximum allowed size of {self.config.max_file_size / (1024*1024):.1f}MB")
        
        # Check file extension
        file_extension = Path(filename).suffix.lower().lstrip('.')
        if file_extension not in self.config.allowed_extensions:
            raise FileUploadError(f"File type '{file_extension}' is not allowed")
    
    def _generate_file_key(self, user_id: int, filename: str) -> str:
        """Generate unique file key for storage"""
        # Create user-specific directory structure
        file_extension = Path(filename).suffix.lower()
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        return f"files/user_{user_id}/{timestamp}_{unique_id}{file_extension}"
    
    def _calculate_file_hash(self, file_content: bytes) -> str:
        """Calculate SHA256 hash of file content"""
        return hashlib.sha256(file_content).hexdigest()
    
    def upload_file(self, user_id: int, file_content: bytes, filename: str, 
                   replace_existing: bool = True) -> Dict[str, Any]:
        """
        Upload a file for a user (single file per user)
        
        Args:
            user_id: ID of the user uploading the file
            file_content: Binary content of the file
            filename: Original filename
            replace_existing: Whether to replace existing file for this user
            
        Returns:
            Dict containing file metadata
        """
        try:
            # Validate file
            self._validate_file(file_content, filename)
            
            # Check if user already has a file and handle replacement
            if replace_existing:
                existing_file = self.get_user_file(user_id)
                if existing_file:
                    self.delete_file(user_id, existing_file['file_id'])
            else:
                # Check if user already has a file
                existing_file = self.get_user_file(user_id)
                if existing_file:
                    raise FileUploadError("User already has a file. Use replace_existing=True to replace it.")
            
            # Generate file metadata
            file_key = self._generate_file_key(user_id, filename)
            file_hash = self._calculate_file_hash(file_content)
            content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            
            file_metadata = {
                'file_id': str(uuid.uuid4()),
                'user_id': user_id,
                'original_filename': filename,
                'file_key': file_key,
                'content_type': content_type,
                'file_size': len(file_content),
                'file_hash': file_hash,
                'upload_date': datetime.now().isoformat(),
                'storage_type': self.config.storage_type.value
            }
            
            # Upload to storage backend
            if self.config.storage_type == StorageType.DIGITALOCEAN_SPACES:
                self._upload_to_spaces(file_key, file_content, content_type, file_metadata)
            else:
                self._upload_to_local(file_key, file_content, file_metadata)
            
            return file_metadata
            
        except Exception as e:
            if isinstance(e, FileUploadError):
                raise
            else:
                raise FileUploadError(f"Failed to upload file: {str(e)}")
    
    def _upload_to_spaces(self, file_key: str, file_content: bytes, 
                         content_type: str, metadata: Dict[str, Any]) -> None:
        """Upload file to DigitalOcean Spaces"""
        try:
            # Prepare metadata for Spaces
            spaces_metadata = {
                'file-id': metadata['file_id'],
                'user-id': str(metadata['user_id']),
                'original-filename': metadata['original_filename'],
                'file-hash': metadata['file_hash'],
                'upload-date': metadata['upload_date']
            }
            
            # Upload to Spaces
            self._s3_client.put_object(
                Bucket=self.config.do_spaces_bucket,
                Key=file_key,
                Body=file_content,
                ContentType=content_type,
                Metadata=spaces_metadata,
                ACL='private'  # Keep files private
            )
            
        except ClientError as e:
            raise FileUploadError(f"Failed to upload to DigitalOcean Spaces: {e}")
    
    def _upload_to_local(self, file_key: str, file_content: bytes, 
                        metadata: Dict[str, Any]) -> None:
        """Upload file to local storage"""
        try:
            file_path = Path(self.config.local_storage_path) / file_key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file content
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            # Write metadata file
            metadata_path = file_path.with_suffix(file_path.suffix + '.meta')
            import json
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            raise FileUploadError(f"Failed to upload to local storage: {e}")
    
    def get_user_file(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get the current file for a user (single file per user)"""
        try:
            if self.config.storage_type == StorageType.DIGITALOCEAN_SPACES:
                return self._get_user_file_from_spaces(user_id)
            else:
                return self._get_user_file_from_local(user_id)
        except Exception:
            return None
    
    def _get_user_file_from_spaces(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user file metadata from DigitalOcean Spaces"""
        try:
            # List objects with user prefix
            prefix = f"files/user_{user_id}/"
            response = self._s3_client.list_objects_v2(
                Bucket=self.config.do_spaces_bucket,
                Prefix=prefix
            )
            
            if 'Contents' not in response or not response['Contents']:
                return None
            
            # Get the most recent file (should be only one)
            latest_object = max(response['Contents'], key=lambda x: x['LastModified'])
            
            # Get object metadata
            obj_response = self._s3_client.head_object(
                Bucket=self.config.do_spaces_bucket,
                Key=latest_object['Key']
            )
            
            metadata = obj_response.get('Metadata', {})
            
            return {
                'file_id': metadata.get('file-id'),
                'user_id': user_id,
                'original_filename': metadata.get('original-filename'),
                'file_key': latest_object['Key'],
                'content_type': obj_response.get('ContentType'),
                'file_size': latest_object['Size'],
                'file_hash': metadata.get('file-hash'),
                'upload_date': metadata.get('upload-date'),
                'storage_type': self.config.storage_type.value
            }
            
        except ClientError:
            return None
    
    def _get_user_file_from_local(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user file metadata from local storage"""
        try:
            user_dir = Path(self.config.local_storage_path) / f"files/user_{user_id}"
            if not user_dir.exists():
                return None
            
            # Find the most recent file
            files = [f for f in user_dir.iterdir() if f.is_file() and not f.name.endswith('.meta')]
            if not files:
                return None
            
            latest_file = max(files, key=lambda x: x.stat().st_mtime)
            metadata_file = latest_file.with_suffix(latest_file.suffix + '.meta')
            
            if metadata_file.exists():
                import json
                with open(metadata_file, 'r') as f:
                    return json.load(f)
            
            return None
            
        except Exception:
            return None
    
    def download_file(self, user_id: int, file_id: str) -> Optional[bytes]:
        """Download file content"""
        try:
            user_file = self.get_user_file(user_id)
            if not user_file or user_file['file_id'] != file_id:
                return None
            
            if self.config.storage_type == StorageType.DIGITALOCEAN_SPACES:
                return self._download_from_spaces(user_file['file_key'])
            else:
                return self._download_from_local(user_file['file_key'])
                
        except Exception:
            return None
    
    def _download_from_spaces(self, file_key: str) -> bytes:
        """Download file from DigitalOcean Spaces"""
        try:
            response = self._s3_client.get_object(
                Bucket=self.config.do_spaces_bucket,
                Key=file_key
            )
            return response['Body'].read()
        except ClientError as e:
            raise FileUploadError(f"Failed to download from DigitalOcean Spaces: {e}")
    
    def _download_from_local(self, file_key: str) -> bytes:
        """Download file from local storage"""
        try:
            file_path = Path(self.config.local_storage_path) / file_key
            with open(file_path, 'rb') as f:
                return f.read()
        except Exception as e:
            raise FileUploadError(f"Failed to download from local storage: {e}")
    
    def delete_file(self, user_id: int, file_id: str) -> bool:
        """Delete user's file"""
        try:
            user_file = self.get_user_file(user_id)
            if not user_file or user_file['file_id'] != file_id:
                return False
            
            if self.config.storage_type == StorageType.DIGITALOCEAN_SPACES:
                return self._delete_from_spaces(user_file['file_key'])
            else:
                return self._delete_from_local(user_file['file_key'])
                
        except Exception:
            return False
    
    def _delete_from_spaces(self, file_key: str) -> bool:
        """Delete file from DigitalOcean Spaces"""
        try:
            self._s3_client.delete_object(
                Bucket=self.config.do_spaces_bucket,
                Key=file_key
            )
            return True
        except ClientError:
            return False
    
    def _delete_from_local(self, file_key: str) -> bool:
        """Delete file from local storage"""
        try:
            file_path = Path(self.config.local_storage_path) / file_key
            metadata_path = file_path.with_suffix(file_path.suffix + '.meta')
            
            if file_path.exists():
                file_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()
            
            return True
        except Exception:
            return False
