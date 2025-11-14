import React from 'react';
import type { Job } from '../../../types/job';
import { STATUS_OPTIONS, getStatusColor, formatDate } from '../utils/jobUtils';

type JobStatus = Job['status'];

interface TableViewProps {
  jobs: Job[];
  onStatusChange: (jobId: number, newStatus: JobStatus) => void;
  onDeleteJob: (job: Job) => void;
  onAddJob: () => void;
}

export const TableView: React.FC<TableViewProps> = ({
  jobs,
  onStatusChange,
  onDeleteJob,
  onAddJob,
}) => {
  if (!jobs || jobs.length === 0) {
    return (
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
                      onClick={onAddJob}
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
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
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
                <td className="px-2 py-2 max-w-[200px]">
                  <div className="text-gray-900 truncate text-xs leading-none">{job.company}</div>
                </td>
                <td className="px-2 py-2 max-w-[200px]">
                  <div className="text-gray-500 truncate text-xs leading-none">{job.location || 'Remote'}</div>
                </td>
                <td className="px-2 py-2 max-w-[200px]">
                  <select
                    value={job.status || 'Saved'}
                    onChange={(e) => onStatusChange(job.id, e.target.value as JobStatus)}
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
                <td className="px-2 py-2 max-w-[200px]">
                  <div className="text-gray-500 text-xs text-center leading-none">{job.job_type || 'Unknown'}</div>
                </td>
                <td className="px-2 py-2 max-w-[200px]">
                  <div className="text-xs text-gray-600 line-clamp-3" title={job.description || ''}>
                    {job.description || <span className="text-gray-400">-</span>}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="text-gray-500 text-xs leading-none whitespace-nowrap">
                    {formatDate(job.date_added)}
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
                      onDeleteJob(job);
                    }}
                    title="Delete job"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
