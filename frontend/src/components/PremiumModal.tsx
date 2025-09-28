import React from 'react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  currentPlan: string;
  onUpgrade?: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  feature,
  currentPlan,
  onUpgrade
}) => {
  if (!isOpen) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default behavior: redirect to plan details page
      window.location.href = '/plan_details';
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 relative shadow-xl border border-gray-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Premium crown icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm2.7-2h8.6l.9-4.4L14 12l-2-3.4L10 12l-3.2-2.4L7.7 14z"/>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Unlimited Feature Required</h3>
          <p className="text-gray-600 mb-2">
            <strong>{feature}</strong> is exclusively available with our <span className="text-amber-600 font-semibold">Unlimited Plan</span>.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You're currently on the <strong className="text-purple-600">{currentPlan}</strong> plan. Upgrade to Unlimited to access this feature!
          </p>

          {/* Benefits list */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 text-center">With Unlimited Plan you get:</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center bg-white p-2 rounded border border-gray-100">
                <svg className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Excel Export</span>
              </div>
              <div className="flex items-center bg-white p-2 rounded border border-gray-100">
                <svg className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Unlimited Job Extractions</span>
              </div>
              <div className="flex items-center bg-white p-2 rounded border border-gray-100">
                <svg className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Unlimited Storage</span>
              </div>
              <div className="flex items-center bg-white p-2 rounded border border-gray-100">
                <svg className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Priority Support</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-md transition-colors font-medium shadow-md"
            >
              Upgrade to Unlimited
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
