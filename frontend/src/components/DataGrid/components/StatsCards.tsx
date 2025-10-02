import React from 'react';

interface StatsCardsProps {
  stats: {
    totalJobs: number;
    applied: number;
    interviews: number;
    offers: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
    successRate: number;
  };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Jobs */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
        <div className="text-sm text-gray-500">Total Jobs</div>
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
        </div>
      </div>
      
      {/* Applied */}
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
      
      {/* Interview */}
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
      
      {/* Offers */}
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
      
      {/* Accepted */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
        <div className="text-sm text-gray-500">Accepted</div>
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-700 transition-all duration-500" 
            style={{ width: `${(stats.accepted / Math.max(1, stats.totalJobs)) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Rejected */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        <div className="text-sm text-gray-500">Rejected</div>
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-red-500 transition-all duration-500" 
            style={{ width: `${(stats.rejected / Math.max(1, stats.totalJobs)) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Withdrawn */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-2xl font-bold text-gray-600">{stats.withdrawn}</div>
        <div className="text-sm text-gray-500">Withdrawn</div>
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gray-400 transition-all duration-500" 
            style={{ width: `${(stats.withdrawn / Math.max(1, stats.totalJobs)) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Success Rate */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-2xl font-bold text-indigo-600">{stats.successRate}%</div>
        <div className="text-sm text-gray-500">Success Rate</div>
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500" 
            style={{ width: `${stats.successRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
