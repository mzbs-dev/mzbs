'use client';

import { useState } from 'react';

interface DeleteStudentModalProps {
  studentId: number;
  studentName: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export default function DeleteStudentModal({
  studentId,
  studentName,
  onConfirm,
  onClose,
}: DeleteStudentModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Reason for deletion is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError('Failed to delete student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-lg font-bold mb-2 text-red-600">Delete Student</h2>
        <p className="text-gray-700 mb-4">
          You are about to delete <strong>{studentName}</strong>. This action can be
          reversed by an admin from the Deleted Students page.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for Deletion <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Enter a mandatory reason..."
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
