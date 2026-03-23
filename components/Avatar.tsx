import React from 'react';

interface AvatarProps {
  src: string;
  alt: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className = 'w-8 h-8 rounded-full' }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover border border-outline/10 shadow-sm ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
