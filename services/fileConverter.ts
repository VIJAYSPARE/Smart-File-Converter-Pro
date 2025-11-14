// This assumes jspdf and pdfjsLib are available globally from CDN scripts in index.html
declare const jspdf: any;
declare const pdfjsLib: any;
declare const mammoth: any;

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// Utility to read file as a Data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const docToText = async (file: File): Promise<string> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const pdfToText = async (file: File): Promise<string> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textContent = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    textContent += text.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return textContent;
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

export const textToPdf = async (textContent: string, outputFileName: string): Promise<Blob> => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const textLines = doc.splitTextToSize(textContent, pageWidth - margin * 2);

    doc.text(textLines, margin, margin);
    return doc.output('blob');
};