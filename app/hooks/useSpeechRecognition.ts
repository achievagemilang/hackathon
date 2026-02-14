'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

interface SpeechResult {
  transcript: string;
  duration: number;
}

/** Structured live transcript with final/interim separation */
export interface LiveTranscript {
  /** Text the browser has finalized (high confidence, won't change) */
  final: string;
  /** Text the browser is still processing (may change with next onresult) */
  interim: string;
  /** Total word count (final + interim) */
  wordCount: number;
}

interface UseSpeechRecognitionReturn {
  /** Whether the browser is currently listening */
  isListening: boolean;
  /** Structured live transcript with final/interim separation */
  liveTranscript: LiveTranscript;
  /** Start listening. Resolves with transcript and duration when speech ends. */
  startListening: () => Promise<SpeechResult>;
  /** Manually stop listening. */
  stopListening: () => void;
  /** Whether the browser supports SpeechRecognition */
  isSupported: boolean;
  /** Duration of the speech in seconds (from start to end) */
  speechDuration: number;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscript>({
    final: '',
    interim: '',
    wordCount: 0,
  });
  const [speechDuration, setSpeechDuration] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number>(0);

  // Memoize SpeechRecognition to avoid re-evaluation on every render
  const SpeechRecognition = useMemo(
    () =>
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null,
    []
  );

  const isSupported = !!SpeechRecognition;

  const startListening = useCallback((): Promise<SpeechResult> => {
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
        setLiveTranscript({ final: '', interim: '', wordCount: 0 });
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

        // Calculate word count from combined text
        const combined = (finalTranscript + interim).trim();
        const wordCount = combined ? combined.split(/\s+/).length : 0;

        setLiveTranscript({ final: finalTranscript, interim, wordCount });
      };

      recognition.onend = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        setSpeechDuration(duration);
        setIsListening(false);
        recognitionRef.current = null;
        resolve({ transcript: finalTranscript, duration });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        recognitionRef.current = null;
        const duration = (Date.now() - startTimeRef.current) / 1000;
        // "no-speech" is not a real error — user just didn't say anything
        if (event.error === 'no-speech') {
          resolve({ transcript: '', duration });
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
    liveTranscript,
    startListening,
    stopListening,
    isSupported,
    speechDuration,
  };
}
