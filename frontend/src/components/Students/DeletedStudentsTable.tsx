'use client';

import { useState } from 'react';
import { StudentAPI } from '@/api/Student/StudentsAPI';
import { Trash2, Eye } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import DeletedStudentDetailModal from './DeletedStudentDetailModal';

interface DeletedStudent {
  student_id: number;
  original_student_id: number;
  student_name: string;
  class_name: string;
  father_name?: string;
  reason: string;
  deleted_by: number;
  deleted_by_name?: string;
  deleted_at: string;
  attendance_summary?: {
    total_records: number;
    breakdown: Record<string, number>;
    snapshot_date: string;
  };
}

interface DeletedStudentsTableProps {
  students: DeletedStudent[];
  onRestoreSuccess: () => void;
}

export default function DeletedStudentsTable({
  students,
  onRestoreSuccess,
}: DeletedStudentsTableProps) {
  const { role } = useRole();
  const isAdmin = role === 'ADMIN';
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [viewingStudent, setViewingStudent] = useState<DeletedStudent | null>(null);

  const formatDate = (value: string) => new Date(value).toLocaleDateString();

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

  const handlePermanentlyDelete = async (deletedRecordId: number, name: string) => {
    const confirmed = window.confirm(
      `⚠️ Permanently delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(deletedRecordId);
    setError('');
    try {
      await StudentAPI.PermanentlyDeleteStudent(deletedRecordId);
      onRestoreSuccess(); // Refresh the list
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to permanently delete student.');
    } finally {
      setDeletingId(null);
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
        <>
          <div className="hidden sm:block w-full overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed border-collapse">
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
                    <td className="py-4 px-4 text-sm text-gray-700">{formatDate(student.deleted_at)}</td>
                    <td className="py-4 px-4 text-sm">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => setViewingStudent(student)}
                          title="View student details"
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleRestore(student.student_id, student.student_name)}
                          disabled={restoringId === student.student_id || deletingId === student.student_id}
                          className="text-green-600 text-sm hover:underline disabled:opacity-50"
                        >
                          {restoringId === student.student_id ? 'Restoring...' : 'Restore'}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handlePermanentlyDelete(student.student_id, student.student_name)}
                            disabled={deletingId === student.student_id || restoringId === student.student_id}
                            title="Permanently delete this student record"
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === student.student_id ? (
                              <span className="text-xs">Deleting...</span>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-3">
            {students.map((student, index) => (
              <div key={student.student_id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sr. No</p>
                    <p className="text-sm font-semibold text-gray-900">{index + 1}. {student.student_name}</p>
                  </div>
                  <button
                    onClick={() => setViewingStudent(student)}
                    title="View student details"
                    className="rounded-full border border-blue-100 bg-blue-50 p-2 text-blue-600"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Class</p>
                    <p className="font-medium text-gray-800">{student.class_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reason</p>
                    <p className="font-medium text-gray-800 break-words">{student.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deleted By</p>
                    <p className="font-medium text-gray-800">{student.deleted_by_name || `User #${student.deleted_by}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deletion Date</p>
                    <p className="font-medium text-gray-800">{formatDate(student.deleted_at)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRestore(student.student_id, student.student_name)}
                    disabled={restoringId === student.student_id || deletingId === student.student_id}
                    className="rounded-full border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-50"
                  >
                    {restoringId === student.student_id ? 'Restoring...' : 'Restore'}
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handlePermanentlyDelete(student.student_id, student.student_name)}
                      disabled={deletingId === student.student_id || restoringId === student.student_id}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                    >
                      {deletingId === student.student_id ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {viewingStudent && (
        <DeletedStudentDetailModal
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </div>
  );
}
