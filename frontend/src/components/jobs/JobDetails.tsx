import { useState, useEffect } from 'react';
import { dataShareService } from '../../services/DataShareService';
import type { Job } from '../../types/job';

interface JobDetailsProps {
  jobId: string;
  onLoad?: () => void;
}

export default function JobDetails({ jobId }: JobDetailsProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const jobData = await dataShareService.getJobById(Number(jobId));
        setJob(jobData);
      } catch (err) {
        console.error('Error loading job:', err);
        setError('Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!job) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const updates: Partial<Job> = Object.fromEntries(formData.entries());

      // Convert string values to appropriate types
      if (updates.salary) updates.salary = updates.salary.toString();

      // Update the job
      await dataShareService.updateJob(parseInt(jobId), updates);

      // Show success message and redirect to dashboard after a short delay
      setSuccessMessage('Job updated successfully! Redirecting to dashboard...');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
      
    } catch (err) {
      console.error('Error updating job:', err);
      setError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getJobValue = <T,>(value: T | null | undefined, defaultValue: T): T => {
    return value ?? defaultValue;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
            @keyframes progress {
              0% { width: 0; opacity: 0.7; }
              50% { width: 60%; opacity: 1; }
              100% { width: 100%; opacity: 0.7; }
            }
            .loading-fade-in {
              animation: fadeIn 0.5s ease-out;
            }
            .loading-float {
              animation: float 2s ease-in-out infinite;
            }
            .loading-progress {
              animation: progress 2s ease-in-out infinite;
            }
            .loading-pulse-slow {
              animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `}
        </style>
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6 p-6 loading-fade-in">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-blue-50 opacity-75 loading-pulse-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-blue-500 transform transition-transform duration-1000 ease-in-out loading-float" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="1.5" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-medium text-gray-900">Loading Job Details</h3>
            <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full loading-progress"></div>
            </div>
            <p className="text-sm text-gray-500 max-w-md">We're fetching the job details for you. This will just take a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 text-center">
        <p>No job found with ID: {jobId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return <div className="text-center py-12">No job found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg shadow-sm mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {getJobValue(job.position, 'Position')} at {getJobValue(job.company, 'Company')}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {getJobValue(job.location, 'Location')} • {getJobValue(job.job_type, 'Full-time')}
              </p>
            </div>
            {job.link && (
              <a
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Job Posting
              </a>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Position *
                </label>
                <input
                  type="text"
                  name="position"
                  id="position"
                  required
                  defaultValue={job.position || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Company *
                </label>
                <input
                  type="text"
                  name="company"
                  id="company"
                  required
                  defaultValue={job.company || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  defaultValue={job.location || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="job_type" className="block text-sm font-medium text-gray-700">
                  Job Type
                </label>
                <select
                  id="job_type"
                  name="job_type"
                  defaultValue={job.job_type || 'Full-Time'}
                  className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                  <option value="Temporary">Temporary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={job.status || 'Saved'}
                  className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                  Salary
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    name="salary"
                    id="salary"
                    defaultValue={job.salary || ''}
                    placeholder="0.00"
                    className="pl-7 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="col-span-6">
                <label htmlFor="link" className="block text-sm font-medium text-gray-700">
                  Job Posting URL
                </label>
                <input
                  type="url"
                  name="link"
                  id="link"
                  defaultValue={job.link || ''}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={job.notes || ''}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full border border-gray-300 rounded-md sm:text-sm p-2"
                    placeholder="Add any additional notes about this job..."
                  />
                </div>
              </div>

              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Job Description
                </label>
                <div className="mt-1 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-auto max-h-60">
                  {job.description ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  ) : (
                    <p className="text-gray-500 italic">No description available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 bg-gray-50 text-right sm:px-6">
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

