export enum ConversionType {
  IMAGE_TO_TEXT = 'Image to Text (OCR)',
  IMAGE_TO_PDF = 'Images to PDF',
  TEXT_TO_PDF = 'Text/Word to PDF',
  PDF_TO_WORD = 'PDF to Word',
  TEXT_TO_DIAGRAM = 'Text to Diagram',
}

export enum DiagramType {
  Flowchart = 'Flowchart',
  MindMap = 'Mind Map',
  Table = 'Table / Grid',
  Infographic = 'Infographic',
  Relationship = 'Relationship Diagram',
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