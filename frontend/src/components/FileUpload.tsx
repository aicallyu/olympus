import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';

type UploadState = 'idle' | 'dragging' | 'validating' | 'uploading' | 'success' | 'error';

interface FileUploadProps {
  warRoomId: string;
  onUploadComplete?: (fileUrl: string) => void;
  onUploadError?: (error: string) => void;
}

interface UploadError {
  message: string;
  type: 'validation' | 'network' | 'server';
}

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const useFileUpload = (warRoomId: string) => {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const validateFile = (file: File): UploadError | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        message: 'Invalid file type. Only PDF, PNG, and JPG files are allowed.',
        type: 'validation'
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        message: 'File size exceeds 10MB limit.',
        type: 'validation'
      };
    }
    return null;
  };

  const uploadFile = (file: File, onSuccess: (url: string) => void, onError: (error: string) => void) => {
    setUploadState('validating');
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      setUploadState('error');
      onError(validationError.message);
      return;
    }

    setUploadState('uploading');
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('warRoomId', warRoomId);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        setProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          setUploadState('success');
          setProgress(100);
          onSuccess(response.url || response.fileUrl);
          
          // Reset after 2 seconds
          setTimeout(() => {
            setUploadState('idle');
            setProgress(0);
          }, 2000);
        } catch (e) {
          const errorMsg = 'Invalid server response';
          setError({ message: errorMsg, type: 'server' });
          setUploadState('error');
          onError(errorMsg);
        }
      } else {
        let errorMsg = 'Upload failed';
        try {
          const response = JSON.parse(xhr.responseText);
          errorMsg = response.error || response.message || errorMsg;
        } catch (e) {
          if (xhr.status === 413) errorMsg = 'File too large';
          else if (xhr.status === 415) errorMsg = 'Unsupported file type';
        }
        setError({ message: errorMsg, type: 'server' });
        setUploadState('error');
        onError(errorMsg);
      }
    });

    xhr.addEventListener('error', () => {
      const errorMsg = 'Network error occurred';
      setError({ message: errorMsg, type: 'network' });
      setUploadState('error');
      onError(errorMsg);
    });

    xhr.addEventListener('abort', () => {
      setUploadState('idle');
      setProgress(0);
    });

    xhr.open('POST', '/api/uploads');
    xhr.send(formData);
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
  };

  return { uploadState, progress, error, uploadFile, cancelUpload };
};

export const FileUpload: React.FC<FileUploadProps> = ({ 
  warRoomId, 
  onUploadComplete, 
  onUploadError 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadState, progress, error, uploadFile, cancelUpload } = useFileUpload(warRoomId);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    uploadFile(
      file,
      (url) => onUploadComplete?.(url),
      (error) => onUploadError?.(error)
    );
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getDropZoneClasses = () => {
    const baseClasses = 'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer';
    
    if (uploadState === 'uploading') {
      return `${baseClasses} border-blue-500 bg-blue-50`;
    }
    if (uploadState === 'error') {
      return `${baseClasses} border-red-500 bg-red-50`;
    }
    if (uploadState === 'success') {
      return `${baseClasses} border-green-500 bg-green-50`;
    }
    if (isDragging) {
      return `${baseClasses} border-blue-500 bg-blue-50 scale-[1.02]`;
    }
    return `${baseClasses} border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100`;
  };

  const getStatusIcon = () => {
    switch (uploadState) {
      case 'uploading':
        return (
          <svg className="w-12 h-12 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'success':
        return (
          <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    switch (uploadState) {
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Upload successful!';
      case 'error':
        return error?.message || 'Upload failed';
      default:
        return 'Drag & drop your file here';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={getDropZoneClasses()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={uploadState === 'idle' || uploadState === 'error' ? handleClick : undefined}
        role="button"
        tabIndex={0}
        aria-label="File upload area"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileInputChange}
          aria-label="File input"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {getStatusIcon()}
          
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              {getStatusText()}
            </p>
            {uploadState === 'idle' && (
              <p className="text-sm text-gray-500 mt-2">
                or click to browse
              </p>
            )}
            {(uploadState === 'idle' || uploadState === 'error') && (
              <p className="text-xs text-gray-400 mt-2">
                PDF, PNG, JPG up to 10MB
              </p>
            )}
          </div>

          {uploadState === 'uploading' && (
            <div className="w-full max-w-md space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>{Math.round(progress)}%</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelUpload();
                  }}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};