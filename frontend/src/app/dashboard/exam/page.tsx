import React from "react";
import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

export default function ExamPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-border/80 bg-card/80 p-6 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
            Exam Management
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Exam
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Use the exam workspace to enter marks for students and manage academic records from one place.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/dashboard/exam/enter_marks"
          className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Enter Marks
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Select a class, teacher, subject, and exam type to enter student marks.
          </p>
        </Link>

        <Link
          href="/dashboard/exam/view_marks"
          className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-50 p-2 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-300">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              View Marks
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Review class-wise results by subject and exam type across the dates that were recorded.
          </p>
        </Link>

        <Link
          href="/dashboard/exam/edit_marks"
          className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Edit Marks
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Load a class’s previous exams and view, edit, or delete recorded results based on your role.
          </p>
        </Link>

        <Link
          href="/dashboard/exam/class_result"
          className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Class Result
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Generate the class result sheet for the selected exam, including total marks and positions.
          </p>
        </Link>

        <Link
          href="/dashboard/exam/exam_sheet"
          className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Exam Sheet
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Create a blank exam sheet with students and subject columns to prepare for score entry.
          </p>
        </Link>
      </div>
    </div>
  );
}
