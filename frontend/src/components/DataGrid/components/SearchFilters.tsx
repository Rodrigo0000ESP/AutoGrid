import React from 'react';

interface SearchFiltersProps {
  searchQuery: string;
  statusFilter: string;
  jobTypeFilter: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onJobTypeFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchQuery,
  statusFilter,
  jobTypeFilter,
  onSearchChange,
  onStatusFilterChange,
  onJobTypeFilterChange,
}) => {
  return (
    <div className="space-y-3 mb-4 mt-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={onStatusFilterChange}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Saved">Saved</option>
          <option value="Applied">Applied</option>
          <option value="Interview">Interview</option>
          <option value="Offer">Offer</option>
          <option value="Rejected">Rejected</option>
          <option value="Accepted">Accepted</option>
          <option value="Withdrawn">Withdrawn</option>
        </select>
        <select
          value={jobTypeFilter}
          onChange={onJobTypeFilterChange}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Internship">Internship</option>
          <option value="Remote">Remote</option>
        </select>
      </div>
    </div>
  );
};
