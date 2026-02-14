'use client';

import { calculateWPM, playAudio, speak, stopAudio } from '@/app/lib/speech';
import type { APIResponse, AnalysisMetrics, InterviewState } from '@/types';
import { EMPTY_METRICS } from '@/types';
import { useCallback, useReducer, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';

// ─── State Machine ───────────────────────────────────────────

type Action =
  | { type: 'START_LISTENING' }
  | { type: 'UPDATE_TRANSCRIPT'; transcript: string }
  | { type: 'START_PROCESSING'; transcript: string }
  | { type: 'START_SPEAKING' }
  | { type: 'RECEIVE_RESPONSE'; reply: string; analysis: AnalysisMetrics; isOpening?: boolean }
  | { type: 'FINISH_SPEAKING' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: InterviewState = {
  phase: 'idle',
  transcript: '',
  history: [],
  stats: EMPTY_METRICS,
  allStats: [],
  error: null,
};

function reducer(state: InterviewState, action: Action): InterviewState {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, phase: 'listening', transcript: '', error: null };

    case 'UPDATE_TRANSCRIPT':
      return { ...state, transcript: action.transcript };

    case 'START_PROCESSING':
      return {
        ...state,
        phase: 'processing',
        history: [
          ...state.history,
          { role: 'user', content: action.transcript },
        ],
      };

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        stats: action.analysis,
        // Don't pollute allStats with opening question (isOpening flag)
        allStats: action.isOpening ? state.allStats : [...state.allStats, action.analysis],
        history: [
          ...state.history,
          { role: 'assistant', content: action.reply },
        ],
      };

    case 'START_SPEAKING':
      return { ...state, phase: 'speaking' };

    case 'FINISH_SPEAKING':
      return { ...state, phase: 'idle' };

    case 'SET_ERROR':
      return { ...state, phase: 'idle', error: action.error };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ─── The Opening Question ────────────────────────────────────

const OPENING_QUESTION =
  "Welcome to your mock interview. Let's start with a classic: Tell me about a time you faced a significant challenge at work. What happened, and how did you handle it?";

// ─── Hook ────────────────────────────────────────────────────

export function useInterview() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    speechDuration,
  } = useSpeechRecognition();
  const isRunningRef = useRef(false);
  const historyRef = useRef(state.history);

  // Keep historyRef in sync with state.history to avoid stale closures
  historyRef.current = state.history;

  /**
   * Run one full loop iteration:
   * 1. Listen to user
   * 2. Play filler audio
   * 3. Send to OpenAI
   * 4. Update metrics
   * 5. Speak response
   *
   * RACE CONDITION PREVENTION (per SKILLS.md):
   * - stopListening() is called automatically by browser when speech ends
   * - We await startListening() completion before proceeding to step 2
   * - We await speak() completion before returning to step 1
   * - We check isRunningRef after each await to bail out if endInterview() was called
   */
  const runLoop = useCallback(async () => {
    // ── Step 1: Listen (RACE CONDITION: Wait for listening to complete) ──
    dispatch({ type: 'START_LISTENING' });

    let finalTranscript: string;
    let duration: number;
    try {
      const result = await startListening(); // Blocks until speech ends
      finalTranscript = result.transcript;
      duration = result.duration;
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Microphone error',
      });
      return;
    }

    // Bail out if interview was ended during listening
    if (!isRunningRef.current) return;

    // If the user said nothing, prompt them
    if (!finalTranscript.trim()) {
      dispatch({ type: 'UPDATE_TRANSCRIPT', transcript: '' });
      dispatch({ type: 'START_PROCESSING', transcript: '' });
      finalTranscript = "(The user was silent and didn't respond.)";
      duration = 0;
    } else {
      dispatch({ type: 'UPDATE_TRANSCRIPT', transcript: finalTranscript });
      dispatch({ type: 'START_PROCESSING', transcript: finalTranscript });
    }

    // ── Step 2: Filler audio (non-blocking, for latency masking) ──
    playAudio('/audio/thinking.mp3');

    // ── Step 3: Call API (use historyRef to avoid stale closure) ──
    try {
      // Truncate history to last 10 messages to avoid token limit issues
      const recentHistory = historyRef.current.slice(-10);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...recentHistory,
            { role: 'user', content: finalTranscript },
          ],
        }),
      });

      // Bail out if interview was ended during API call
      if (!isRunningRef.current) {
        stopAudio();
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const data: APIResponse = await res.json();

      // ── Step 4: Update metrics (client-side WPM using captured duration) ──
      const wpm = calculateWPM(finalTranscript, duration);
      const analysis: AnalysisMetrics = {
        ...data.analysis,
        pacing_wpm: wpm,
      };

      dispatch({ type: 'RECEIVE_RESPONSE', reply: data.reply, analysis });

      // ── Step 5: Speak response (RACE CONDITION: Stop filler, then speak, then wait) ──
      stopAudio(); // Stop filler immediately
      dispatch({ type: 'START_SPEAKING' });

      await speak(data.reply); // Wait for speaking to finish before returning to step 1

      // Bail out if interview was ended during speaking
      if (!isRunningRef.current) return;

      dispatch({ type: 'FINISH_SPEAKING' });
    } catch (err) {
      stopAudio();
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  }, [startListening]);

  /**
   * Start the interview session.
   * Speaks the opening question, then enters the loop.
   * RACE CONDITION: Waits for opening question to finish before starting loop.
   */
  const startInterview = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    dispatch({ type: 'RESET' });

    // Speak the opening question (mark as opening to avoid polluting allStats)
    dispatch({
      type: 'RECEIVE_RESPONSE',
      reply: OPENING_QUESTION,
      analysis: EMPTY_METRICS,
      isOpening: true,
    });
    dispatch({ type: 'START_SPEAKING' });

    try {
      await speak(OPENING_QUESTION); // Wait for opening question to finish
    } catch {
      // TTS failed — continue anyway, user can read the text
    }

    dispatch({ type: 'FINISH_SPEAKING' });

    // Enter the loop
    while (isRunningRef.current) {
      await runLoop();
    }
  }, [runLoop]);

  /**
   * End the interview. Stops everything.
   * RACE CONDITION: Stops all audio/speech before exiting.
   */
  const endInterview = useCallback(() => {
    isRunningRef.current = false;
    stopListening(); // Stop STT
    stopAudio(); // Stop filler
    window.speechSynthesis?.cancel(); // Stop TTS
    dispatch({ type: 'FINISH_SPEAKING' });
  }, [stopListening]);

  return {
    state,
    /** Live transcript from the STT engine (updates in real-time) */
    liveTranscript: transcript,
    isListening,
    isSupported,
    startInterview,
    endInterview,
    /** Manually stop the user's current speech and move to processing */
    stopListening,
  };
}
