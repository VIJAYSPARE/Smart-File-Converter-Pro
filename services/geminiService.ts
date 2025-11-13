
import { GoogleGenAI } from "@google/genai";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const imageToText = async (imageFile: File): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePart = await fileToGenerativePart(imageFile);
  const textPart = { text: "Extract all text from this image. Provide only the text content, without any additional formatting or commentary." };
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });

  return response.text;
};

export const pdfToWord = async (pdfFile: File): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const pdfPart = await fileToGenerativePart(pdfFile);
  const textPart = { text: "You are an expert document converter. Convert the following PDF document into a well-formatted text file. Preserve the original structure, including headings, paragraphs, lists, and tables. Replicate the layout and formatting as closely as possible in plain text. Do not add any commentary or explanations, only provide the converted document content." };
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [pdfPart, textPart] },
  });

  return response.text;
};
