'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentAPI } from '@/api/Student/StudentsAPI';
import DeletedStudentsTable from '@/components/Students/DeletedStudentsTable';

export default function DeletedStudentsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!['ADMIN', 'PRINCIPAL'].includes(user?.role)) {
      router.replace('/unauthorized');
      return;
    }
    fetchDeleted();
  }, []);

  const fetchDeleted = async () => {
    setLoading(true);
    try {
      const result = await StudentAPI.GetDeletedStudents();
      setData(result);
    } catch (error) {
      console.error('Error fetching deleted students:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full space-y-4">
      <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 p-5 text-center shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)]">
        <h1 className="text-2xl font-semibold text-white">Deleted Students</h1>
      </div>

      <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
        <DeletedStudentsTable students={data} onRestoreSuccess={fetchDeleted} />
      </div>
    </div>
  );
}
