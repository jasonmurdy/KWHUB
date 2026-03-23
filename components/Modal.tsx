
import React from 'react';
import { motion, Variants } from 'framer-motion';

const backdropVariants: Variants = {
  visible: { opacity: 1, pointerEvents: "auto" },
  hidden: { opacity: 0, pointerEvents: "none" },
};

const modalVariants: Variants = {
  hidden: { y: "50px", opacity: 0, scale: 0.95 },
  visible: {
    y: "0px",
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: { y: "50px", opacity: 0, scale: 0.95, transition: { duration: 0.2 }, pointerEvents: "none" },
};

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Classes for the backdrop container. Use for z-index and alignment.
   * Default: "z-[150] flex items-center justify-center"
   */
  containerClassName?: string;
  /**
   * Classes for the modal panel itself. Use for width, height, background, border.
   * Default: "w-full max-w-2xl max-h-[90vh] bg-surface border border-outline/30 rounded-3xl shadow-m3-lg"
   */
  panelClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  onClose, 
  children, 
  containerClassName = "z-[150] flex items-center justify-center", 
  panelClassName = "w-full max-w-2xl max-h-[90vh] bg-surface border border-outline/30 rounded-3xl shadow-m3-lg"
}) => {
  return (
    <motion.div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm p-4 ${containerClassName}`}
      onClick={onClose}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div
        className={`flex flex-col overflow-hidden ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
