import { useEffect, useState } from 'react';
import { consentService } from '../services/consentService';

interface ConsentModalContentProps {
  isOpen: boolean;
  onAccept: () => void;
}

interface ConsentModalProps {
  onAccept?: () => void;
}

const ConsentModalContent: React.FC<ConsentModalContentProps> = ({ isOpen, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="relative max-w-3xl w-full max-h-[85vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">AutoGrid Job Saver Extension</h2>
          <p className="text-gray-600 text-sm mt-1">Chrome Extension - Data Privacy Notice</p>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Main Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <p className="text-gray-800 leading-relaxed">
              This is a reminder that if you use our <strong>AutoGrid Job Saver Chrome Extension</strong>, you will be retrieving HTML content about what you are seeing <strong>only when you press the "Save offer" button</strong>.
            </p>
          </div>

          {/* What We Collect */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What the Extension Collects</h3>
            <p className="text-gray-700 mb-3">When you click "Save offer" in the extension, we collect:</p>
            <ul className="space-y-2 text-gray-700 pl-5">
              <li className="list-disc">The URL of the job posting page</li>
              <li className="list-disc">Publicly visible HTML content from that page</li>
              <li className="list-disc">Job information displayed on the page (title, company, description, etc.)</li>
            </ul>
            <p className="text-gray-600 text-sm mt-3 italic">
              We do NOT collect data automatically. Data is only saved when you explicitly click the "Save offer" button.
            </p>
          </div>

          {/* Purpose */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Why We Collect This Data</h3>
            <p className="text-gray-700 mb-2">The collected data is used exclusively to:</p>
            <ul className="space-y-2 text-gray-700 pl-5">
              <li className="list-disc">Store and organize your saved job offers in your account</li>
              <li className="list-disc">Display the job information in your dashboard</li>
              <li className="list-disc">Allow you to track and manage your job applications</li>
            </ul>
            <p className="text-gray-600 text-sm mt-3">
              <strong>We do NOT</strong> analyze, sell, or share your data with third parties for marketing purposes.
            </p>
          </div>

          {/* User Responsibility */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Responsibility</h3>
            <div className="space-y-2 text-gray-800">
              <p>
                <strong>Important:</strong> You guarantee that you have the legal right to save any data from third-party websites that you choose to store using this extension.
              </p>
              <p>
                You are solely responsible for ensuring you have a legitimate basis to save and process any information through the extension.
              </p>
              <p className="text-sm text-gray-700">
                AutoGrid acts solely as a technical storage provider and does not analyze or reuse the data you save for its own purposes.
              </p>
            </div>
          </div>

          {/* Accuracy Disclaimer */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Accuracy Disclaimer</h3>
            <p className="text-gray-700">
              AutoGrid Saver Extension operates as a global parsing extension, so certain results might include inaccurate parsing or unexpected functionalities. Please review outputs carefully and report any issues you encounter.
            </p>
          </div>

          {/* Legal Documents */}
          <div className="border-t border-gray-200 pt-5">
            <p className="text-gray-700 mb-3">
              By accepting, you declare that you have read and understood our complete legal documentation:
            </p>
            <div className="flex flex-wrap gap-2">
              <a 
                href="/legal-notice" 
                target="_blank"
                className="text-blue-600 hover:text-blue-700 underline text-sm"
              >
                Legal Notice
              </a>
              <span className="text-gray-400">•</span>
              <a 
                href="/privacy-policy" 
                target="_blank"
                className="text-blue-600 hover:text-blue-700 underline text-sm"
              >
                Privacy Policy
              </a>
              <span className="text-gray-400">•</span>
              <a 
                href="/terms-of-service" 
                target="_blank"
                className="text-blue-600 hover:text-blue-700 underline text-sm"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex-shrink-0">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-700 text-center">
              By clicking "I Accept & Continue", you confirm that you have read, understood, and agree to all the terms described above.
            </p>
            
            <button
              onClick={onAccept}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              I Accept & Continue
            </button>

            <p className="text-xs text-gray-500 text-center">
              This consent will be requested again in 7 days. You can withdraw consent at any time by contacting us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(consentService.shouldShowConsentModal());
  }, []);

  const handleAccept = () => {
    consentService.saveConsent();
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      const container = document.getElementById('consent-modal-container');
      container?.classList.add('hidden');
    }
    onAccept?.();
  };

  return <ConsentModalContent isOpen={isOpen} onAccept={handleAccept} />;
};

export default ConsentModal;
