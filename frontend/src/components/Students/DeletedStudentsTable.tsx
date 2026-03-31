'use client';

import { useState } from 'react';
import { StudentAPI } from '@/api/Student/StudentsAPI';

interface DeletedStudent {
  student_id: number;
  student_name: string;
  class_name: string;
  reason: string;
  deleted_by: number;
  deleted_by_name?: string;
  deleted_at: string;
}

interface DeletedStudentsTableProps {
  students: DeletedStudent[];
  onRestoreSuccess: () => void;
}

export default function DeletedStudentsTable({
  students,
  onRestoreSuccess,
}: DeletedStudentsTableProps) {
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleRestore = async (deletedRecordId: number, name: string) => {
    const confirmed = window.confirm(`Restore "${name}" back to active students?`);
    if (!confirmed) return;

    setRestoringId(deletedRecordId);
    setError('');
    try {
      await StudentAPI.RestoreStudent(deletedRecordId);
      onRestoreSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to restore student.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {students.length === 0 ? (
        <p className="text-gray-500 text-sm">No deleted students found.</p>
      ) : (
        <table className="w-full table-fixed border-collapse">

          {/* ── Dark header — matches Students List table header exactly ── */}
          <thead>
            <tr className="bg-black text-white">
              <th className="py-3 px-4 text-left text-sm font-semibold w-16">Sr. No</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Student Name</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Class</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Reason</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Deleted By</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Deletion Date</th>
              <th className="py-3 px-4 text-left text-sm font-semibold w-24">Actions</th>
            </tr>
          </thead>

          {/* ── Rows — matches Students List row style exactly ── */}
          <tbody>
            {students.map((student, index) => (
              <tr key={student.student_id} className="border-b border-gray-200">
                <td className="py-4 px-4 text-sm text-gray-700">{index + 1}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{student.student_name}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{student.class_name}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{student.reason}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {student.deleted_by_name || `User #${student.deleted_by}`}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {new Date(student.deleted_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-4 text-sm">
                  <button
                    onClick={() => handleRestore(student.student_id, student.student_name)}
                    disabled={restoringId === student.student_id}
                    className="text-green-600 text-sm hover:underline disabled:opacity-50"
                  >
                    {restoringId === student.student_id ? 'Restoring...' : 'Restore'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      )}
    </div>
  );
}
