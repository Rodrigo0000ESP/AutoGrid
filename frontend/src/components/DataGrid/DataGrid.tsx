import React, { useEffect, useState } from 'react';
import type { Job } from '../../types/job';
import AddJobModal from '../jobs/AddJobModal';
import { useJobData, useJobStats, useJobActions } from './hooks';
import { getPlanCurrentLimits, type PlanUsageResponse } from '../../services/subscriptionService';
import {
  SearchFilters,
  StatsCards,
  ActionButtons,
  Pagination,
  TableView,
  GridView,
  LoadingState,
  ErrorState,
  ConfirmationDialogs,
} from './components';

type JobStatus = Job['status'];

const DataGrid = () => {
  const [mode, setMode] = useState<'table' | 'grid'>('table');
  const [userPlan, setUserPlan] = useState<PlanUsageResponse | null>(null);

  // Custom hooks for data management
  const {
    jobs,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    searchQuery,
    statusFilter,
    jobTypeFilter,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    handleStatusFilterChange,
    handleJobTypeFilterChange,
    refreshJobs,
    immediateRefreshJobs,
    updateJobLocally,
    debouncedFetchJobs,
    setSearchQuery,
    setStatusFilter,
    setJobTypeFilter,
    setCurrentPage,
  } = useJobData();

  const {
    statusCounts,
    isStatsLoading,
    fetchStatusCounts,
    stats,
  } = useJobStats();

  const {
    isAddJobModalOpen,
    setIsAddJobModalOpen,
    isExporting,
    jobToDelete,
    setJobToDelete,
    isDeleting,
    showDeleteAllConfirm,
    setShowDeleteAllConfirm,
    isDeletingAll,
    handleStatusChange,
    handleDeleteJob,
    handleDeleteAllJobs,
    handleExportJobs,
    handleJobAdded,
  } = useJobActions();

  // Initial fetch of status counts and user plan - job data is handled by useJobData hook
  useEffect(() => {
    fetchStatusCounts();
    
    // Fetch user plan information
    const fetchUserPlan = async () => {
      try {
        const planData = await getPlanCurrentLimits();
        setUserPlan(planData);
      } catch (error) {
        console.error('Error fetching user plan:', error);
        // Set to null on error, which will default to free plan behavior
        setUserPlan(null);
      }
    };
    
    fetchUserPlan();
  }, []); // Empty dependency array for initial load only

  // Note: Removed auto-clear logic to allow users to see active filters even with no results

  // Handle status change with optimistic local updates (no table re-render)
  const onStatusChange = async (jobId: number, newStatus: JobStatus) => {
    // Find the current job to get its old status for potential rollback
    const currentJob = jobs.find(job => job.id === jobId);
    const oldStatus = currentJob?.status;
    
    try {
      // 1. Immediately update the job status in local state (optimistic update)
      updateJobLocally(jobId, { status: newStatus });
      
      // 2. Update the status in the database
      await handleStatusChange(jobId, newStatus);
      
      // 3. Only update the status counts (not the full job list to avoid re-ordering)
      await fetchStatusCounts();
      
    } catch (error) {
      console.error('Error updating job status:', error);
      
      // On error, rollback the optimistic update
      if (oldStatus) {
        updateJobLocally(jobId, { status: oldStatus });
      }
      
      // Also refresh counts to ensure consistency
      await fetchStatusCounts();
    }
  };

  // Handle job deletion
  const onDeleteJob = async () => {
    try {
      await handleDeleteJob(async () => {
        // Refresh data after successful deletion with immediate response
        await Promise.all([
          immediateRefreshJobs(),
          fetchStatusCounts()
        ]);
      });
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  // Handle delete all jobs
  const onDeleteAllJobs = async () => {
    try {
      await handleDeleteAllJobs(async () => {
        // Refresh data after successful deletion with immediate response
        await immediateRefreshJobs();
        await fetchStatusCounts();
      });
    } catch (error) {
      console.error('Error deleting all jobs:', error);
    }
  };

  // Handle job added
  const onJobAdded = async () => {
    handleJobAdded(async () => {
      // Reset filters and refresh jobs list
      setSearchQuery('');
      setStatusFilter('');
      setJobTypeFilter('');
      setCurrentPage(1);
      await Promise.all([
        debouncedFetchJobs('', '', '', 1, pageSize),
        fetchStatusCounts()
      ]);
    });
  };


  // Handle retry on error
  const onRetry = () => {
    debouncedFetchJobs(searchQuery, statusFilter, jobTypeFilter, currentPage, pageSize);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <div id="main-content" className="w-full px-20 sm:px-2 md:px-4 space-y-6 sm:space-y-6 overflow-x-hidden mb-6">
      <AddJobModal 
        isOpen={isAddJobModalOpen} 
        onClose={() => setIsAddJobModalOpen(false)}
        onJobAdded={onJobAdded}
      />
      
      <div className="w-full px-1 sm:px-2 md:px-4 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Search and Filters */}
        <SearchFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          jobTypeFilter={jobTypeFilter}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          onJobTypeFilterChange={handleJobTypeFilterChange}
        />

        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Your Job Applications</h2>
          <ActionButtons
            mode={mode}
            onModeChange={setMode}
            onDeleteAll={() => setShowDeleteAllConfirm(true)}
            onExport={handleExportJobs}
            onAddJob={() => setIsAddJobModalOpen(true)}
            isExporting={isExporting}
            isDeletingAll={isDeletingAll}
            jobsCount={jobs.length}
            userPlan={userPlan}
          />
        </div>

        {/* Main Content */}
        {mode === 'table' ? (
          <div className="space-y-4">
            {/* Stats Dashboard */}
            <StatsCards stats={stats} />
            
            {/* Table View */}
            <TableView
              jobs={jobs}
              onStatusChange={onStatusChange}
              onDeleteJob={setJobToDelete}
              onAddJob={() => setIsAddJobModalOpen(true)}
            />
            
            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Dashboard - Grid View */}
            <StatsCards stats={stats} />
            
            {/* Grid View */}
            <GridView
              jobs={jobs}
              onStatusChange={onStatusChange}
              onAddJob={() => setIsAddJobModalOpen(true)}
            />
            
            {/* Pagination for Grid View */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialogs
        showDeleteAllConfirm={showDeleteAllConfirm}
        isDeletingAll={isDeletingAll}
        onDeleteAllConfirm={onDeleteAllJobs}
        onDeleteAllCancel={() => setShowDeleteAllConfirm(false)}
        jobToDelete={jobToDelete}
        isDeleting={isDeleting}
        onDeleteJobConfirm={onDeleteJob}
        onDeleteJobCancel={() => setJobToDelete(null)}
      />
    </div>
  );
};

export default DataGrid;
