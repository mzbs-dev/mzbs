'use client';

import { X } from 'lucide-react';

interface AttendanceSummary {
  total_records: number;
  breakdown: Record<string, number>;
  snapshot_date: string;
}

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
  attendance_summary?: AttendanceSummary;
  fee_summary?: {
    total_fees: number;
    paid_count: number;
    unpaid_count: number;
    paid_records?: {
      fee_id: number;
      fee_month: string;
      fee_year: string;
      fee_amount: string;
      fee_status: string;
    }[];
    snapshot_date: string;
  };
}

interface Props {
  student: DeletedStudent;
  onClose: () => void;
}

export default function DeletedStudentDetailModal({ student, onClose }: Props) {
  const summary = student.attendance_summary;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-50 p-3 sm:items-center sm:p-6">
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl sm:p-6 max-h-[calc(100vh-1.5rem)] overflow-y-auto">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-800">Deleted Student Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Student Info */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">Student Name</p>
            <p className="text-sm font-medium text-gray-800">{student.student_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Class</p>
            <p className="text-sm font-medium text-gray-800">{student.class_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Father Name</p>
            <p className="text-sm font-medium text-gray-800">{student.father_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Deletion Date</p>
            <p className="text-sm font-medium text-gray-800">
              {new Date(student.deleted_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Deleted By</p>
            <p className="text-sm font-medium text-gray-800">
              {student.deleted_by_name || `User #${student.deleted_by}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reason</p>
            <p className="text-sm font-medium text-gray-800">{student.reason}</p>
          </div>
        </div>

        <hr className="mb-4" />

        {/* Attendance Summary */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Attendance Summary
          <span className="ml-2 text-xs text-gray-400 font-normal">
            (at time of deletion)
          </span>
        </h3>

        {summary ? (
          <>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(summary.breakdown).map(([status, count]) => (
                <div
                  key={status}
                  className="flex justify-between items-center bg-gray-50 rounded px-3 py-2"
                >
                  <span className="text-sm text-gray-600">{status}</span>
                  <span className="text-sm font-bold text-gray-800">{count}</span>
                </div>
              ))}
              <div className="flex justify-between items-center bg-black text-white rounded px-3 py-2">
                <span className="text-sm">Total</span>
                <span className="text-sm font-bold">{summary.total_records}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Snapshot taken: {new Date(summary.snapshot_date).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">No attendance data available.</p>
        )}

        {/* Fee Summary */}
        <hr className="mb-4 mt-4" />
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Fee Summary
          <span className="ml-2 text-xs text-gray-400 font-normal">
            (at time of deletion)
          </span>
        </h3>

        {student.fee_summary ? (
          <>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex flex-col items-center bg-gray-50 rounded px-3 py-2">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-sm font-bold text-gray-800">{student.fee_summary.total_fees}</span>
              </div>
              <div className="flex flex-col items-center bg-green-50 rounded px-3 py-2">
                <span className="text-xs text-gray-500">Paid</span>
                <span className="text-sm font-bold text-green-700">{student.fee_summary.paid_count}</span>
              </div>
              <div className="flex flex-col items-center bg-red-50 rounded px-3 py-2">
                <span className="text-xs text-gray-500">Unpaid</span>
                <span className="text-sm font-bold text-red-600">{student.fee_summary.unpaid_count}</span>
              </div>
            </div>

            {student.fee_summary.paid_records?.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full min-w-[420px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="py-2 px-3 text-left">Month</th>
                      <th className="py-2 px-3 text-left">Year</th>
                      <th className="py-2 px-3 text-left">Amount</th>
                      <th className="py-2 px-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.fee_summary.paid_records.map((fee: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-700">{fee.fee_month}</td>
                        <td className="py-2 px-3 text-gray-700">{fee.fee_year}</td>
                        <td className="py-2 px-3 text-gray-700">{fee.fee_amount}</td>
                        <td className="py-2 px-3 text-green-600">{fee.fee_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No fee data available.</p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="w-full rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 sm:w-auto"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
