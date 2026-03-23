
import React, { useState, useCallback } from 'react';
import { UploadCloudIcon, XIcon } from './icons';

interface DragDropOverlayProps {
  onUpload: (files: FileList) => void;
  children: React.ReactNode;
  isBlocked?: boolean;
  className?: string;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ onUpload, children, isBlocked, className = "" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !isBlocked) {
      onUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [onUpload, isBlocked]);

  const manualClose = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);
  };

  return (
    <div 
      onDragEnter={handleDragEnter} 
      onDragLeave={handleDragLeave} 
      onDragOver={handleDragOver} 
      onDrop={handleDrop}
      className={`relative ${className}`}
    >
      {isDragging && !isBlocked && (
        <div 
            className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-3xl flex flex-col items-center justify-center cursor-pointer"
            onClick={manualClose}
            title="Click to cancel drag"
        >
          <div className="bg-surface p-6 rounded-full shadow-m3-lg mb-4 animate-bounce">
            <UploadCloudIcon className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-2xl font-black text-primary tracking-tight">Drop files to upload</h3>
          <p className="mt-2 text-sm font-bold text-primary/70 uppercase tracking-widest bg-surface/50 px-3 py-1 rounded-full">
             <XIcon className="inline w-3 h-3 mr-1" /> Click anywhere to cancel
          </p>
        </div>
      )}
      {children}
    </div>
  );
};
