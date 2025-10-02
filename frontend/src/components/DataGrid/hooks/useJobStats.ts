import { useState, useCallback } from 'react';
import dataShareService from '../../../services/DataShareService';

// Status counts state with type safety
export type StatusCounts = {
  Saved: number;
  Applied: number;
  Interview: number;
  Offer: number;
  Rejected: number;
  Accepted: number;
  Withdrawn: number;
  total: number;
};

export interface UseJobStatsReturn {
  statusCounts: StatusCounts;
  isStatsLoading: boolean;
  fetchStatusCounts: () => Promise<StatusCounts | null>;
  stats: {
    totalJobs: number;
    saved: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
    withdrawn: number;
    interview: number;
    offer: number;
    accepted: number;
    activeApplications: number;
    successRate: number;
    total: number;
  };
}

export const useJobStats = (): UseJobStatsReturn => {
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
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);

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
  }, []);

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

  return {
    statusCounts,
    isStatsLoading,
    fetchStatusCounts,
    stats,
  };
};
