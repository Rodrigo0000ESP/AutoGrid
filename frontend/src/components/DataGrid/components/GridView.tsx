import React from 'react';
import type { Job } from '../../../types/job';
import { STATUS_OPTIONS, getStatusColor, truncateText, formatDateGrid } from '../utils/jobUtils';

type JobStatus = Job['status'];

interface GridViewProps {
  jobs: Job[];
  onStatusChange: (jobId: number, newStatus: JobStatus) => void;
  onAddJob: () => void;
}

export const GridView: React.FC<GridViewProps> = ({
  jobs,
  onStatusChange,
  onAddJob,
}) => {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-1 sm:p-2">
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
              onClick={onAddJob}
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add New Job
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
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
              onChange={(e) => onStatusChange(job.id, e.target.value as JobStatus)}
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
              {formatDateGrid(job.date_added)}
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
      ))}
    </div>
  );
};
