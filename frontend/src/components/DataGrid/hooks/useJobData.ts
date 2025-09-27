import { useState, useCallback, useEffect } from 'react';
import type { Job } from '../../../types/job';
import dataShareService from '../../../services/DataShareService';
import { isAuthenticated } from '../../../services/authService';
import pkg from 'lodash';

const { debounce } = pkg;

export interface UseJobDataReturn {
  // Data state
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  
  // Pagination state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  
  // Filter state
  searchQuery: string;
  statusFilter: string;
  jobTypeFilter: string;
  
  // Actions
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setJobTypeFilter: (jobType: string) => void;
  handlePageChange: (newPage: number) => void;
  handlePageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStatusFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleJobTypeFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  refreshJobs: () => Promise<void>;
  immediateRefreshJobs: () => Promise<void>;
  updateJobLocally: (jobId: number, updates: Partial<Job>) => void;
  debouncedFetchJobs: ReturnType<typeof debounce>;
}

export const useJobData = (): UseJobDataReturn => {
  // Data and loading states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('');

  // Debounced search function with smooth loading
  const debouncedFetchJobs = useCallback(
    debounce((search: string, status: string, jobType: string, pageNum: number, size: number) => {
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
            resolve(undefined);
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
            resolve(undefined);
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
            resolve(undefined);
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
          resolve(undefined);
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

  // Immediate refresh function (no debounce for faster response)
  const immediateRefreshJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authStatus = isAuthenticated();
      if (!authStatus) {
        window.location.href = '/login';
        return;
      }
      
      const filters: Record<string, any> = {};
      if (statusFilter) filters.status = statusFilter;
      if (jobTypeFilter) filters.job_type = jobTypeFilter;
      
      const data = await dataShareService.getPaginatedJobs(
        currentPage,
        pageSize,
        searchQuery,
        ['position', 'company', 'location', 'description'],
        filters
      );
      
      setJobs(data.items);
      setTotalItems(data.total);
      setTotalPages(Math.ceil(data.total / pageSize));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching jobs:', errorMessage, err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize]);

  // Refresh jobs function (with debounce)
  const refreshJobs = useCallback(async () => {
    await debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize);
  }, [searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize, debouncedFetchJobs]);

  // Update a specific job locally without refetching (for optimistic updates)
  const updateJobLocally = useCallback((jobId: number, updates: Partial<Job>) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, ...updates } : job
      )
    );
  }, []);

  // Initial data fetch on mount - use initial state values
  useEffect(() => {
    debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize);
  }, []); // Empty dependency array for initial load only

  return {
    // Data state
    jobs,
    isLoading,
    error,
    
    // Pagination state
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    
    // Filter state
    searchQuery,
    statusFilter,
    jobTypeFilter,
    
    // Actions
    setCurrentPage,
    setPageSize,
    setSearchQuery,
    setStatusFilter,
    setJobTypeFilter,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    handleStatusFilterChange,
    handleJobTypeFilterChange,
    refreshJobs,
    immediateRefreshJobs,
    updateJobLocally,
    debouncedFetchJobs,
  };
};
