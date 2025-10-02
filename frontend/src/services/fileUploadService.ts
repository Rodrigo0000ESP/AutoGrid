import { getAuthToken, isAuthenticated } from './authService';

// Get API base URL from environment variables or use default
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export interface FileInfo {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
  upload_date: string;
  storage_type: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  file: FileInfo;
  user_plan: {
    plan_name: string;
    is_trial: boolean;
  };
}

export interface FileInfoResponse {
  success: boolean;
  file: FileInfo | null;
  message?: string;
}

export interface StorageInfoResponse {
  success: boolean;
  storage_info: {
    has_file: boolean;
    used_storage: number;
    max_file_size: number;
    storage_type: string;
    allowed_extensions: string[];
  };
  plan_info: {
    plan_name: string;
    is_trial: boolean;
    plan_details: any;
  };
  current_file: FileInfo | null;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  deleted_file: {
    file_id: string;
    filename: string;
  };
}

/**
 * Service for file upload operations
 */
class FileUploadService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = API_BASE_URL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private ensureAuthenticated(): void {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(file: File, replaceExisting: boolean = true): Promise<UploadResponse> {
    this.ensureAuthenticated();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace_existing', replaceExisting.toString());

    try {
      const response = await fetch(`${this.apiBaseUrl}/files/upload`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Get current user's file information
   */
  async getMyFile(): Promise<FileInfoResponse> {
    this.ensureAuthenticated();

    try {
      const response = await fetch(`${this.apiBaseUrl}/files/my-file`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to get file info' }));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get file info error:', error);
      throw error;
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string, filename: string): Promise<void> {
    this.ensureAuthenticated();

    try {
      const response = await fetch(`${this.apiBaseUrl}/files/download/${fileId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Download failed' }));
        throw new Error(errorData.detail || `Download failed with status ${response.status}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<DeleteResponse> {
    this.ensureAuthenticated();

    try {
      const response = await fetch(`${this.apiBaseUrl}/files/delete/${fileId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Delete failed' }));
        throw new Error(errorData.detail || `Delete failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfoResponse> {
    this.ensureAuthenticated();

    try {
      const response = await fetch(`${this.apiBaseUrl}/files/storage-info`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to get storage info' }));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get storage info error:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file type is allowed
   */
  isFileTypeAllowed(filename: string, allowedExtensions: string[]): boolean {
    const extension = this.getFileExtension(filename);
    return allowedExtensions.includes(extension);
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
export default fileUploadService;
