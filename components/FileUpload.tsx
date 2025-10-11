'use client';

/**
 * File Upload Component
 * Handles drag-and-drop file uploads with validation
 */

import { useState, useCallback, useRef } from 'react';
import { DocumentType } from '@/lib/types';
import { validateFileType, validateFileSize, formatFileSize } from '@/lib/utils';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
}

const ALLOWED_TYPES: DocumentType[] = ['pdf', 'txt', 'docx', 'md'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUpload({ onFileUpload, isUploading = false }: FileUploadProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = useCallback(async (file: File): Promise<void> => {
    setUploadError('');

    // Validate file type
    if (!validateFileType(file, ALLOWED_TYPES)) {
      setUploadError(`File type not supported. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
      return;
    }

    // Validate file size
    if (!validateFileSize(file, MAX_FILE_SIZE)) {
      setUploadError(`File size exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    try {
      await onFileUpload(file);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [onFileUpload]);

  const openFileDialog = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.map(type => `.${type}`).join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Upload your documents
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop files here, or{' '}
              <button
                onClick={openFileDialog}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                browse files
              </button>
            </p>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Supported formats: {ALLOWED_TYPES.join(', ').toUpperCase()}</p>
            <p>Maximum file size: {formatFileSize(MAX_FILE_SIZE)}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800 font-medium">Uploading file...</p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Upload Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• PDF files work best for documents with complex formatting</li>
          <li>• Text files (.txt) are processed fastest</li>
          <li>• Markdown files (.md) preserve formatting and structure</li>
          <li>• Large documents may take longer to process</li>
        </ul>
      </div>
    </div>
  );
}
