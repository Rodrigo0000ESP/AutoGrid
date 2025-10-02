import { useState } from 'react';
import type { Job } from '../../../types/job';
import dataShareService from '../../../services/DataShareService';

type JobStatus = Job['status'];

export interface UseJobActionsReturn {
  // Modal states
  isAddJobModalOpen: boolean;
  setIsAddJobModalOpen: (open: boolean) => void;
  
  // Export state
  isExporting: boolean;
  
  // Delete states
  jobToDelete: Job | null;
  setJobToDelete: (job: Job | null) => void;
  isDeleting: boolean;
  showDeleteAllConfirm: boolean;
  setShowDeleteAllConfirm: (show: boolean) => void;
  isDeletingAll: boolean;
  
  // Actions
  handleStatusChange: (jobId: number, newStatus: JobStatus, onSuccess?: () => void) => Promise<void>;
  handleDeleteJob: (onSuccess?: () => void) => Promise<void>;
  handleDeleteAllJobs: (onSuccess?: () => void) => Promise<void>;
  handleExportJobs: () => Promise<void>;
  handleJobAdded: (onSuccess?: () => void) => void;
}

export const useJobActions = (): UseJobActionsReturn => {
  // Modal states
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  
  // Delete states
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Handle status change
  const handleStatusChange = async (jobId: number, newStatus: JobStatus, onSuccess?: () => void) => {
    try {
      // Update in the database
      await dataShareService.updateJob(jobId, { status: newStatus });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error; // Re-throw to allow caller to handle
    }
  };

  // Handle delete single job
  const handleDeleteJob = async (onSuccess?: () => void) => {
    if (!jobToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete from database
      await dataShareService.deleteJob(jobToDelete.id);
      
      setJobToDelete(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete all jobs
  const handleDeleteAllJobs = async (onSuccess?: () => void) => {
    setIsDeletingAll(true);
    try {
      await dataShareService.deleteAllUserJobs();
      setShowDeleteAllConfirm(false);
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Show success message
      alert('All jobs have been successfully deleted.');
    } catch (error) {
      console.error('Error deleting all jobs:', error);
      alert('Failed to delete all jobs. Please try again.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Handle export jobs
  const handleExportJobs = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await dataShareService.exportJobsToExcel();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      // You might want to show a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  // Handle job added
  const handleJobAdded = (onSuccess?: () => void) => {
    if (onSuccess) {
      onSuccess();
    }
  };

  return {
    // Modal states
    isAddJobModalOpen,
    setIsAddJobModalOpen,
    
    // Export state
    isExporting,
    
    // Delete states
    jobToDelete,
    setJobToDelete,
    isDeleting,
    showDeleteAllConfirm,
    setShowDeleteAllConfirm,
    isDeletingAll,
    
    // Actions
    handleStatusChange,
    handleDeleteJob,
    handleDeleteAllJobs,
    handleExportJobs,
    handleJobAdded,
  };
};
