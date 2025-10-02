import { useState } from 'react';
import dataShareService from '../../services/DataShareService';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded: () => void;
}

type JobFormData = {
  position: string;
  company: string;
  location?: string;
  salary?: string | number;
  job_type?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Freelance' | 'Internship' | 'Temporary' | 'Other';
  status?: 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Accepted' | 'Withdrawn';
  link?: string;
  description?: string;
  notes?: string;
};

const STATUS_OPTIONS = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected', 'Accepted', 'Withdrawn'];

export default function AddJobModal({ isOpen, onClose, onJobAdded }: AddJobModalProps) {
  const [formData, setFormData] = useState<JobFormData>({
    position: '',
    company: '',
    status: 'Saved',
    job_type: 'Full-Time'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const jobData = {
        position: formData.position,
        company: formData.company,
        status: formData.status || 'Saved',
        job_type: formData.job_type || 'Full-Time',
        location: formData.location || null,
        salary: formData.salary ? String(formData.salary) : null,
        link: formData.link || null,
        description: formData.description || null,
        notes: formData.notes || null
      };

      await dataShareService.createJob(jobData);
      onJobAdded();
      onClose();
      
      // Reset form
      setFormData({
        position: '',
        company: '',
        status: 'Saved',
        job_type: 'Full-Time'
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Background overlay with backdrop blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal container with max height and scrolling */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl transform transition-all border border-gray-100 overflow-hidden">
        {/* Modal header with gradient */}
        <div className="px-6 py-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Add New Job Opportunity</h3>
            <button
              type="button"
              className="p-1 rounded-full text-blue-100 hover:bg-blue-500/20 transition-colors"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-blue-100/90">Fill in the details below to add a new job application</p>
        </div>
        
        {/* Modal content with smooth scrolling */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-gray-50/50">
          {formError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md">
              <div className="flex">
                <svg className="h-5 w-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{formError}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Job Position <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">Required</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="position"
                  name="position"
                  required
                  value={formData.position}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300/80 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 disabled:opacity-50 disabled:bg-gray-50"
                  placeholder="e.g. Senior Frontend Developer"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">Required</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="company"
                  name="company"
                  required
                  value={formData.company}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300/80 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 disabled:opacity-50 disabled:bg-gray-50"
                  placeholder="e.g. Acme Inc."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <div className="relative">
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="appearance-none mt-1 block w-full rounded-lg border border-gray-300/80 bg-white py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-150"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="job_type" className="block text-sm font-medium text-gray-700">Job Type</label>
                <div className="relative">
                  <select
                    id="job_type"
                    name="job_type"
                    value={formData.job_type}
                    onChange={handleInputChange}
                    className="appearance-none mt-1 block w-full rounded-lg border border-gray-300/80 bg-white py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-150"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Internship">Internship</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border-gray-300/80 bg-white py-2.5 px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-150"
                />
              </div>
              
              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700">Salary</label>
                <input
                  type="text"
                  id="salary"
                  name="salary"
                  value={formData.salary || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border-gray-300/80 bg-white py-2.5 px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-150"
                  placeholder="e.g. 75000"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="link" className="block text-sm font-medium text-gray-700">Job Posting URL</label>
              <input
                type="url"
                id="link"
                name="link"
                value={formData.link || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border border-gray-300/80 bg-white py-2.5 px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-150"
                placeholder="https://"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border border-gray-300/80 bg-white py-2.5 px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-150"
              />
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={formData.notes || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border border-gray-300/80 bg-white py-2.5 px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-150"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center items-center rounded-lg border border-transparent bg-gradient-to-r from-blue-600 to-blue-700 py-2.5 px-6 text-sm font-medium text-white shadow-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 transition-all duration-200 transform hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Job
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
