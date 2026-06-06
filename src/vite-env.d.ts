/// <reference types="vite/client" />

// Web Speech API declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    currentRecognition?: SpeechRecognition;
  }
}

export {};
