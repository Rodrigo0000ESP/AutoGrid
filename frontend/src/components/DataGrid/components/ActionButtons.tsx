import React from 'react';

interface ActionButtonsProps {
  mode: 'table' | 'grid';
  onModeChange: (mode: 'table' | 'grid') => void;
  onDeleteAll: () => void;
  onExport: () => void;
  onAddJob: () => void;
  isExporting: boolean;
  isDeletingAll: boolean;
  jobsCount: number;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  mode,
  onModeChange,
  onDeleteAll,
  onExport,
  onAddJob,
  isExporting,
  isDeletingAll,
  jobsCount,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as 'table' | 'grid')}
        className="px-3 py-1.5 text-sm sm:text-base bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="table">Table View</option>
        <option value="grid">Grid View</option>
      </select>
      
      <button 
        onClick={onDeleteAll}
        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200"
        disabled={isDeletingAll || jobsCount === 0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Delete All
      </button>
      
      <button 
        onClick={onExport}
        disabled={isExporting}
        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 01-1-1v-5h2v4h12v-4h2v5a1 1 0 01-1 1H3zm5-9V3h4v5h3l-5 5-5-5h3z" clipRule="evenodd" />
            </svg>
            Download Excel
          </>
        )}
      </button>
      
      <button 
        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto text-sm sm:text-base transition-colors duration-200"
        onClick={onAddJob}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Add Job
      </button>
    </div>
  );
};
