
import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
  disabled?: boolean;
}

export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({ checked, onChange, className = "", disabled = false }) => {
  return (
    <motion.div
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        onChange();
      }}
      className={`relative flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors ${
        disabled ? 'bg-surface-variant border-outline/20 cursor-not-allowed' : 'cursor-pointer'
      } ${
        checked ? 'bg-primary border-primary' : 'bg-transparent border-outline hover:border-primary/50'
      } ${className}`}
      whileTap={disabled ? {} : { scale: 0.85 }}
      initial={false}
      animate={checked ? "checked" : "unchecked"}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 text-on-primary pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M20 6L9 17L4 12"
          variants={{
            checked: { pathLength: 1, opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
            unchecked: { pathLength: 0, opacity: 0, transition: { duration: 0.1 } }
          }}
        />
      </motion.svg>
    </motion.div>
  );
};
