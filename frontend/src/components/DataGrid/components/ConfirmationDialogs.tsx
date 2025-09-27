import React from 'react';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { Job } from '../../../types/job';

interface ConfirmationDialogsProps {
  // Delete all confirmation
  showDeleteAllConfirm: boolean;
  isDeletingAll: boolean;
  onDeleteAllConfirm: () => void;
  onDeleteAllCancel: () => void;
  
  // Delete single job confirmation
  jobToDelete: Job | null;
  isDeleting: boolean;
  onDeleteJobConfirm: () => void;
  onDeleteJobCancel: () => void;
}

export const ConfirmationDialogs: React.FC<ConfirmationDialogsProps> = ({
  showDeleteAllConfirm,
  isDeletingAll,
  onDeleteAllConfirm,
  onDeleteAllCancel,
  jobToDelete,
  isDeleting,
  onDeleteJobConfirm,
  onDeleteJobCancel,
}) => {
  return (
    <>
      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={showDeleteAllConfirm}
        onClose={() => !isDeletingAll && onDeleteAllCancel()}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
              </div>
              <Dialog.Title className="text-lg font-medium text-gray-900">
                Delete all jobs
              </Dialog.Title>
            </div>
            <Dialog.Description className="text-gray-600 mb-6">
              Are you sure you want to delete all jobs? This action cannot be undone and will permanently remove all your job applications.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                onClick={onDeleteAllCancel}
                disabled={isDeletingAll}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                onClick={onDeleteAllConfirm}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Delete Single Job Confirmation Dialog */}
      <Dialog
        open={!!jobToDelete}
        onClose={() => !isDeleting && onDeleteJobCancel()}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
              </div>
              <Dialog.Title className="text-lg font-medium text-gray-900">
                Delete job application
              </Dialog.Title>
            </div>
            <Dialog.Description className="text-gray-600 mb-6">
              Are you sure you want to delete the job application for "{jobToDelete?.position}" at {jobToDelete?.company}? This action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                onClick={onDeleteJobCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                onClick={onDeleteJobConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};
