import { Header } from '@/components/dashboard/Header';
import StudentProfileView from '@/components/Students/StudentProfileView';

export default function StudentProfilePage() {
  return (
    <div className="w-full min-h-screen overflow-y-auto bg-bg-light-secondary/60 dark:bg-bg-dark-primary">
      <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-4">
        <Header value="Student Profile" />
        <div className="mt-4">
          <StudentProfileView />
        </div>
      </div>
    </div>
  );
}
