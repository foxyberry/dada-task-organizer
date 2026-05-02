import React from "react";
import { motion } from "motion/react";

type MaxWidth = "max-w-sm" | "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl";
type MaxHeight = "max-h-[80vh]" | "max-h-[85vh]" | "max-h-[90vh]";

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: MaxWidth;
  maxHeight?: MaxHeight;
}

export const Modal: React.FC<ModalProps> = ({
  onClose,
  children,
  maxWidth = "max-w-2xl",
  maxHeight = "max-h-[85vh]",
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`bg-white w-full ${maxWidth} rounded-3xl shadow-2xl overflow-hidden flex flex-col ${maxHeight}`}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
