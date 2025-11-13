
// This assumes jspdf and pdfjsLib are available globally from CDN scripts in index.html
declare const jspdf: any;
declare const pdfjsLib: any;

// Utility to read file as a Data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Utility to read file as text
const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

export const imagesToPdf = async (files: File[], outputFileName: string): Promise<Blob> => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dataUrl = await readFileAsDataURL(file);
    const img = new Image();
    
    await new Promise<void>(resolve => {
        img.onload = () => {
            if (i > 0) doc.addPage();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const imgWidth = img.width;
            const imgHeight = img.height;
            const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
            const newWidth = imgWidth * ratio;
            const newHeight = imgHeight * ratio;
            const x = (pageWidth - newWidth) / 2;
            const y = (pageHeight - newHeight) / 2;
            doc.addImage(dataUrl, 'JPEG', x, y, newWidth, newHeight);
            resolve();
        };
        img.src = dataUrl;
    });
  }
  
  return doc.output('blob');
};

export const textToPdf = async (file: File, outputFileName: string): Promise<Blob> => {
    const { jsPDF } = jspdf;
    const textContent = await readFileAsText(file);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const textLines = doc.splitTextToSize(textContent, pageWidth - margin * 2);

    doc.text(textLines, margin, margin);
    return doc.output('blob');
};
