import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="transition-all duration-300 ease-out transform">
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-blue-50 animate-ping"></div>
          <div className="absolute inset-1 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium text-gray-900">Loading Job Details</h3>
          <p className="text-sm text-gray-500 max-w-md">We're fetching the job details for you. This will just take a moment...</p>
        </div>
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-500 h-2.5 rounded-full"
            style={{
              width: '70%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          ></div>
        </div>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}
        </style>
      </div>
    </div>
  );
}
