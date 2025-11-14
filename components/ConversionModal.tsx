import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ConversionTask } from '../types';
import { ConversionType, DiagramType } from '../types';
import FileUpload from './FileUpload';
import Spinner from './Spinner';
import { useHistory } from '../hooks/useHistory';
import { imageToText, pdfToWord, generateDiagram } from '../services/geminiService';
import { imagesToPdf, textToPdf, docToText, readTextFile, base64ToBlob, pdfToText } from '../services/fileConverter';
import FilePreview from './FilePreview';

// Fix: Declare jspdf to make it available in this module.
declare const jspdf: any;

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

  // State for Text to Diagram
  const [step, setStep] = useState<'input' | 'generating' | 'previews'>('input');
  const [textInput, setTextInput] = useState('');
  const [styleOptions, setStyleOptions] = useState<{ color: 'color' | 'bw'; layout: 'square' | 'portrait' | 'landscape' }>({ color: 'color', layout: 'square' });
  const [previews, setPreviews] = useState<Partial<Record<DiagramType, { loading: boolean; error: string | null; data: string | null }>>>({});
  const [selectedPreview, setSelectedPreview] = useState<{ type: DiagramType; data: string } | null>(null);
  

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
    // Reset diagram state
    setTextInput('');
    setStep('input');
    setStyleOptions({ color: 'color', layout: 'square' });
    setPreviews({});
    setSelectedPreview(null);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    setError(null);
    setFileError(null);
    setResult(null);
    setFiles(selectedFiles);

    if (type === ConversionType.TEXT_TO_DIAGRAM && selectedFiles.length > 0) {
        const file = selectedFiles[0];
        try {
            let content = '';
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                content = await docToText(file);
            } else if (fileName.endsWith('.pdf')) {
                content = await pdfToText(file);
            } else {
                content = await readTextFile(file);
            }
            setTextInput(content);
        } catch (e) {
            handleFileError('Could not read the selected file.');
        }
    }
  };
  
  const handleRemoveFile = (indexToRemove: number) => {
    setFiles(prevFiles => {
        const newFiles = prevFiles.filter((_, index) => index !== indexToRemove);
        if (newFiles.length === 0 && type === ConversionType.TEXT_TO_DIAGRAM) {
             // If all files are removed for diagram generation, clear the text input
             // that might have been populated from a file.
            setTextInput('');
        }
        return newFiles;
    });
  };

  const handleFileError = (errorMessage: string | null) => {
    setFileError(errorMessage);
    if (errorMessage) {
      setFiles([]);
    }
  };
  
  const genericDownload = (content: string | Blob, filename: string) => {
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
          genericDownload(pdfBlobImg, 'converted.pdf');
          setResult('Your PDF has been downloaded.');
          task = { fileName: files.map(f => f.name).join(', '), type, output: pdfBlobImg, outputFileName: 'converted.pdf' };
          break;
        case ConversionType.TEXT_TO_PDF:
          const file = files[0];
          let textContent = '';
          const fileName = file.name.toLowerCase();

          if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
              textContent = await docToText(file);
          } else if (fileName.endsWith('.txt')) {
              textContent = await readTextFile(file);
          } else {
              throw new Error(`Unsupported file type for this conversion: ${file.name}`);
          }

          const pdfBlobTxt = await textToPdf(textContent, `${file.name.split('.')[0]}.pdf`);
          genericDownload(pdfBlobTxt, `${file.name.split('.')[0]}.pdf`);
          setResult('Your PDF has been downloaded.');
          task = { fileName: file.name, type, output: pdfBlobTxt, outputFileName: `${file.name.split('.')[0]}.pdf` };
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

  const handleGeneratePreviews = async () => {
    if (!textInput.trim()) {
        setError('Please enter text or upload a file.');
        return;
    }
    setStep('generating');
    setError(null);

    const diagramTypesToGenerate = Object.values(DiagramType);
    const initialPreviews = diagramTypesToGenerate.reduce((acc, type) => {
        acc[type] = { loading: true, error: null, data: null };
        return acc;
    }, {} as typeof previews);
    setPreviews(initialPreviews);

    // Changed from parallel to sequential execution to avoid potential race conditions.
    for (const diagramType of diagramTypesToGenerate) {
        try {
            const imageData = await generateDiagram(textInput, diagramType, styleOptions.color, styleOptions.layout);
            setPreviews(prev => ({ ...prev, [diagramType]: { loading: false, error: null, data: imageData } }));
        } catch (e: any) {
            console.error(`Failed to generate ${diagramType}`, e);
            setPreviews(prev => ({ ...prev, [diagramType]: { loading: false, error: e.message || 'Failed to generate', data: null } }));
        }
    }
    
    setStep('previews');
  };

    const handleDownloadPng = (base64ImageData: string, diagramType: DiagramType) => {
        const outputFileName = `${diagramType.toLowerCase().replace(/ /g, '_')}.png`;
        const imageBlob = base64ToBlob(base64ImageData, 'image/png');
        genericDownload(imageBlob, outputFileName);

        addHistoryItem({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            fileName: files[0]?.name || 'Text Input',
            type: ConversionType.TEXT_TO_DIAGRAM,
            output: imageBlob,
            outputFileName,
        });
    };

    const handleDownloadPdf = async (base64ImageData: string, diagramType: DiagramType) => {
        const { jsPDF } = jspdf;
        const orientation = styleOptions.layout === 'landscape' ? 'l' : 'p';
        const doc = new jsPDF({ orientation, unit: 'px', format: 'a4' });
        
        const img = new Image();
        img.src = `data:image/png;base64,${base64ImageData}`;
        await new Promise(resolve => { img.onload = resolve });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageRatio = pageWidth / pageHeight;
        const imageRatio = img.width / img.height;
        
        let newWidth, newHeight, x, y;

        if (imageRatio > pageRatio) {
            newWidth = pageWidth;
            newHeight = pageWidth / imageRatio;
        } else {
            newHeight = pageHeight;
            newWidth = pageHeight * imageRatio;
        }

        x = (pageWidth - newWidth) / 2;
        y = (pageHeight - newHeight) / 2;
        
        doc.addImage(img, 'PNG', x, y, newWidth, newHeight);
        
        const outputFileName = `${diagramType.toLowerCase().replace(/ /g, '_')}.pdf`;
        const pdfBlob = doc.output('blob');
        genericDownload(pdfBlob, outputFileName);

        addHistoryItem({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            fileName: files[0]?.name || 'Text Input',
            type: ConversionType.TEXT_TO_DIAGRAM,
            output: pdfBlob,
            outputFileName,
        });
    };

  
  const getAcceptableFiles = () => {
    switch(type) {
        case ConversionType.IMAGE_TO_TEXT: return 'image/jpeg, image/png, image/webp';
        case ConversionType.IMAGE_TO_PDF: return 'image/jpeg, image/png, image/webp';
        case ConversionType.TEXT_TO_PDF: return '.txt,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case ConversionType.PDF_TO_WORD: return '.pdf';
        case ConversionType.TEXT_TO_DIAGRAM: return '.txt,.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf';
        default: return '*/*';
    }
  };

  const isMultipleAllowed = type === ConversionType.IMAGE_TO_PDF;

  if (!isOpen) return null;

  const renderTextToDiagram = () => {
    if (selectedPreview) {
        return (
            <div className="space-y-4">
                <button onClick={() => setSelectedPreview(null)} className="flex items-center text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Back to Previews
                </button>
                <h3 className="text-xl font-bold text-center">{selectedPreview.type}</h3>
                <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-900/50 rounded-md">
                    <img src={`data:image/png;base64,${selectedPreview.data}`} alt={`Generated ${selectedPreview.type}`} className="max-w-full max-h-[50vh] rounded-md shadow-lg" />
                </div>
                <div className="flex justify-center space-x-4 pt-4">
                    <button onClick={() => handleDownloadPng(selectedPreview.data, selectedPreview.type)} className="px-5 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors font-semibold">Download PNG</button>
                    <button onClick={() => handleDownloadPdf(selectedPreview.data, selectedPreview.type)} className="px-5 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-semibold">Download PDF</button>
                </div>
            </div>
        )
    }

    if (step === 'input') {
        return (
            <div className="space-y-4">
                 <div>
                    <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Text to visualize
                    </label>
                    <textarea id="text-input" rows={6} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Describe the diagram, flowchart, or concept you want to create..."/>
                </div>
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">&mdash; OR &mdash;</div>
                <FileUpload onFilesSelected={handleFilesSelected} accept={getAcceptableFiles()} multiple={false} title={'Upload a file (.txt, .docx, .pdf)'} error={fileError} onError={handleFileError} />
                {files.length > 0 && (
                  <FilePreview files={files} onRemoveFile={handleRemoveFile} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Diagram Style</label>
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center cursor-pointer"><input type="radio" name="colorOption" value="color" checked={styleOptions.color === 'color'} onChange={() => setStyleOptions(s => ({...s, color: 'color'}))} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/><span className="ml-2 text-sm">Color</span></label>
                            <label className="flex items-center cursor-pointer"><input type="radio" name="colorOption" value="bw" checked={styleOptions.color === 'bw'} onChange={() => setStyleOptions(s => ({...s, color: 'bw'}))} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/><span className="ml-2 text-sm">B & W</span></label>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Layout</label>
                        <select value={styleOptions.layout} onChange={(e) => setStyleOptions(s => ({...s, layout: e.target.value as any}))} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="square">Square</option>
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                </div>
            </div>
        )
    }

    if (step === 'generating' || step === 'previews') {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Generating Diagram Previews...</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">The AI is working its magic. This may take a moment.</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Fix: Cast state to a known type to resolve 'unknown' type errors and use optional chaining for safety. */}
                    {Object.entries(previews).map(([type, _state]) => {
                        const state = _state as { loading: boolean; error: string | null; data: string | null } | undefined;
                        return (
                            <div key={type} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center text-center p-2">
                                 <h4 className="text-sm font-semibold mb-2">{type}</h4>
                                {state?.loading && <Spinner />}
                                {state?.error && <div className="text-xs text-red-500">{state.error}</div>}
                                {state?.data && (
                                    <button onClick={() => setSelectedPreview({ type: type as DiagramType, data: state.data! })} className="w-full h-full">
                                        <img src={`data:image/png;base64,${state.data}`} alt={`${type} preview`} className="max-w-full max-h-full object-contain rounded-md" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    }
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col">
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
                <div className="bg-primary-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full transition-all duration-300" style={{ width: `${progress}%` }}>{progress}%</div>
              </div>
            </div>
          ) : result ? (
             <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Conversion Successful!</h3>
              <textarea readOnly value={result} className="w-full h-64 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <div className="flex space-x-2">
                <button onClick={() => genericDownload(result, `${files[0]?.name.split('.')[0] || 'result'}.txt`)} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">Download as .txt</button>
                <button onClick={resetState} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Convert Another</button>
              </div>
            </div>
          ) : (
            type === ConversionType.TEXT_TO_DIAGRAM ? renderTextToDiagram() : (
            <div className="space-y-4">
              <FileUpload onFilesSelected={handleFilesSelected} accept={getAcceptableFiles()} multiple={isMultipleAllowed} title={isMultipleAllowed ? 'Select images' : 'Select a file'} error={fileError} onError={handleFileError} />
              {files.length > 0 && (
                <FilePreview files={files} onRemoveFile={handleRemoveFile} />
              )}
            </div>
            )
          )}
          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
        </div>

        <div className="p-4 border-t dark:border-gray-700 mt-auto">
          {type === ConversionType.TEXT_TO_DIAGRAM ? (
             step === 'input' && (
                <button onClick={handleGeneratePreviews} disabled={!textInput.trim()} className="w-full px-4 py-3 bg-primary-500 text-white font-bold rounded-md hover:bg-primary-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed">Generate Previews</button>
             )
          ) : (
            !result && !isLoading && (
              <button onClick={handleConversion} disabled={files.length === 0} className="w-full px-4 py-3 bg-primary-500 text-white font-bold rounded-md hover:bg-primary-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed">Convert Now</button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversionModal;