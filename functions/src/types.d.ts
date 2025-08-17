declare module 'mammoth' {
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string }>;
}

declare module 'sharp' {
  export default function sharp(input?: Buffer | string): Sharp;
  interface Sharp {
    resize(width?: number, height?: number): Sharp;
    toBuffer(): Promise<Buffer>;
  }
}

declare module 'tesseract.js' {
  export function createWorker(): Promise<Worker>;
  interface Worker {
    loadLanguage(lang: string): Promise<void>;
    initialize(lang: string): Promise<void>;
    recognize(image: Buffer): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
  }
}

declare module 'pdf-parse' {
  export default function pdfParse(buffer: Buffer): Promise<{ text: string }>;
}

// Firebase Functions context type
declare namespace FirebaseFirestore {
  interface CallableContext {
    auth?: {
      uid: string;
      token: any;
    };
  }
}
