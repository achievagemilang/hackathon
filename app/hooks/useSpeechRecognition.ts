'use client';

import { useCallback, useRef, useState } from 'react';

interface UseSpeechRecognitionReturn {
  /** Whether the browser is currently listening */
  isListening: boolean;
  /** The live transcript of the current utterance */
  transcript: string;
  /** Start listening. Resolves with the final transcript when speech ends. */
  startListening: () => Promise<string>;
  /** Manually stop listening. */
  stopListening: () => void;
  /** Whether the browser supports SpeechRecognition */
  isSupported: boolean;
  /** Duration of the speech in seconds (from start to end) */
  speechDuration: number;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechDuration, setSpeechDuration] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number>(0);

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognition) {
        reject(new Error('SpeechRecognition not supported in this browser.'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        startTimeRef.current = Date.now();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        finalTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        setTranscript(finalTranscript + interim);
      };

      recognition.onend = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        setSpeechDuration(duration);
        setIsListening(false);
        recognitionRef.current = null;
        resolve(finalTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        recognitionRef.current = null;
        // "no-speech" is not a real error — user just didn't say anything
        if (event.error === 'no-speech') {
          resolve('');
        } else {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      recognition.start();
    });
  }, [SpeechRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    speechDuration,
  };
}
