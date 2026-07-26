"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] px-4 py-10">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.15),_transparent_35%)]" />
      <div className="absolute left-[-3rem] top-1/4 h-40 w-40 rounded-full bg-blue-400/10 blur-[100px]" />
      <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-[120px]" />

      <motion.div
        className="relative z-10 flex w-full max-w-md flex-col items-center justify-center rounded-[32px] border border-white/70 bg-white/80 p-8 text-center shadow-[0_30px_90px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="mb-6"
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="rounded-[24px] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4 shadow-lg">
            <Image
              src="/logo.png"
              alt="Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
        </motion.div>

        <motion.h1
          className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          Welcome Back
        </motion.h1>
        <motion.p
          className="mb-8 text-sm leading-6 text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          Streamline admissions, attendance, fees, and daily school operations in one polished experience.
        </motion.p>

        <motion.button
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-lg font-medium text-white shadow-lg shadow-blue-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-300 active:translate-y-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
        >
          Login
        </motion.button>
      </motion.div>
    </div>
  );
}
