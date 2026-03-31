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
    <div className="w-full">

      {/* ── Black title bar — matches "Students List" header exactly ── */}
      <div className="w-full bg-black py-5 text-center">
        <h1 className="text-2xl font-bold text-white">Deleted Students</h1>
      </div>

      {/* ── White card — matches the card below the Students List header ── */}
      <div className="mx-4 my-4 bg-white border border-gray-200 rounded p-6">
        <DeletedStudentsTable students={data} onRestoreSuccess={fetchDeleted} />
      </div>

    </div>
  );
}
