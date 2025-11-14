import React, { useEffect, useRef, useState } from 'react';

declare const pdfjsLib: any;

const ImagePreview: React.FC<{ file: File }> = ({ file }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    if (!objectUrl) return <div className="w-full h-full bg-gray-200 dark:bg-gray-600 animate-pulse" />;

    return <img src={objectUrl} alt={file.name} className="w-full h-full object-cover" />;
};


const PdfPreview: React.FC<{ file: File }> = ({ file }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!file || !canvasRef.current || !containerRef.current) return;

        let url: string | null = null;
        const renderPdf = async () => {
            try {
                url = URL.createObjectURL(file);
                const pdf = await pdfjsLib.getDocument(url).promise;
                const page = await pdf.getPage(1); // Render first page
                
                const canvas = canvasRef.current;
                const container = containerRef.current;
                if (!canvas || !container) {
                    if(url) URL.revokeObjectURL(url);
                    return;
                }
                
                const context = canvas.getContext('2d');
                const desiredWidth = container.clientWidth;
                const viewport = page.getViewport({ scale: 1 });
                const scale = desiredWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                
                if(context) {
                    const renderContext = {
                        canvasContext: context,
                        viewport: scaledViewport,
                    };
                    await page.render(renderContext).promise;
                }
            } catch (error) {
                console.error('Error rendering PDF preview:', error);
                const canvas = canvasRef.current;
                if(canvas) {
                    const context = canvas.getContext('2d');
                    if(context) {
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        context.font = "12px Arial";
                        context.fillStyle = "red";
                        context.textAlign = "center";
                        context.fillText("Preview Error", canvas.width / 2, canvas.height / 2);
                    }
                }
            } finally {
                 if (url) {
                    URL.revokeObjectURL(url);
                }
            }
        };

        renderPdf();
    }, [file]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
        </div>
    );
};


interface FilePreviewProps {
  files: File[];
  onRemoveFile: (index: number) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, onRemoveFile }) => {
    if (files.length === 0) return null;

    return (
        <div className="mt-4">
            <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">File Preview:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700">
                {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative group aspect-square bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                        {file.type.startsWith('image/') ? (
                            <ImagePreview file={file} />
                        ) : file.type === 'application/pdf' ? (
                            <PdfPreview file={file} />
                        ) : (
                            <div className="p-2 flex flex-col items-center justify-center h-full text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 break-all">{file.name}</p>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-colors duration-300 flex flex-col items-center justify-center p-1">
                            <button
                                onClick={() => onRemoveFile(index)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Remove file"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <p className="text-white text-xs font-medium text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 break-all px-1">{file.name}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FilePreview;