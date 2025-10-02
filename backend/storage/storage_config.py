"""
Storage configuration for DigitalOcean Spaces storage configuration
"""
import os
from typing import Optional
from dataclasses import dataclass
from enum import Enum


class StorageType(Enum):
    """Storage backend types"""
    LOCAL = "local"
    DIGITALOCEAN_SPACES = "digitalocean_spaces"

@dataclass
class StorageConfig:
    """Configuration for storage backend"""
    storage_type: StorageType
    
    # DigitalOcean Spaces configuration
    do_spaces_key: Optional[str] = None
    do_spaces_secret: Optional[str] = None
    do_spaces_bucket: Optional[str] = None
    do_spaces_region: Optional[str] = "ams3"
    do_spaces_endpoint: Optional[str] = None
    
    # Local storage configuration
    local_storage_path: str = "temp/files"
    
    # File size limits (in bytes)
    max_file_size: int = 10 * 1024 * 1024  # 10MB default

    # Allowed file types
    allowed_extensions: set = None
    
    def __post_init__(self):
        if self.allowed_extensions is None:
            self.allowed_extensions = {
                'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
                'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
                'zip', 'rar', '7z', 'tar', 'gz'
            }
        
        # Auto-generate endpoint URL if not provided
        if self.storage_type == StorageType.DIGITALOCEAN_SPACES and not self.do_spaces_endpoint:
            self.do_spaces_endpoint = f"https://{self.do_spaces_region}.digitaloceanspaces.com"
        
        # Override max_file_size from environment if provided
        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", self.max_file_size))


def get_storage_config() -> StorageConfig:
    """Get storage configuration from environment variables"""
    
    # Check for DigitalOcean Spaces configuration
    do_spaces_key = os.getenv("DO_SPACES_KEY")
    do_spaces_secret = os.getenv("DO_SPACES_SECRET")
    do_spaces_bucket = os.getenv("DO_SPACES_BUCKET")
    
    if do_spaces_key and do_spaces_secret and do_spaces_bucket:
        return StorageConfig(
            storage_type=StorageType.DIGITALOCEAN_SPACES,
            do_spaces_key=do_spaces_key,
            do_spaces_secret=do_spaces_secret,
            do_spaces_bucket=do_spaces_bucket,
            do_spaces_region=os.getenv("DO_SPACES_REGION", "ams3"),
            do_spaces_endpoint=os.getenv("DO_SPACES_ENDPOINT")
        )
    
    # Fallback to local storage
    return StorageConfig(
        storage_type=StorageType.LOCAL,
        local_storage_path=os.getenv("LOCAL_STORAGE_PATH", "temp/files")
    )
