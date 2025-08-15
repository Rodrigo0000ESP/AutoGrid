import React, { useEffect, useState } from 'react';
import type { Job } from '../types/job';
import dataShareService from '../services/DataShareService';
import { isAuthenticated } from '../services/authService';

const DataGrid = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'table' | 'grid'>('table');

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
        
        const data = await dataShareService.getJobs();
        console.log('DataGrid: Received jobs data');
        
        setJobs(data);
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Job Applications</h2>
        <div className="flex space-x-4">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'table' | 'grid')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center"
          >
            <option value="table">Table View</option>
            <option value="grid">Grid View</option>
          </select>
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
            onClick={() => window.location.href = '/add-job'}
          >
            + Add Job
          </button>
        </div>
      </div>

      {mode === 'table' ? (
        <div className="overflow-x-scroll bg-white rounded-lg shadow w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{job.position}</div>
                    {job.salary && (
                      <div className="text-sm text-gray-500">${job.salary}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{job.company}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.location || 'Remote'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${job.status === 'Applied' ? 'bg-green-100 text-green-800' : 
                         job.status === 'Interview' ? 'bg-blue-100 text-blue-800' :
                         job.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                         'bg-gray-100 text-gray-800'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.job_type || 'Full-time'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(job.date_added).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Navigate to job link" 
                      onClick={() => job.link && window.open(job.link, '_blank', 'noopener,noreferrer')}
                      disabled={!job.link}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900">{job.position}</h3>
              <p className="text-gray-600">{job.company}</p>
              <p className="text-sm text-gray-500 mt-2">{job.location || 'Remote'}</p>
              <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full 
                ${job.status === 'Applied' ? 'bg-green-100 text-green-800' : 
                   job.status === 'Interview' ? 'bg-blue-100 text-blue-800' :
                   job.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                   'bg-gray-100 text-gray-800'}`}>
                {job.status}
              </span>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {job.job_type || 'Full-time'}
                </span>
                <button 
                  onClick={() => job.link && window.open(job.link, '_blank', 'noopener,noreferrer')}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  disabled={!job.link}
                >
                  View Job
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DataGrid;
