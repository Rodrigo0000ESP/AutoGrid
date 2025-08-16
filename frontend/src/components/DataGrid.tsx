import React, { useEffect, useState } from 'react';
import type { Job } from '../types/job';
import dataShareService from '../services/DataShareService';
import { isAuthenticated } from '../services/authService';

const DataGrid = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'table' | 'grid'>('table');
  const pagesize=20;
  const page=1;
  useEffect(() => {
    console.log('DataGrid: useEffect triggered');

    const fetchJobs = async () => {
      console.log('DataGrid: fetchJobs called');
      setJobs([]);
      try {
        // Check authentication status first
        const authStatus = isAuthenticated();
        console.log('DataGrid: Authentication status:', authStatus);
        
        if (!authStatus) {
          console.error('DataGrid: User is not authenticated, redirecting to login');
          window.location.href = '/login';
          return;
        }

        console.log('DataGrid: Starting to fetch jobs...');
        setIsLoading(true);
        setError(null);
        
        const data = await dataShareService.getPaginatedJobs(page,pagesize);
        console.log('DataGrid: Received jobs data');
        
        setJobs(data.items);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error fetching jobs:', errorMessage, err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
    
    return () => {
      console.log('DataGrid: useEffect cleanup');
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-600">Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Jobs</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
        <p className="text-gray-500 mb-6">Add your first job to get started!</p>
        <button 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => window.location.href = '/add-job'}
        >
          + Add Job
        </button>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    totalJobs: jobs.length,
    applied: jobs.filter(job => job.status === 'Applied').length,
    interviews: jobs.filter(job => job.status === 'Interview').length,
    offers: jobs.filter(job => job.status === 'Offer' || job.status === 'Accepted').length,
    rejected: jobs.filter(job => job.status === 'Rejected').length,
  };

  return (
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
        <div className="bg-white rounded-lg shadow w-full">
          <div className="overflow-x-auto -mx-1 sm:mx-0 w-full">
            <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-xs">
              <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[25%] min-w-[100px]">Position</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[20%] min-w-[80px]">Company</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[15%] min-w-[60px]">Location</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[15%] min-w-[60px]">Status</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[10%] min-w-[50px]">Type</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[10%] min-w-[60px]">Date</th>
                <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[5%] min-w-[30px]">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 h-8 leading-none">
                  <td className="px-2 py-2">
                    <div className="font-medium text-gray-900 truncate text-xs leading-none">{job.position}</div>
                    {job.salary && (
                      <div className="text-[9px] text-gray-500 leading-none">${job.salary}</div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="text-gray-900 truncate text-xs leading-none">{job.company}</div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="text-gray-500 truncate text-xs leading-none">{job.location || 'Remote'}</div>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`px-1 py-0.5 inline-flex text-[9px] leading-3 font-medium rounded whitespace-nowrap
                      ${job.status === 'Applied' ? 'bg-green-100 text-green-800' : 
                         job.status === 'Interview' ? 'bg-blue-100 text-blue-800' :
                         job.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                         'bg-gray-100 text-gray-800'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="text-gray-500 text-xs text-center leading-none">{job.job_type || 'FT'}</div>
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
            <div className="flex-1 flex justify-between items-center text-sm text-gray-700">
              <div>Showing <span className="font-medium">1</span> to <span className="font-medium">{jobs.length}</span> of <span className="font-medium">{jobs.length}</span> results</div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  Previous
                </button>
                <button className="px-3 py-1 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={jobs.length < 10}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-1 sm:p-2">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg shadow p-3 sm:p-4 hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-100 h-full flex flex-col">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 h-10 sm:h-12">{job.position}</h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">{job.company}</p>
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location || 'Remote'}
              </div>
              <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                  job.status === 'Applied' ? 'bg-green-100 text-green-800' : 
                  job.status === 'Interview' ? 'bg-blue-100 text-blue-800' :
                  job.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'}`}>
                  {job.status}
                </span>
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
      )}
    </>
    </div>
  );
};

export default DataGrid;
