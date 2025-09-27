import type { Job } from '../../../types/job';

type JobStatus = Job['status'];

// Define possible status values based on Job type
export const STATUS_OPTIONS: JobStatus[] = [
  'Saved',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Accepted',
  'Withdrawn'
];

// Get status color class
export const getStatusColor = (status: JobStatus | undefined) => {
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

// Ensure all statuses are handled in the getStatusStyles function
export const getStatusStyles = (status: string) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'applied':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'interview':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'offer':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'accepted':
      return 'bg-green-200 text-green-900 border-green-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'withdrawn':
      return 'bg-gray-200 text-gray-800 border-gray-300';
    case 'saved':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Truncate text with ellipsis
export const truncateText = (text: string | null, maxLength: number) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Format date for display
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions) => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  };
  
  return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions);
};

// Format date for grid view
export const formatDateGrid = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
