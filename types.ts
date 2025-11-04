
export enum ConversionType {
  IMAGE_TO_TEXT = 'Image to Text (OCR)',
  IMAGE_TO_PDF = 'Images to PDF',
  TEXT_TO_PDF = 'Text/Word to PDF',
  PDF_TO_WORD = 'PDF to Word',
}

export interface ConversionTask {
  id: string;
  date: string;
  fileName: string;
  type: ConversionType;
  output: string | Blob; // Can be text content or a blob for file downloads
  outputFileName: string;
}

export type Page = 'dashboard' | 'history';
