import { motion } from "framer-motion";

interface LoaderProps {
  isActive: boolean;
}

const Loader = ({ isActive }: LoaderProps) => {
  return (
    isActive && (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <motion.div
          className="relative flex space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.span
              key={i}
              className="w-4 h-4 bg-black dark:bg-white rounded-full"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    )
  );
};

export default Loader;
