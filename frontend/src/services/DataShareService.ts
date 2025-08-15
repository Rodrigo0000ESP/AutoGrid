import type { Job } from '../types/job';
import { getAuthToken, isAuthenticated } from './authService';

// Get API base URL from environment variables or use default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
   * Get all jobs for the current user
   * @returns Promise with array of jobs
   */
  async getJobs(): Promise<Job[]> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/jobs`, {
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
   * Add a new job
   * @param job Job data to add
   * @returns Promise that resolves when job is added
   */
  async addJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      const response = await this.fetchWithAuth(`${this.apiBaseUrl}/jobs`, {
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
        method: 'PATCH',
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
   * Delete a job
   * @param id Job ID to delete
   * @returns Promise that resolves when job is deleted
   */
  async deleteJob(id: number): Promise<void> {
    this.ensureAuthenticated();
    const token = this.getAuthToken();

    try {
      await this.fetchWithAuth(`${this.apiBaseUrl}/jobs/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(token),
      });

      this.showNotification('Job deleted successfully!', 'success');
    } catch (error) {
      this.handleError('Failed to delete job', error);
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
