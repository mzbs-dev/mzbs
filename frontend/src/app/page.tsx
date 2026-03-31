"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-0" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-primary/10 blur-[100px] z-0" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] z-0" />
      <div className="absolute top-1/4 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px] z-0" />

      {/* Content container */}
      <motion.div
        className="relative z-10 flex flex-col items-center 
        ring ring-black justify-center p-8 rounded-2xl bg-white/70 dark:bg-white backdrop-blur-sm shadow-xl max-w-md w-full mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo Section */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            <Image
              src="/logo.png"
              alt="Logo"
              width={160}
              height={160}
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-3xl md:text-4xl font-bold text-slate-800 text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Welcome Back
        </motion.h1>

        {/* Login Button */}
        <motion.button
          onClick={() => router.push("/login")}
          className="w-full mt-2 px-6 py-3.5 text-lg font-medium bg-gray-900 text-white dark:text-white bg-primary rounded-xl shadow-lg hover:shadow-primary/25 hover:translate-y-[-2px] active:translate-y-[0px] transition-all duration-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          Login
        </motion.button>
      </motion.div>
    </div>
  );
}
