import React, { useState, useEffect } from 'react';
import { fileUploadService } from '../services/fileUploadService';
import { getPlanCurrentLimits } from '../services/subscriptionService';
import { isAuthenticated as checkAuthentication } from '../services/authService';
import { PremiumModal } from './PremiumModal';

interface FileInfo {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
  upload_date: string;
  storage_type: string;
}

interface UserPlan {
  plan: string;
  is_trial: boolean;
  limits?: {
    allow_unlimited_extractions: boolean;
  };
}

export const CVManagement: React.FC = () => {
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Check if user has unlimited access
  const hasUnlimitedAccess = userPlan?.plan === 'unlimited';

  useEffect(() => {
    checkAuthAndLoadPlan();
    
    // Fallback timeout to ensure loading never gets stuck
    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 second fallback
    
    return () => clearTimeout(fallbackTimeout);
  }, []);

  useEffect(() => {
    if (hasUnlimitedAccess && !isLoading) {
      loadCurrentFile();
    }
  }, [hasUnlimitedAccess, isLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const loadUserPlan = async () => {
    try {
      const planData = await getPlanCurrentLimits();
      setUserPlan(planData);
      return planData;
    } catch (error) {
      console.error('Error loading user plan:', error);
      // Don't set a fake plan, let the component handle the null state
      throw error;
    }
  };

  const checkAuthAndLoadPlan = async () => {
    // Always show loading for at least 0.5 seconds
    const startTime = Date.now();
    
    try {
      // First check authentication
      const authStatus = checkAuthentication();
      
      if (authStatus) {
        // If authenticated, load plan data
        const planData = await loadUserPlan();
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error in checkAuthAndLoadPlan:', error);
      setUserPlan(null);
      setIsAuthenticated(false);
    }
    
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 500 - elapsedTime);
        
    setTimeout(() => {
      setIsLoading(false);
    }, remainingTime);
  };

  const loadCurrentFile = async () => {
    try {
      const fileInfo = await fileUploadService.getMyFile();
      setCurrentFile(fileInfo.file);
    } catch (error) {
      console.error('Error loading file info:', error);
      setCurrentFile(null);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    if (type === 'success') {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        showMessage('Only PDF, DOC, and DOCX files are allowed.', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showMessage('Please select a CV file to upload.', 'error');
      return;
    }

    if (!hasUnlimitedAccess) {
      setShowPremiumModal(true);
      return;
    }

    setIsUploading(true);
    try {
      const result = await fileUploadService.uploadFile(selectedFile, true);
      showMessage(`CV uploaded successfully! Plan: ${result.user_plan.plan_name}`, 'success');
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await loadCurrentFile();
    } catch (error) {
      console.error('Upload error:', error);
      showMessage(`CV upload failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!currentFile) {
      showMessage('No CV to download.', 'error');
      return;
    }

    if (!hasUnlimitedAccess) {
      setShowPremiumModal(true);
      return;
    }

    try {
      await fileUploadService.downloadFile(currentFile.file_id, currentFile.filename);
      showMessage('CV download started.', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showMessage(`CV download failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!currentFile) {
      showMessage('No CV to delete.', 'error');
      return;
    }

    if (!hasUnlimitedAccess) {
      setShowPremiumModal(true);
      return;
    }

    if (!confirm('Are you sure you want to delete this CV? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await fileUploadService.deleteFile(currentFile.file_id);
      showMessage(`CV deleted successfully: ${result.deleted_file.filename}`, 'success');
      await loadCurrentFile();
    } catch (error) {
      console.error('Delete error:', error);
      showMessage(`CV delete failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // Show loading screen while checking plan
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6 animate-pulse">
          <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading CV Management</h2>
        <p className="text-gray-600 mb-4">
          Checking authentication and plan access...
        </p>
        <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Debug: isLoading={isLoading.toString()}, plan={userPlan?.plan || 'null'}
        </p>
      </div>
    );
  }

  // Show authentication required if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-6">
          Please log in to access CV Management.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/login" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium">
            Go to Login
          </a>
          <a href="/" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium">
            Go Back
          </a>
        </div>
      </div>
    );
  }

  // Show error state if plan couldn't be loaded (but user is authenticated)
  if (!isLoading && isAuthenticated && userPlan === null) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Plan Information</h2>
        <p className="text-gray-600 mb-6">
          We couldn't load your plan information. Please try refreshing the page or contact support if the problem persists.
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
          >
            Refresh Page
          </button>
          <a href="/" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium">
            Go Back
          </a>
        </div>
      </div>
    );
  }

  // Show premium restriction for non-unlimited users
  if (!hasUnlimitedAccess) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm2.7-2h8.6l.9-4.4L14 12l-2-3.4L10 12l-3.2-2.4L7.7 14z"/>
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Premium Feature</h2>
        <p className="text-gray-600 mb-4">
          <strong>CV Management</strong> is a premium feature only available with the <span className="text-amber-600 font-semibold">Unlimited Plan</span>.
        </p>
        
        {/* Current Plan Info */}
        <div className="bg-white border-2 border-purple-200 rounded-lg p-4 mb-6 max-w-sm mx-auto">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium text-gray-600">Your Current Plan</span>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold text-purple-600">{userPlan?.plan || 'Free'}</span>
            {userPlan?.is_trial && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Trial</span>}
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mb-8">
          Upgrade to <strong className="text-amber-600">Unlimited</strong> to access CV Management and other premium features!
        </p>
        
        <div className="flex gap-3 justify-center">
          <a href="/" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium">
            Go Back
          </a>
          <a href="/plan_details" className="px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-md transition-colors font-medium shadow-md">
            Upgrade to Unlimited
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">CV Management</h1>
      
      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload CV</h2>
        
        <div className="mb-4">
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
            Select CV File (PDF, DOC, DOCX - Max 10MB)
          </label>
          <input 
            type="file" 
            id="file-input" 
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        <button 
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Upload CV'}
        </button>
      </div>

      {/* Current File Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Current CV</h2>
          {currentFile && (
            <div className="relative dropdown-container">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        handleDownload();
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CV
                    </button>
                    <button 
                      onClick={() => {
                        handleDelete();
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete CV
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {currentFile ? (
          <div className="space-y-2">
            <p><strong>Filename:</strong> {currentFile.filename}</p>
            <p><strong>Size:</strong> {formatFileSize(currentFile.size)}</p>
            <p><strong>Type:</strong> {currentFile.content_type}</p>
            <p><strong>Upload Date:</strong> {new Date(currentFile.upload_date).toLocaleString()}</p>
            <p><strong>Storage:</strong> {currentFile.storage_type}</p>
          </div>
        ) : (
          <p className="text-gray-500">No CV uploaded yet.</p>
        )}
      </div>
    </div>
  );
};
