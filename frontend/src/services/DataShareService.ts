import type { Job } from '../types/job';
import { getAuthToken, isAuthenticated } from './authService';

// Get API base URL from environment variables or use default
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

// Types
type NotificationType = 'success' | 'error' | 'info';

/**
 * Service for managing job data operations
 */
class DataShareService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = API_BASE_URL;
  }

  /**
   * Get paginated jobs with optional search and filtering
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @param searchTerms Optional search string
   * @param searchFields Optional array of field names to search in
   * @param filters Optional key-value pairs for filtering
   * @returns Promise with paginated jobs and metadata
   */
  async getPaginatedJobs(
    page: number = 1,
    pageSize: number = 10,
    searchTerms?: string,
    searchFields?: string[],
    filters: Record<string, any> = {}
  ): Promise<{
    items: Job[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(searchTerms && { search_terms: searchTerms }),
        ...(searchFields && { search_fields: searchFields.join(',') }),
        ...filters,
      });

      // Ensure consistent URL format with trailing slash to match backend
      const url = `${this.apiBaseUrl}/jobs/?${params.toString()}`;
      const response = await this.fetchWithAuth(url, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      return await response.json();
    } catch (error) {
      this.handleError('Error fetching paginated jobs', error);
      throw error;
    }
  }

  /**
   * Get all jobs for the current user
   * @returns Promise with array of jobs
   */
  async getJobs(): Promise<Job[]> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/jobs/`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      return await response.json();
    } catch (error) {
      this.handleError('Error fetching jobs', error);
      throw error;
    }
  }

  /**
   * Get a job by ID
   * @param id Job ID to fetch
   * @returns Promise with the job
   */
  async getJobById(id: number): Promise<Job> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/jobs/${id}`, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      return await response.json();
    } catch (error) {
      this.handleError(`Error fetching job with ID ${id}`, error);
      throw error;
    }
  }

  /**
   * Add a new job
   * @param job Job data to add
   * @returns Promise that resolves when job is added
   */
  async addJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/jobs/`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(job),
      });

      const data = await response.json();
      this.showNotification('Job added successfully!', 'success');
      return data;
    } catch (error) {
      this.handleError('Failed to add job', error);
      throw error;
    }
  }

  /**
   * Update an existing job
   * @param id Job ID to update
   * @param updates Partial job data with updates
   * @returns Promise with updated job
   */
  async updateJob(id: number, updates: Partial<Job>): Promise<Job> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/jobs/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(token),
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      this.showNotification('Job updated successfully!', 'success');
      return data;
    } catch (error) {
      this.handleError('Failed to update job', error);
      throw error;
    }
  }

  /**
   * Get counts of jobs by status for the current user
   * @returns Promise with job status counts including total
   */
  async getJobStatusCounts(): Promise<{
    Saved: number;
    Applied: number;
    Interview: number;
    Offer: number;
    Rejected: number;
    Accepted: number;
    Withdrawn: number;
    total: number;
    [key: string]: number; // Allow other string keys with number values
  }> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const url = `${this.apiBaseUrl}/jobs/status-counts`;
      console.log('Fetching job status counts from:', url);
      const response = await this.fetchWithAuth(url, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Received job status counts:', data);
      
      // Ensure all expected statuses are present in the response
      const defaultCounts = {
        Saved: 0,
        Applied: 0,
        Interview: 0,
        Offer: 0,
        Rejected: 0,
        Accepted: 0,
        Withdrawn: 0,
        total: 0
      };
      
      // Merge with default counts to ensure all statuses are present
      return { ...defaultCounts, ...data };
    } catch (error) {
      console.error('Error in getJobStatusCounts:', error);
      this.handleError('Failed to fetch job status counts', error);
      throw error;
    }
  }

  /**
   * Save a job offer from the extension
   * @param jobData Job data to save
   * @returns Promise with the created job
   */
  async saveJobOffer(jobData: {
    position: string;
    company: string;
    location: string;
    job_type: string;
    description: string;
    salary?: string;
    link?: string;
    status?: string;
    notes?: string;
  }): Promise<Job> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/jobs/save`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(jobData),
      });

      const data = await response.json();
      this.showNotification('Job saved successfully!', 'success');
      return data;
    } catch (error) {
      this.handleError('Failed to save job offer', error);
      throw error;
    }
  }

  /**
   * Delete a job by ID
   * @param jobId ID of the job to delete
   * @returns Promise that resolves when the job is deleted
   */
  async deleteJob(jobId: number): Promise<void> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await fetch(`${this.apiBaseUrl}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete job');
      }

      this.showNotification('Job deleted successfully', 'success');
    } catch (error) {
      this.handleError('Error deleting job', error);
      throw error;
    }
  }

  /**
   * Create a new job
   * @param jobData Job data to create
   * @returns Created job
   */
  async createJob(jobData: Omit<Job, 'id' | 'user_id' | 'date_added' | 'date_modified'>): Promise<Job> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await fetch(`${this.apiBaseUrl}/jobs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jobData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create job');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  /**
   * Delete all jobs for the current user
   * @returns Promise with the deletion result
   */
  async deleteAllUserJobs(): Promise<{
    status: string;
    message: string;
    deleted_count: number;
  }> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await fetch(`${this.apiBaseUrl}/jobs/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete all jobs');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting all jobs:', error);
      throw error;
    }
  }

  // Private helper methods
  private ensureAuthenticated(): void {
    if (!isAuthenticated()) {
      this.showNotification('Please log in to continue', 'error');
      throw new Error('User is not authenticated');
    }
  }

  private getAuthToken(): string {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  }

  private getHeaders(token: string): HeadersInit {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(input, init);
      
      if (response.status === 401) {
        // Token is invalid or expired
        console.log('Authentication failed, redirecting to logout...');
        if (typeof window !== 'undefined') {
          // Redirect to logout page which will handle the cleanup
          window.location.href = '/logout';
        }
        throw new Error('Session expired. Please log in again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || response.statusText;
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          if (typeof window !== 'undefined') {
            // Redirect to logout which will handle the cleanup
            window.location.href = '/logout';
          }
        }
        throw error;
      }
      throw new Error('Unknown network error occurred');
    }
  }

  private handleError(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, error);
    this.showNotification(`${context}: ${errorMessage}`, 'error');
  }

  private showNotification(message: string, type: NotificationType = 'info'): void {
    // Implementation depends on your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Example: toast[type](message);
  }

  /**
   * Export jobs to Excel file
   * @returns Promise that resolves when the file is downloaded
   */
  async exportJobsToExcel(): Promise<void> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await fetch(`${this.apiBaseUrl}/jobs/export/excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to export jobs to Excel');
      }

      // Get filename from content-disposition header or use a default name
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'jobs_export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create blob from response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.showNotification('Jobs exported to Excel successfully!', 'success');
    } catch (error) {
      this.handleError('Error exporting jobs to Excel', error);
      throw error;
    }
  }

  /**
   * Generate customized CV from job offer using stored CV
   * @param jobId Job ID to generate CV for
   * @returns Promise with CV data (suggestions for PDF or file download for DOCX)
   */
  async generateCVFromJob(jobId: number): Promise<any> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/cv/generate-from-job`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      // Check if response is JSON (suggestions) or file (DOCX)
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // PDF CV - return suggestions as JSON
        const data = await response.json();
        return data;
      } else {
        // DOCX CV - trigger download
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : 'generated_cv.docx';
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        return { type: 'document', filename };
      }
    } catch (error) {
      this.handleError('Error generating CV from job offer', error);
      throw error;
    }
  }

  /**
   * Logout the current user by clearing any cached data and optionally calling a logout endpoint
   */
  async logout(): Promise<void> {
    try {
      // If you have a logout endpoint on your backend, you can call it here
      // Example:
      // await this.fetchWithAuth(`${this.apiBaseUrl}/auth/logout`, {
      //   method: 'POST',
      //   headers: this.getHeaders(this.getAuthToken())
      // });
      
      // Clear any cached data in the service if needed
      // Example: this.clearCache();
      
      this.showNotification('Logged out successfully', 'success');
    } catch (error) {
      // Even if logout API call fails, we still want to proceed with client-side cleanup
      console.error('Error during logout:', error);
    }
  }
}

// Export as a singleton instance
export const dataShareService = new DataShareService();

export default dataShareService;
