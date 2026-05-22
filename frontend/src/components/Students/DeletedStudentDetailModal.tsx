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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-800">Deleted Student Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-3 mb-5">
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
            <div className="grid grid-cols-2 gap-2 mb-3">
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
            <div className="grid grid-cols-3 gap-2 mb-3">
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
              <table className="w-full text-xs border-collapse">
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
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No fee data available.</p>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
