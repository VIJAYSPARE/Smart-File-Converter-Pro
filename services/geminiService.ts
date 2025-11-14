import { GoogleGenAI, Modality } from "@google/genai";
import { DiagramType } from "../types";

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
    model: 'gemini-2.5-pro',
    contents: { parts: [pdfPart, textPart] },
  });

  return response.text;
};

export const generateDiagram = async (
    text: string, 
    diagramType: DiagramType,
    colorMode: 'color' | 'bw',
    layout: 'square' | 'portrait' | 'landscape'
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const colorInstruction = colorMode === 'color' 
        ? 'The diagram should use a vibrant and modern color palette.' 
        : 'The diagram should be in black and white, using clean lines and shades of gray.';

    const layoutInstruction = `The final image output must have a ${layout} aspect ratio.`;

    let typeInstruction = '';
    switch(diagramType) {
        case DiagramType.Flowchart:
            typeInstruction = 'Generate a clear and visually appealing flowchart or process map.';
            break;
        case DiagramType.MindMap:
            typeInstruction = 'Generate a clear and visually appealing mind map or concept map, with the central idea clearly identified.';
            break;
        case DiagramType.Table:
            typeInstruction = 'Generate a structured table, grid, or comparison chart.';
            break;
        case DiagramType.Infographic:
            typeInstruction = 'Generate a simple data chart or infographic-style visual. Use icons and visual elements to represent data.';
            break;
        case DiagramType.Relationship:
            typeInstruction = 'Generate a cause-and-effect or relationship diagram showing the connections between different elements.';
            break;
    }
    
    const prompt = `Based on the following text, ${typeInstruction} ${colorInstruction} ${layoutInstruction} Focus on representing the key concepts and their relationships. Do not add any extra text or explanation outside of the diagram itself. Text: "${text}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    
    // Find the image part in the response
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data; // This is the base64 encoded string
        }
    }

    throw new Error(`Could not generate a ${diagramType} from the provided text.`);
};