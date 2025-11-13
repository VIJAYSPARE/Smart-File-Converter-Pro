import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ConversionTask } from '../types';
import { ConversionType } from '../types';
import FileUpload from './FileUpload';
import Spinner from './Spinner';
import { useHistory } from '../hooks/useHistory';
import { imageToText, pdfToWord } from '../services/geminiService';
import { imagesToPdf, textToPdf } from '../services/fileConverter';

interface ConversionModalProps {
  type: ConversionType;
  isOpen: boolean;
  onClose: () => void;
}

const ConversionModal: React.FC<ConversionModalProps> = ({ type, isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { addHistoryItem } = useHistory();
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      progressIntervalRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            return 95;
          }
          return prev + 5;
        });
      }, 200);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isLoading]);

  const resetState = useCallback(() => {
    setFiles([]);
    setIsLoading(false);
    setResult(null);
    setError(null);
    setFileError(null);
    setProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setError(null);
    setFileError(null);
    setResult(null);
    setFiles(selectedFiles);
  };

  const handleFileError = (errorMessage: string | null) => {
    setFileError(errorMessage);
    if (errorMessage) {
      setFiles([]);
    }
  };
  
  const handleDownload = (content: string | Blob, filename: string) => {
    const url = content instanceof Blob ? URL.createObjectURL(content) : `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (content instanceof Blob) {
      URL.revokeObjectURL(url);
    }
  };

  const handleConversion = async () => {
    if (files.length === 0) {
      setError('Please select a file to convert.');
      return;
    }
    setIsLoading(true);
    setProgress(0);
    setError(null);
    setFileError(null);
    setResult(null);

    try {
      let task: Omit<ConversionTask, 'id' | 'date'>;

      switch (type) {
        case ConversionType.IMAGE_TO_TEXT:
          const text = await imageToText(files[0]);
          setResult(text);
          task = { fileName: files[0].name, type, output: text, outputFileName: `${files[0].name.split('.')[0]}.txt` };
          break;
        case ConversionType.IMAGE_TO_PDF:
          const pdfBlobImg = await imagesToPdf(files, 'converted.pdf');
          handleDownload(pdfBlobImg, 'converted.pdf');
          setResult('Your PDF has been downloaded.');
          task = { fileName: files.map(f => f.name).join(', '), type, output: pdfBlobImg, outputFileName: 'converted.pdf' };
          break;
        case ConversionType.TEXT_TO_PDF:
          const pdfBlobTxt = await textToPdf(files[0], `${files[0].name.split('.')[0]}.pdf`);
          handleDownload(pdfBlobTxt, `${files[0].name.split('.')[0]}.pdf`);
          setResult('Your PDF has been downloaded.');
          task = { fileName: files[0].name, type, output: pdfBlobTxt, outputFileName: `${files[0].name.split('.')[0]}.pdf` };
          break;
        case ConversionType.PDF_TO_WORD:
          const extractedText = await pdfToWord(files[0]);
          setResult(extractedText);
          task = { fileName: files[0].name, type, output: extractedText, outputFileName: `${files[0].name.split('.')[0]}.txt` };
          break;
        default:
          throw new Error('Unknown conversion type');
      }
      
      addHistoryItem({
        ...task,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      });
      setProgress(100);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred during conversion.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getAcceptableFiles = () => {
    switch(type) {
        case ConversionType.IMAGE_TO_TEXT: return 'image/jpeg, image/png, image/webp';
        case ConversionType.IMAGE_TO_PDF: return 'image/jpeg, image/png, image/webp';
        case ConversionType.TEXT_TO_PDF: return '.txt, .doc, .docx';
        case ConversionType.PDF_TO_WORD: return '.pdf';
        default: return '*/*';
    }
  };

  const isMultipleAllowed = type === ConversionType.IMAGE_TO_PDF;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">{type}</h2>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Spinner size="lg" />
              <p className="mt-4 text-lg">Processing your files...</p>
              <div className="w-full bg-gray-200 rounded-full dark:bg-gray-700 mt-4">
                <div
                    className="bg-primary-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                >
                    {progress}%
                </div>
              </div>
            </div>
          ) : result ? (
             <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Conversion Successful!</h3>
              <textarea
                readOnly
                value={result}
                className="w-full h-64 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex space-x-2">
                 <button 
                  onClick={() => handleDownload(result, `${files[0]?.name.split('.')[0] || 'result'}.txt`)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                >
                  Download as .txt
                </button>
                <button 
                  onClick={resetState}
                  className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Convert Another
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FileUpload 
                onFilesSelected={handleFilesSelected}
                accept={getAcceptableFiles()}
                multiple={isMultipleAllowed}
                title={isMultipleAllowed ? 'Select images' : 'Select a file'}
                error={fileError}
                onError={handleFileError}
              />
               {files.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Selected files:</h4>
                  <ul className="list-disc list-inside bg-gray-100 dark:bg-gray-700 p-3 rounded-md max-h-32 overflow-y-auto">
                    {files.map((file, index) => <li key={index} className="text-sm truncate">{file.name}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
        </div>

        <div className="p-4 border-t dark:border-gray-700 mt-auto">
          {!result && !isLoading && (
            <button
              onClick={handleConversion}
              disabled={files.length === 0}
              className="w-full px-4 py-3 bg-primary-500 text-white font-bold rounded-md hover:bg-primary-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              Convert Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


export default ConversionModal;