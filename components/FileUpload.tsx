import React, { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  multiple: boolean;
  title: string;
  error: string | null;
  onError: (error: string | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, accept, multiple, title, error, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): boolean => {
    if (!accept || accept === '*/*') {
      return true;
    }
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
  
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();
  
      const isValid = acceptedTypes.some(type => {
        if (type.endsWith('/*')) { // Wildcard e.g. image/*
          return fileType.startsWith(type.slice(0, -1));
        }
        if (type.startsWith('.')) { // Extension e.g. .pdf
          return fileName.endsWith(type);
        }
        return fileType === type; // MIME type e.g. image/jpeg
      });
  
      if (!isValid) {
        return false;
      }
    }
    return true;
  }, [accept]);

  const handleFileProcessing = useCallback((files: File[]) => {
      if (files && files.length > 0) {
        if (validateFiles(files)) {
          onFilesSelected(files);
          onError(null);
        } else {
          onError(`Invalid file type. Please upload: ${accept}`);
          // Clear the input value so the user can select the same file again after an error
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      }
  }, [validateFiles, onFilesSelected, onError, accept]);


  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileProcessing(files);
  }, [handleFileProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileProcessing(files);
  };

  const handleClick = () => {
    // Clear previous error when user tries to upload again
    if (error) {
      onError(null);
    }
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-300 ${
        isDragging 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : error 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center">
        <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-primary-600 dark:text-primary-400">{title}</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">{multiple ? 'Multiple files allowed' : 'Single file only'}</p>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default FileUpload;
