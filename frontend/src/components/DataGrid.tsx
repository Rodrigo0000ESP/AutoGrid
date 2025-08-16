import React, { useEffect, useState, useCallback } from 'react';
import type { Job } from '../types/job';
import dataShareService from '../services/DataShareService';
import { isAuthenticated } from '../services/authService';
import pkg from 'lodash';
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
  'Withdrawn',
  'Declined'
];

const DataGrid = () => {
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
  // Debounced search function with smooth loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchJobs = useCallback(
    debounce(async (search: string, status: string, jobType: string, pageNum: number, size: number): Promise<void> => {
      // Only show loading if it takes more than 300ms
      const loadingTimeout = setTimeout(() => {
        setIsLoading(true);
      }, 300);

      try {
        const authStatus = isAuthenticated();
        if (!authStatus) {
          window.location.href = '/login';
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
        
        // Ensure loading is shown for at least 500ms for a smoother experience
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setJobs(data.items);
        setTotalItems(data.total);
        setTotalPages(Math.ceil(data.total / size));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error fetching jobs:', errorMessage, err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
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
    const newSize = parseInt(e.target.value, 20);
    setPageSize(newSize);
    setCurrentPage(1);
    debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, 1, newSize);
  };

  // Initial fetch and when filters change
  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout | null = setTimeout(() => {
      setIsLoading(true);
    }, 100);
    
    const fetchPromise = debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize);
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
    
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      debouncedFetchJobs.cancel();
    };
  }, [debouncedFetchJobs, searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize]);

  if (isLoading) {
    return (
      <div className="transition-all duration-300 ease-out transform">
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

  const hasActiveFilters = statusFilter || jobTypeFilter || searchQuery;

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        {hasActiveFilters ? (
          <>
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs match your filters</h3>
            <p className="text-gray-500 mb-6">
              No jobs found matching "{searchQuery}" {statusFilter ? `with status "${statusFilter}"` : ''} {jobTypeFilter ? `and type "${jobTypeFilter}"` : ''}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setJobTypeFilter('');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear all filters
              </button>
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => window.location.href = '/add-job'}
              >
                + Add New Job
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first job application!</p>
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => window.location.href = '/add-job'}
            >
              + Add Your First Job
            </button>
          </>
        )}
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
    } catch (error) {
      console.error('Error updating job status:', error);
      // Revert on error
      debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize);
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

  // Calculate statistics
  const stats = {
    totalJobs: jobs.length,
    applied: jobs.filter(job => job.status === 'Applied').length,
    interviews: jobs.filter(job => job.status === 'Interview').length,
    offers: jobs.filter(job => job.status === 'Offer' || job.status === 'Accepted').length,
    rejected: jobs.filter(job => job.status === 'Rejected').length,
    saved: jobs.filter(job => !job.status || job.status === 'Saved').length,
    declined: jobs.filter(job => job.status === 'Declined').length
  };

  // Truncate text with ellipsis
  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div id="main-contet" className="w-full px-20 sm:px-2 md:px-4 space-y-6 sm:space-y-6 overflow-x-hidden mb-6">
      <div className="w-full px-1 sm:px-2 md:px-4 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
            <div className="text-sm text-gray-500">Total Jobs</div>
            <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
            </div>
          </div>
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
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
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
              <option value="Declined">Declined</option>
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
            <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 01-1-1v-5h2v4h12v-4h2v5a1 1 0 01-1 1H3zm5-9V3h4v5h3l-5 5-5-5h3z" clipRule="evenodd" />
              </svg>
              Download Excel
            </button>
            <button 
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200"
              onClick={() => window.location.href = '/add-job'}
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
                {jobs.map((job) => (
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
                    <td className="px-2 py-2 text-center">
                      <button 
                        className="p-0.5 -mr-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="View job posting" 
                        onClick={() => job.link && window.open(job.link, '_blank', 'noopener,noreferrer')}
                        disabled={!job.link}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
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
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-1 sm:p-2">
              {jobs.map((job) => (
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
                  <button 
                    onClick={() => job.link && window.open(job.link, '_blank', 'noopener,noreferrer')}
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
              ))}
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
    </div>
  );
};

export default DataGrid;
