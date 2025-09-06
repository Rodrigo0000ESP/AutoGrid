import React, { useEffect, useState, useCallback } from 'react';
import type { Job } from '../types/job';
import dataShareService from '../services/DataShareService';
import { isAuthenticated } from '../services/authService';
import AddJobModal from './jobs/AddJobModal';
import pkg from 'lodash';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
const { debounce } = pkg;

// Define possible status values based on Job type
type JobStatus = Job['status'];

const STATUS_OPTIONS: JobStatus[] = [
  'Saved',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Accepted',
  'Withdrawn'
];

const DataGrid = () => {
  // Data and loading states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'table' | 'grid'>('table');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('');
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Status counts state with type safety
  type StatusCounts = {
    Saved: number;
    Applied: number;
    Interview: number;
    Offer: number;
    Rejected: number;
    Accepted: number;
    Withdrawn: number;
    total: number;
  };

  const initialStatusCounts: StatusCounts = {
    Saved: 0,
    Applied: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
    Accepted: 0,
    Withdrawn: 0,
    total: 0
  };

  const [statusCounts, setStatusCounts] = useState<StatusCounts>(initialStatusCounts);

  const handleDeleteAllJobs = async () => {
    setIsDeletingAll(true);
    try {
      await dataShareService.deleteAllUserJobs();
      setShowDeleteAllConfirm(false);
      // Refresh the jobs list using the existing debouncedFetchJobs
      await debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, 1, pageSize);
      // Show success message
      alert('All jobs have been successfully deleted.');
    } catch (error) {
      console.error('Error deleting all jobs:', error);
      alert('Failed to delete all jobs. Please try again.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    
    setIsDeleting(true);
    try {
      // Optimistic UI update
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobToDelete.id));
      
      // Delete from database
      await dataShareService.deleteJob(jobToDelete.id);
      
      // Refresh status counts
      await fetchStatusCounts();
      setJobToDelete(null);
    } catch (error) {
      console.error('Error deleting job:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJobAdded = async () => {
    // Reset filters and refresh jobs list
    setSearchQuery('');
    setStatusFilter('');
    setJobTypeFilter('');
    setCurrentPage(1);
    await Promise.all([
      debouncedFetchJobs('', '', '', 1, pageSize),
      fetchStatusCounts()
    ]);
  };
  // Debounced search function with smooth loading
  const debouncedFetchJobs = useCallback(
    debounce((search: string, status: string, jobType: string, pageNum: number, size: number): Promise<void> => {
      return new Promise(async (resolve) => {
        let loadingTimeout: NodeJS.Timeout | null = null;
        let isMounted = true;
        
        const cleanup = () => {
          isMounted = false;
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
        };
        
        try {
          // Show loading indicator after 100ms if not already showing
          loadingTimeout = setTimeout(() => {
            if (isMounted) {
              setIsLoading(true);
            }
          }, 100);

          const authStatus = isAuthenticated();
          if (!authStatus) {
            window.location.href = '/login';
            cleanup();
            resolve();
            return;
          }
          
          setError(null);
          
          const filters: Record<string, any> = {};
          if (status) filters.status = status;
          if (jobType) filters.job_type = jobType;
          
          const data = await dataShareService.getPaginatedJobs(
            pageNum,
            size,
            search,
            ['position', 'company', 'location', 'description'],
            filters
          );
          
          if (!isMounted) {
            cleanup();
            resolve();
            return;
          }
          
          // Clear the loading timeout since we got our data
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
          
          setJobs(data.items);
          setTotalItems(data.total);
          setTotalPages(Math.ceil(data.total / size));
        } catch (err) {
          if (!isMounted) {
            cleanup();
            resolve();
            return;
          }
          
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          console.error('Error fetching jobs:', errorMessage, err);
          setError(errorMessage);
        } finally {
          if (isMounted) {
            setIsLoading(false);
            cleanup();
          }
          resolve();
        }
      });
    }, 500),
    []
  );

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on new search
    
    // Only show loading if user stops typing for 300ms
    let loadingTimeout: NodeJS.Timeout | null = setTimeout(() => {
      setIsLoading(true);
    }, 300);
    
    const fetchPromise = debouncedFetchJobs(value, statusFilter, jobTypeFilter, 1, pageSize);
    if (fetchPromise) {
      fetchPromise.finally(() => {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }
      });
    } else if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
  };

  // Handle filter changes
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value);
    setCurrentPage(1);
    
    let loadingTimeout: NodeJS.Timeout | null = setTimeout(() => {
      setIsLoading(true);
    }, 100);
    
    const fetchPromise = debouncedFetchJobs(searchQuery, value, jobTypeFilter, 1, pageSize);
    if (fetchPromise) {
      fetchPromise.finally(() => {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }
      });
    } else if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
  };

  const handleJobTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setJobTypeFilter(value);
    setCurrentPage(1);
    
    let loadingTimeout: NodeJS.Timeout | null = setTimeout(() => {
      setIsLoading(true);
    }, 100);
    
    const fetchPromise = debouncedFetchJobs(searchQuery, statusFilter, value, 1, pageSize);
    if (fetchPromise) {
      fetchPromise.finally(() => {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }
      });
    } else if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, newPage, pageSize);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1);
    debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, 1, newSize);
  };

  // Fetch job status counts with proper type safety
  const fetchStatusCounts = useCallback(async () => {
    try {
      const counts = await dataShareService.getJobStatusCounts();
      
      // Ensure all statuses are present with 0 as default
      setStatusCounts(prev => ({
        ...prev,
        ...counts,
        total: counts.total || 0
      }));
      return counts;
    } catch (error) {
      console.error('Error fetching status counts:', error);
      // Don't show error to user, just log it
      return null;
    } finally {
      setIsStatsLoading(false);
    }
  }, [dataShareService, setStatusCounts, setIsStatsLoading]);

// ... (rest of the code remains the same)

  // Initial fetch and when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchStatusCounts(),
          debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize)
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const loadingTimeout = setTimeout(() => {
      setIsLoading(true);
    }, 100);
    
    fetchData();
    
    return () => {
      clearTimeout(loadingTimeout);
      debouncedFetchJobs.cancel();
    };
  }, [searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize, fetchStatusCounts, debouncedFetchJobs]);

  // Render status counts as chips
  const renderStatusChips = () => {
    if (isStatsLoading) {
      return (
        <div className="flex flex-wrap gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          ))}
        </div>
      );
    }

    // Use a type assertion to ensure TypeScript knows these are valid keys
    const statuses = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected', 'Accepted', 'Withdrawn'] as const;
    
    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map((status) => (
          <div
            key={status}
            onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              statusFilter === status
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>{status}</span>
            <span className="text-xs bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full">
              {statusCounts[status]}
            </span>
          </div>
        ))}
        {statusCounts.total > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700">
            <span>Total</span>
            <span className="text-xs bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full">
              {statusCounts.total}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="transition-all duration-300 ease-out transform mb-6">
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-blue-50 animate-ping"></div>
            <div className="absolute inset-1 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-gray-900">Finding your jobs</h3>
            <p className="text-sm text-gray-500 max-w-md">We're fetching the latest job applications for you. This will just take a moment...</p>
          </div>
          <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-500 h-2.5 rounded-full"
              style={{
                width: '70%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            ></div>
          </div>
          <style>
            {`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading jobs</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Toggle job details expansion
  const toggleJobExpand = (jobId: number) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  // Handle status change
  const handleStatusChange = async (jobId: number, newStatus: JobStatus) => {
    try {
      // Optimistic UI update
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );

      // Update in the database
      await dataShareService.updateJob(jobId, { status: newStatus });
      
      // Refresh status counts
      await fetchStatusCounts();
    } catch (error) {
      console.error('Error updating job status:', error);
      // Revert on error
      await Promise.all([
        debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize),
        fetchStatusCounts()
      ]);
    }
  };

  // Get status color class
  const getStatusColor = (status: JobStatus | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (status.toLowerCase()) {
      case 'applied':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'interview':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'offer':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'declined':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'withdrawn':
        return 'bg-gray-200 text-gray-800 border-gray-300';
      case 'saved':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Use all status counts from the server
  const stats = {
    // Keep the original property names for backward compatibility
    totalJobs: statusCounts.total || 0,
    saved: statusCounts.Saved || 0,
    applied: statusCounts.Applied || 0,
    interviews: statusCounts.Interview || 0,
    offers: (statusCounts.Offer || 0) + (statusCounts.Accepted || 0),
    rejected: statusCounts.Rejected || 0,
    withdrawn: statusCounts.Withdrawn || 0,
    // New status counts
    interview: statusCounts.Interview || 0,
    offer: statusCounts.Offer || 0,
    accepted: statusCounts.Accepted || 0,
    // Derived stats
    activeApplications: (statusCounts.Applied || 0) + (statusCounts.Interview || 0) + (statusCounts.Offer || 0),
    successRate: statusCounts.total > 0 
      ? Math.round(((statusCounts.Offer || 0) + (statusCounts.Accepted || 0)) / statusCounts.total * 100) 
      : 0,
    // Alias for backward compatibility
    total: statusCounts.total || 0
  };

  // Ensure all statuses are handled in the getStatusStyles function
  const getStatusStyles = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'applied':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'interview':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'offer':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'accepted':
        return 'bg-green-200 text-green-900 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'withdrawn':
        return 'bg-gray-200 text-gray-800 border-gray-300';
      case 'saved':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Truncate text with ellipsis
  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div id="main-content" className="w-full px-20 sm:px-2 md:px-4 space-y-6 sm:space-y-6 overflow-x-hidden mb-6">
      <AddJobModal 
        isOpen={isAddJobModalOpen} 
        onClose={() => setIsAddJobModalOpen(false)}
        onJobAdded={handleJobAdded}
      />
      <div className="w-full px-1 sm:px-2 md:px-4 space-y-4 sm:space-y-6 overflow-x-hidden">

        {/* Search and Filters */}
        <div className="space-y-3 mb-4 mt-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Saved">Saved</option>
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
              <option value="Accepted">Accepted</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
            <select
              value={jobTypeFilter}
              onChange={handleJobTypeFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Remote">Remote</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Your Job Applications</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'table' | 'grid')}
              className="px-3 py-1.5 text-sm sm:text-base bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="table">Table View</option>
              <option value="grid">Grid View</option>
            </select>
            <button 
              onClick={() => setShowDeleteAllConfirm(true)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200"
              disabled={isDeletingAll || jobs.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Delete All
            </button>
            <button 
              onClick={async () => {
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
              }}
              disabled={isExporting}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 01-1-1v-5h2v4h12v-4h2v5a1 1 0 01-1 1H3zm5-9V3h4v5h3l-5 5-5-5h3z" clipRule="evenodd" />
                  </svg>
                  Download Excel
                </>
              )}
            </button>
            <button 
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200"
              onClick={(e) => {
                e.preventDefault();
                setIsAddJobModalOpen(true);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Job
            </button>
          </div>
        </div>

  <>
        {mode === 'table' ? (
          <div className="space-y-4">
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Jobs */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
                <div className="text-sm text-gray-500">Total Jobs</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              {/* Applied */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{stats.applied}</div>
                <div className="text-sm text-gray-500">Applied</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500" 
                    style={{ width: `${(stats.applied / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Interview */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">{stats.interviews}</div>
                <div className="text-sm text-gray-500">Interviews</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-500" 
                    style={{ width: `${(stats.interviews / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Offers */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">{stats.offers}</div>
                <div className="text-sm text-gray-500">Offers</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500" 
                    style={{ width: `${(stats.offers / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Accepted */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
                <div className="text-sm text-gray-500">Accepted</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-700 transition-all duration-500" 
                    style={{ width: `${(stats.accepted / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Rejected */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-gray-500">Rejected</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500" 
                    style={{ width: `${(stats.rejected / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Withdrawn */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-gray-600">{stats.withdrawn}</div>
                <div className="text-sm text-gray-500">Withdrawn</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-400 transition-all duration-500" 
                    style={{ width: `${(stats.withdrawn / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Success Rate */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-indigo-600">{stats.successRate}%</div>
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${stats.successRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="bg-white shadow w-full border border-gray-100">
            <div className="overflow-x-auto -mx-1 sm:mx-0 w-full">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-xs">
                <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%] min-w-[60px] whitespace-nowrap">Position</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%] min-w-[60px]">Company</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%] min-w-[50px]">Location</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%] min-w-[40px]">Status</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%] min-w-[30px]">Type</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[40%] min-w-[200px]">Description</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%] min-w-[50px]">Date</th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[7%] min-w-[30px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(!jobs || jobs.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-3 bg-blue-50 rounded-full">
                          <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
                        <p className="text-gray-500 max-w-md">There are no jobs matching your current filters. Try adjusting your search or add a new job.</p>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setIsAddJobModalOpen(true);
                          }}
                          className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add New Job
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 h-8 leading-none">
                    <td className="px-2 py-2 max-w-[200px]">
                      <div className="font-medium text-gray-900 truncate text-xs leading-none" title={job.position}>
                        {job.position || <span className="text-gray-400">-</span>}
                      </div>
                      {job.salary && (
                        <div className="text-xs text-gray-500 leading-none truncate">${job.salary}</div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-gray-900 truncate text-xs leading-none">{job.company}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-gray-500 truncate text-xs leading-none">{job.location || 'Remote'}</div>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={job.status || 'Saved'}
                        onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                        className={`px-1 py-0.5 text-xs font-medium rounded border ${getStatusColor(job.status)} cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option 
                            key={status} 
                            value={status}
                            className="bg-white text-gray-900"
                          >
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-gray-500 text-xs text-center leading-none">{job.job_type || 'Unkown'}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-xs text-gray-600 line-clamp-3" title={job.description || ''}>
                        {job.description || <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-gray-500 text-xs leading-none whitespace-nowrap">
                        {new Date(job.date_added).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center space-x-1">
                      <a 
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center p-0.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                        title="View details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </a>
                      <button 
                        className="p-0.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="View job posting" 
                        onClick={() => job.link && window.open(job.link, '_blank', 'noopener,noreferrer')}
                        disabled={!job.link}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                      </button>
                      <button 
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobToDelete(job);
                        }}
                        title="Delete job"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>per page</span>
                </div>
                <div>
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{totalItems}</span> results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show first, last, current, and 2 around current
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      if (i === 3 && currentPage < totalPages - 3) {
                        return <span key="ellipsis" className="px-2">...</span>;
                      }
                      if (i === 1 && currentPage > 4) {
                        return <span key="ellipsis-start" className="px-2">...</span>;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Dashboard - Grid View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Jobs */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
                <div className="text-sm text-gray-500">Total Jobs</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              {/* Applied */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{stats.applied}</div>
                <div className="text-sm text-gray-500">Applied</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500" 
                    style={{ width: `${(stats.applied / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Interview */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">{stats.interviews}</div>
                <div className="text-sm text-gray-500">Interviews</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-500" 
                    style={{ width: `${(stats.interviews / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Offers */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">{stats.offers}</div>
                <div className="text-sm text-gray-500">Offers</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500" 
                    style={{ width: `${(stats.offers / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Accepted */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
                <div className="text-sm text-gray-500">Accepted</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-700 transition-all duration-500" 
                    style={{ width: `${(stats.accepted / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Rejected */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-gray-500">Rejected</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500" 
                    style={{ width: `${(stats.rejected / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Withdrawn */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-gray-600">{stats.withdrawn}</div>
                <div className="text-sm text-gray-500">Withdrawn</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-400 transition-all duration-500" 
                    style={{ width: `${(stats.withdrawn / Math.max(1, stats.totalJobs)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Success Rate */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="text-2xl font-bold text-indigo-600">{stats.successRate}%</div>
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${stats.successRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-1 sm:p-2">
              {(!jobs || jobs.length === 0) ? (
                <div className="col-span-full py-12">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-full">
                      <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
                    <p className="text-gray-500 max-w-md">There are no jobs matching your current filters. Try adjusting your search or add a new job.</p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setIsAddJobModalOpen(true);
                      }}
                      className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Job
                    </button>
                  </div>
                </div>
              ) : (
                jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow p-3 sm:p-4 hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-100 h-full flex flex-col">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 h-10 sm:h-12">{job.position}</h3>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{job.company}</p>
                
                {job.description && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {truncateText(job.description, 100)}
                    </p>
                  </div>
                )}
                
                {job.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Notes:</p>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {truncateText(job.notes, 100)}
                    </p>
                  </div>
                )}
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job.location || 'Remote'}
                </div>
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5">
                  <select
                    value={job.status || 'Saved'}
                    onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                    className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(job.status)} cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option 
                        key={status} 
                        value={status}
                        className="bg-white text-gray-900"
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800">
                    {job.job_type || 'Full-time'}
                  </span>
                </div>
                <div className="mt-3 sm:mt-4 flex justify-between items-center pt-2 sm:pt-3 border-t border-gray-100">
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    {new Date(job.date_added).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/jobs/${job.id}`;
                      }}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-md flex items-center transition-colors duration-200"
                    >
                      <span className="hidden sm:inline">Details</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (job.link) window.open(job.link, '_blank', 'noopener,noreferrer');
                      }}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md flex items-center transition-colors duration-200"
                      disabled={!job.link}
                    >
                      <span className="hidden sm:inline">View</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
          
          {/* Pagination for Grid View */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>per page</span>
                </div>
                <div>
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{totalItems}</span> results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      if (i === 3 && currentPage < totalPages - 3) {
                        return <span key="ellipsis" className="px-2">...</span>;
                      }
                      if (i === 1 && currentPage > 4) {
                        return <span key="ellipsis-start" className="px-2">...</span>;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
      </div>

      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={showDeleteAllConfirm}
        onClose={() => !isDeletingAll && setShowDeleteAllConfirm(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
              </div>
              <Dialog.Title className="text-lg font-medium text-gray-900">
                Delete all jobs
              </Dialog.Title>
            </div>
            <Dialog.Description className="text-gray-600 mb-6">
              Are you sure you want to delete all jobs? This action cannot be undone and will permanently remove all your job applications.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={isDeletingAll}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                onClick={handleDeleteAllJobs}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Delete Single Job Confirmation Dialog */}
      <Dialog
        open={!!jobToDelete}
        onClose={() => !isDeleting && setJobToDelete(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
              </div>
              <Dialog.Title className="text-lg font-medium text-gray-900">
                Delete job application
              </Dialog.Title>
            </div>
            <Dialog.Description className="text-gray-600 mb-6">
              Are you sure you want to delete the job application for "{jobToDelete?.position}" at {jobToDelete?.company}? This action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                onClick={() => setJobToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                onClick={handleDeleteJob}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default DataGrid;
