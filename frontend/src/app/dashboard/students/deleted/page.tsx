'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentAPI } from '@/api/Student/StudentsAPI';
import DeletedStudentsTable from '@/components/Students/DeletedStudentsTable';
import { useRole } from '@/context/RoleContext';

export default function DeletedStudentsPage() {
  const router = useRouter();
  const { role, permissions, permissionsLoaded } = useRole();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewDeletedStudents = permissionsLoaded
    ? !!permissions?.deleted_students?.view
    : ['ADMIN', 'CHIEF_PRINCIPAL', 'PRINCIPAL'].includes(role);

  useEffect(() => {
    if (!permissionsLoaded) return;

    if (!canViewDeletedStudents) {
      router.replace('/unauthorized');
      return;
    }

    fetchDeleted();
  }, [permissionsLoaded, canViewDeletedStudents, router]);

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
      <div className="rounded-[24px] border border-border bg-gradient-to-r from-primary via-primary/80 to-accent p-5 text-center shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)]">
        <h1 className="text-2xl font-semibold text-white">Deleted Students</h1>
      </div>

      <div className="rounded-[24px] border border-border bg-card/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
        <DeletedStudentsTable students={data} onRestoreSuccess={fetchDeleted} />
      </div>
    </div>
  );
}
