# Reflect AI — Specs-Driven Development

> **Purpose:** This document is the single source of truth for building Reflect AI.
> Each task is self-contained with exact file paths, code, and acceptance criteria.
> Execute tasks **in order**. Do not skip ahead.

---

## Project Context

| Key             | Value                                                                            |
| --------------- | -------------------------------------------------------------------------------- |
| App Name        | Reflect AI                                                                       |
| Description     | Voice-first, hands-free interview coach that visualizes soft skills in real-time |
| Runtime         | Next.js 16 (App Router), React 19, TypeScript                                    |
| Styling         | Tailwind CSS v4 (`@import "tailwindcss"`)                                        |
| AI              | OpenAI `gpt-4o` with JSON Mode                                                   |
| Speech          | Web Speech API (Chrome-only, acknowledged)                                       |
| Charts          | Recharts                                                                         |
| Workspace Root  | `/Users/achieva17_/development/hackathon`                                        |
| Package Manager | npm                                                                              |

### Design Language

- **Theme:** Dark, minimal, "mirror" aesthetic
- **Background:** Near-black (`#0a0a0a`)
- **Accent:** Cool blue (`#3b82f6`) for active states, emerald (`#10b981`) for positive metrics
- **Typography:** Geist Sans (already configured in `layout.tsx`)
- **Animations:** Subtle, smooth transitions. No jarring movements.

---

## Target File Structure (End State)

```
hackathon/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts            # Task 4: OpenAI API handler
│   ├── components/
│   │   ├── AudioVisualizer.tsx      # Task 7: Canvas waveform
│   │   ├── Dashboard.tsx            # Task 8: Recharts metrics
│   │   ├── InterviewControl.tsx     # Task 6: Main UI controller
│   │   └── Transcript.tsx           # Task 9: Chat history
│   ├── hooks/
│   │   ├── useInterview.ts          # Task 5: State machine
│   │   └── useSpeechRecognition.ts  # Task 3a: STT hook
│   ├── lib/
│   │   └── speech.ts               # Task 3b: TTS utility
│   ├── globals.css
│   ├── layout.tsx                   # Task 2: Updated metadata
│   ├── page.tsx                     # Task 6: Main page
│   └── favicon.ico
├── public/
│   └── audio/
│       └── thinking.mp3            # Task 7: Filler audio (generated)
├── types/
│   └── index.ts                    # Task 1: Data contracts
├── .env.local                      # Task 1: API key placeholder
├── package.json
├── tsconfig.json
└── SPECS.md                        # This file
```

---

## TASK 0: Install Dependencies

### Action

Run this command in the workspace root:

```bash
npm install openai recharts
```

### Acceptance Criteria

- [ ] `openai` appears in `dependencies` in `package.json`
- [ ] `recharts` appears in `dependencies` in `package.json`
- [ ] `npm run build` still succeeds (no type conflicts)

---

## TASK 1: Data Contracts & Environment

### 1a. Create `types/index.ts`

**File:** `types/index.ts`

```typescript
// ============================================================
// Reflect AI — Core Type Definitions
// This is the "contract" between frontend, backend, and OpenAI.
// Do NOT modify these interfaces without updating all consumers.
// ============================================================

/** The complete state of an interview session. */
export interface InterviewState {
  /** Current phase of the interview loop */
  phase: 'idle' | 'listening' | 'processing' | 'speaking';
  /** The live transcript of the current user utterance */
  transcript: string;
  /** Full conversation history (sent to OpenAI) */
  history: Message[];
  /** Latest analysis metrics from OpenAI */
  stats: AnalysisMetrics;
  /** Accumulated metrics from all rounds (for summary) */
  allStats: AnalysisMetrics[];
  /** Error message, if any */
  error: string | null;
}

/** A single message in the conversation. */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * The JSON structure returned by OpenAI.
 * OpenAI is instructed to return ONLY this shape via JSON Mode.
 */
export interface APIResponse {
  /** The verbal response — next question or feedback (max 2 sentences) */
  reply: string;
  /** Soft-skill analysis of the user's answer */
  analysis: AnalysisMetrics;
}

/** Metrics for a single user response. */
export interface AnalysisMetrics {
  /** 0–100. How confident the user sounds. */
  confidence_score: number;
  /** Words per minute. Calculated CLIENT-SIDE, not by OpenAI. */
  pacing_wpm: number;
  /** 0–100. Clarity and structure of the answer. */
  clarity_score: number;
  /** Detected tone category. */
  tone: 'professional' | 'uncertain' | 'casual' | 'aggressive';
  /** One-line actionable feedback. */
  feedback_text: string;
}

/** Default/empty metrics for initialization. */
export const EMPTY_METRICS: AnalysisMetrics = {
  confidence_score: 0,
  pacing_wpm: 0,
  clarity_score: 0,
  tone: 'professional',
  feedback_text: '',
};
```

### 1b. Create `.env.local`

**File:** `.env.local`

```
OPENAI_API_KEY=sk-your-key-here
```

> **Note to executor:** Replace `sk-your-key-here` with an actual OpenAI API key.
> This file is gitignored by default in Next.js.

### 1c. Verify `.gitignore` includes `.env*.local`

Check that `.gitignore` contains a line for `.env*.local`. If not, add it.

### Acceptance Criteria

- [ ] `types/index.ts` exists and exports all 5 interfaces + `EMPTY_METRICS`
- [ ] `.env.local` exists with `OPENAI_API_KEY`
- [ ] Importing `import { InterviewState } from '@/types'` works without errors

---

## TASK 2: Layout & Global Styles

### 2a. Update `app/layout.tsx`

**File:** `app/layout.tsx`

Replace the entire file:

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Reflect AI — Interview Coach',
  description:
    'Voice-first, hands-free interview coach that visualizes soft skills in real-time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
```

**Key changes from default:**

- `<html>` gets `className="dark"` (force dark mode)
- `<body>` gets `bg-[#0a0a0a] text-white min-h-screen`
- Metadata updated to Reflect AI branding

### 2b. Update `app/globals.css`

**File:** `app/globals.css`

Replace the entire file:

```css
@import 'tailwindcss';

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --accent: #3b82f6;
  --positive: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-positive: var(--positive);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
}

/* Smooth transitions for all metric updates */
.metric-transition {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Pulsing glow for active listening state */
@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(59, 130, 246, 0.6);
  }
}

.listening-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Fade-in for dashboard cards */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fade-in-up 0.5s ease-out forwards;
}
```

### Acceptance Criteria

- [ ] Running `npm run dev` shows a completely dark page (no white flash)
- [ ] CSS custom properties `--accent`, `--positive`, `--warning`, `--danger` are available
- [ ] `.listening-glow` and `.fade-in-up` animations exist

---

## TASK 3: Speech Primitives (STT + TTS)

### 3a. Create `app/hooks/useSpeechRecognition.ts`

**File:** `app/hooks/useSpeechRecognition.ts`

This hook wraps the Web Speech API for speech-to-text.

```typescript
'use client';

import { useRef, useState, useCallback } from 'react';

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
```

**Design decisions:**

- `startListening()` returns a `Promise<string>` — the state machine in Task 5 awaits it.
- `continuous: true` + `interimResults: true` gives live transcription.
- The browser's built-in silence detection triggers `onend` (no manual 1.5s timer needed).
- `speechDuration` is tracked for client-side WPM calculation.

### 3b. Create `app/lib/speech.ts`

**File:** `app/lib/speech.ts`

This utility handles text-to-speech and filler audio playback.

```typescript
'use client';

/**
 * Speak text using the browser's SpeechSynthesis API.
 * Returns a Promise that resolves when speech finishes.
 */
export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('SpeechSynthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Try to pick a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes('Samantha') ||
        v.name.includes('Google') ||
        v.name.includes('Natural'),
    );
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(`Speech error: ${e.error}`));

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Play an audio file (e.g., thinking filler).
 * Returns a Promise that resolves when playback finishes.
 * If `interrupt` is true, stops playback immediately when called again.
 */
let currentAudio: HTMLAudioElement | null = null;

export function playAudio(src: string): Promise<void> {
  return new Promise((resolve) => {
    // Stop any currently playing filler
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(src);
    currentAudio = audio;
    audio.volume = 0.5;

    audio.onended = () => {
      currentAudio = null;
      resolve();
    };

    audio.onerror = () => {
      currentAudio = null;
      resolve(); // Don't reject — filler audio is non-critical
    };

    audio.play().catch(() => resolve());
  });
}

/** Stop any currently playing filler audio. */
export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * Calculate words per minute from a transcript and speech duration.
 * @param transcript - The spoken text
 * @param durationSeconds - How long the user spoke (in seconds)
 * @returns WPM as an integer
 */
export function calculateWPM(
  transcript: string,
  durationSeconds: number,
): number {
  if (!transcript.trim() || durationSeconds <= 0) return 0;
  const wordCount = transcript.trim().split(/\s+/).length;
  return Math.round((wordCount / durationSeconds) * 60);
}
```

### Acceptance Criteria

- [ ] `useSpeechRecognition` hook can be imported in a client component
- [ ] Calling `startListening()` opens the browser mic prompt (in Chrome)
- [ ] Speaking into the mic updates `transcript` in real time
- [ ] Stopping speech resolves the promise with the final text
- [ ] `speak("hello world")` plays audio through the browser
- [ ] `calculateWPM("one two three four five", 3)` returns `100`

---

## TASK 4: OpenAI API Route

### Create `app/api/chat/route.ts`

**File:** `app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { Message, APIResponse } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Reflect, an expert technical interviewer and communication coach.

PROTOCOL:
1. Receive the user's spoken answer to a behavioral interview question.
2. Analyze it for Soft Skills: Confidence (0-100), Clarity (0-100), and Tone.
3. Generate a SHORT verbal response (max 2 sentences) that either:
   - Asks a probing follow-up question, OR
   - Gives brief positive reinforcement + the next question.

CRITICAL: Output ONLY valid JSON matching this exact schema:
{
  "reply": "string — your verbal response (max 2 sentences)",
  "analysis": {
    "confidence_score": number (0-100),
    "pacing_wpm": 0,
    "clarity_score": number (0-100),
    "tone": "professional" | "uncertain" | "casual" | "aggressive",
    "feedback_text": "string — one actionable tip"
  }
}

BEHAVIOR RULES:
- If the user gives a short or empty answer: Ask a specific probing follow-up.
- If the user is vague: Ask for concrete examples or metrics.
- If the user uses STAR method well: Acknowledge it briefly and move forward.
- Always maintain a warm, professional, encouraging persona.
- Never break character. Never output anything except the JSON.

NOTE: The "pacing_wpm" field should always be 0 — it is calculated client-side.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: Message[] = body.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 },
      );
    }

    // Prepend system prompt
    const fullMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages,
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: fullMessages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 502 },
      );
    }

    // Parse and validate the JSON
    const parsed: APIResponse = JSON.parse(content);

    // Basic validation
    if (typeof parsed.reply !== 'string' || !parsed.analysis) {
      return NextResponse.json(
        { error: 'Invalid response structure from OpenAI' },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('[/api/chat] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'OpenAI returned invalid JSON' },
        { status: 502 },
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Design decisions:**

- `pacing_wpm: 0` in the system prompt tells OpenAI to leave it as 0 — the client overwrites it.
- `response_format: { type: 'json_object' }` enforces JSON Mode.
- `max_tokens: 300` keeps responses fast and concise.
- `temperature: 0.7` balances creativity with consistency.

### Acceptance Criteria

- [ ] `POST /api/chat` with a valid messages array returns JSON matching `APIResponse`
- [ ] Response includes `reply` (string) and `analysis` (object with all metric fields)
- [ ] Invalid requests return 400
- [ ] OpenAI failures return 502
- [ ] The system prompt is not exposed to the client

**Manual test (curl):**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Tell me about a time you failed. I once deployed a bug to production that caused a 2-hour outage."}]}'
```

---

## TASK 5: Interview State Machine (`useInterview` hook)

### Create `app/hooks/useInterview.ts`

**File:** `app/hooks/useInterview.ts`

This is the "brain" of the frontend — it orchestrates the full interview loop.

```typescript
'use client';

import { useReducer, useCallback, useRef } from 'react';
import type {
  InterviewState,
  Message,
  APIResponse,
  AnalysisMetrics,
} from '@/types';
import { EMPTY_METRICS } from '@/types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { speak, playAudio, stopAudio, calculateWPM } from '@/app/lib/speech';

// ─── State Machine ───────────────────────────────────────────

type Action =
  | { type: 'START_LISTENING' }
  | { type: 'UPDATE_TRANSCRIPT'; transcript: string }
  | { type: 'START_PROCESSING' }
  | { type: 'START_SPEAKING' }
  | { type: 'RECEIVE_RESPONSE'; reply: string; analysis: AnalysisMetrics }
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
          { role: 'user', content: state.transcript },
        ],
      };

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        stats: action.analysis,
        allStats: [...state.allStats, action.analysis],
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

  // Sync live transcript into state
  // (useSpeechRecognition updates its own transcript; we mirror it)
  // The component should use `transcript` from this hook for display.

  /**
   * Run one full loop iteration:
   * 1. Listen to user
   * 2. Play filler audio
   * 3. Send to OpenAI
   * 4. Update metrics
   * 5. Speak response
   */
  const runLoop = useCallback(async () => {
    // ── Step 1: Listen ──
    dispatch({ type: 'START_LISTENING' });

    let finalTranscript: string;
    try {
      finalTranscript = await startListening();
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Microphone error',
      });
      return;
    }

    // If the user said nothing, prompt them
    if (!finalTranscript.trim()) {
      dispatch({ type: 'UPDATE_TRANSCRIPT', transcript: '' });
      dispatch({ type: 'START_PROCESSING' });
      finalTranscript = "(The user was silent and didn't respond.)";
    } else {
      dispatch({ type: 'UPDATE_TRANSCRIPT', transcript: finalTranscript });
      dispatch({ type: 'START_PROCESSING' });
    }

    // ── Step 2: Filler audio (non-blocking) ──
    playAudio('/audio/thinking.mp3');

    // ── Step 3: Call API ──
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...state.history,
            { role: 'user', content: finalTranscript },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error: ${res.status}`);
      }

      const data: APIResponse = await res.json();

      // ── Step 4: Update metrics (client-side WPM) ──
      const wpm = calculateWPM(finalTranscript, speechDuration);
      const analysis: AnalysisMetrics = {
        ...data.analysis,
        pacing_wpm: wpm,
      };

      dispatch({ type: 'RECEIVE_RESPONSE', reply: data.reply, analysis });

      // ── Step 5: Speak response ──
      stopAudio(); // Stop filler
      dispatch({ type: 'START_SPEAKING' });

      await speak(data.reply);

      dispatch({ type: 'FINISH_SPEAKING' });
    } catch (err) {
      stopAudio();
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  }, [startListening, state.history, speechDuration]);

  /**
   * Start the interview session.
   * Speaks the opening question, then enters the loop.
   */
  const startInterview = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    dispatch({ type: 'RESET' });

    // Speak the opening question
    dispatch({
      type: 'RECEIVE_RESPONSE',
      reply: OPENING_QUESTION,
      analysis: EMPTY_METRICS,
    });
    dispatch({ type: 'START_SPEAKING' });

    try {
      await speak(OPENING_QUESTION);
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
   */
  const endInterview = useCallback(() => {
    isRunningRef.current = false;
    stopListening();
    stopAudio();
    window.speechSynthesis?.cancel();
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
```

**State machine diagram:**

```
  idle ──[startInterview]──► speaking (opening question)
                                  │
                                  ▼
                             listening ──[speech ends]──► processing
                                  ▲                          │
                                  │                          ▼
                             speaking ◄──[API response]── processing
                                  │
                          [endInterview]
                                  │
                                  ▼
                                idle
```

### Acceptance Criteria

- [ ] `useInterview()` returns `state`, `liveTranscript`, `startInterview`, `endInterview`
- [ ] Calling `startInterview()` speaks the opening question, then starts listening
- [ ] After the user speaks and stops, the API is called and the response is spoken
- [ ] `state.phase` transitions correctly through: `idle → speaking → listening → processing → speaking → ...`
- [ ] `state.stats` updates after each API response
- [ ] `state.allStats` accumulates all rounds
- [ ] `endInterview()` stops everything cleanly

---

## TASK 6: Main Page & InterviewControl Component

### 6a. Create `app/components/InterviewControl.tsx`

**File:** `app/components/InterviewControl.tsx`

This is the primary UI component — the "mirror" interface.

```tsx
'use client';

import { useInterview } from '@/app/hooks/useInterview';
import AudioVisualizer from './AudioVisualizer';
import Dashboard from './Dashboard';
import Transcript from './Transcript';

export default function InterviewControl() {
  const {
    state,
    liveTranscript,
    isListening,
    isSupported,
    startInterview,
    endInterview,
    stopListening,
  } = useInterview();

  const { phase, history, stats, allStats, error } = state;
  const isActive = phase !== 'idle';

  // ─── Not supported fallback ──────────────────────────────
  if (!isSupported) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen gap-4 px-6'>
        <h1 className='text-2xl font-semibold'>Browser Not Supported</h1>
        <p className='text-zinc-400 text-center max-w-md'>
          Reflect AI requires the Web Speech API, which is only available in
          Chrome or Edge. Please switch browsers to continue.
        </p>
      </div>
    );
  }

  // ─── Idle / Landing State ────────────────────────────────
  if (!isActive && allStats.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen gap-8 px-6'>
        <div className='flex flex-col items-center gap-3'>
          <div className='w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center'>
            <div className='w-3 h-3 rounded-full bg-accent' />
          </div>
          <h1 className='text-4xl font-bold tracking-tight'>Reflect AI</h1>
          <p className='text-zinc-400 text-center max-w-sm'>
            Your voice-first interview coach. Practice behavioral questions and
            get real-time feedback on your soft skills.
          </p>
        </div>
        <button
          onClick={startInterview}
          className='px-8 py-4 rounded-full bg-accent text-white font-medium text-lg
                     hover:bg-blue-600 transition-colors duration-200 listening-glow'
        >
          Start Interview
        </button>
      </div>
    );
  }

  // ─── Summary State (interview ended with data) ───────────
  if (!isActive && allStats.length > 0) {
    const avg = (key: 'confidence_score' | 'clarity_score' | 'pacing_wpm') =>
      Math.round(
        allStats.reduce((sum, s) => sum + s[key], 0) / allStats.length,
      );

    return (
      <div className='flex flex-col items-center min-h-screen py-16 px-6 gap-8'>
        <h1 className='text-3xl font-bold'>Interview Summary</h1>
        <div className='grid grid-cols-3 gap-6 w-full max-w-2xl'>
          <SummaryCard
            label='Avg. Confidence'
            value={avg('confidence_score')}
            unit='/ 100'
          />
          <SummaryCard
            label='Avg. Clarity'
            value={avg('clarity_score')}
            unit='/ 100'
          />
          <SummaryCard
            label='Avg. Pacing'
            value={avg('pacing_wpm')}
            unit='WPM'
          />
        </div>
        <Dashboard stats={stats} allStats={allStats} />
        <Transcript history={history} />
        <button
          onClick={startInterview}
          className='px-8 py-3 rounded-full bg-accent text-white font-medium
                     hover:bg-blue-600 transition-colors'
        >
          Start New Interview
        </button>
      </div>
    );
  }

  // ─── Active Interview State ──────────────────────────────
  return (
    <div className='flex flex-col min-h-screen'>
      {/* Top bar */}
      <header className='flex items-center justify-between px-6 py-4 border-b border-zinc-800'>
        <span className='text-sm text-zinc-400 font-mono'>
          {phase === 'listening' && '● Listening...'}
          {phase === 'processing' && '◉ Thinking...'}
          {phase === 'speaking' && '◈ Speaking...'}
        </span>
        <div className='flex gap-3'>
          {phase === 'listening' && (
            <button
              onClick={stopListening}
              className='px-4 py-2 text-sm rounded-full border border-zinc-600
                         hover:bg-zinc-800 transition-colors'
            >
              Done Speaking
            </button>
          )}
          <button
            onClick={endInterview}
            className='px-4 py-2 text-sm rounded-full border border-danger text-danger
                       hover:bg-danger hover:text-white transition-colors'
          >
            Finish
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className='flex-1 flex flex-col lg:flex-row'>
        {/* Left: Visualizer + Transcript */}
        <div className='flex-1 flex flex-col items-center justify-center p-6 gap-6'>
          <AudioVisualizer isActive={isListening} />
          <div className='w-full max-w-lg min-h-[80px] text-center'>
            {phase === 'listening' && (
              <p className='text-xl text-zinc-200 leading-relaxed'>
                {liveTranscript || (
                  <span className='text-zinc-500'>Start speaking...</span>
                )}
              </p>
            )}
            {phase === 'processing' && (
              <p className='text-zinc-400 animate-pulse'>
                Analyzing your response...
              </p>
            )}
            {phase === 'speaking' && history.length > 0 && (
              <p className='text-xl text-zinc-200 leading-relaxed'>
                {history[history.length - 1].content}
              </p>
            )}
          </div>
        </div>

        {/* Right: Dashboard */}
        <div className='lg:w-96 border-t lg:border-t-0 lg:border-l border-zinc-800 p-6'>
          <Dashboard stats={stats} allStats={allStats} />
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 bg-danger/90 text-white px-6 py-3 rounded-lg'>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Helper Component ──────────────────────────────────────

function SummaryCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center fade-in-up'>
      <p className='text-sm text-zinc-400 mb-2'>{label}</p>
      <p className='text-3xl font-bold'>
        {value}{' '}
        <span className='text-base font-normal text-zinc-500'>{unit}</span>
      </p>
    </div>
  );
}
```

### 6b. Update `app/page.tsx`

**File:** `app/page.tsx`

Replace the entire file:

```tsx
import InterviewControl from '@/app/components/InterviewControl';

export default function Home() {
  return (
    <main className='min-h-screen'>
      <InterviewControl />
    </main>
  );
}
```

### Acceptance Criteria

- [ ] Landing page shows "Reflect AI" title, description, and "Start Interview" button
- [ ] Clicking "Start Interview" speaks the opening question
- [ ] During listening, live transcript updates in real-time
- [ ] "Done Speaking" button appears during listening phase
- [ ] "Finish" button ends the interview and shows summary
- [ ] Summary shows average confidence, clarity, and pacing
- [ ] Unsupported browser shows a clear fallback message

---

## TASK 7: Audio Visualizer & Filler Sound

### 7a. Create `app/components/AudioVisualizer.tsx`

**File:** `app/components/AudioVisualizer.tsx`

A canvas-based waveform that reacts to microphone input.

```tsx
'use client';

import { useRef, useEffect } from 'react';

interface Props {
  isActive: boolean;
}

export default function AudioVisualizer({ isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Draw idle state
      drawIdle();
      return;
    }

    let audioCtx: AudioContext;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;

        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        draw();
      } catch {
        drawIdle();
      }
    };

    setup();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      audioCtx?.close();
      analyserRef.current = null;
    };
  }, [isActive]);

  const drawIdle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw a subtle static line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Waveform
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b82f6';

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#3b82f6';
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    render();
  };

  return (
    <div
      className={`w-full max-w-lg ${isActive ? 'listening-glow' : ''} rounded-2xl p-1`}
    >
      <canvas
        ref={canvasRef}
        width={500}
        height={100}
        className='w-full h-24 rounded-xl bg-zinc-900/50'
      />
    </div>
  );
}
```

### 7b. Create filler audio

**File:** `public/audio/thinking.mp3`

You need to generate or source a short (2-3 second) subtle "thinking" sound.

**Options (in order of preference):**

1. Generate a short "hmm" sound using an online TTS tool and save it as `public/audio/thinking.mp3`
2. Use a royalty-free UI sound from freesound.org
3. As a temporary placeholder, create an empty file — the `playAudio` function handles errors gracefully

**For now, create the directory and a placeholder:**

```bash
mkdir -p public/audio
# Create a minimal valid MP3 (or just touch the file — playAudio handles errors)
touch public/audio/thinking.mp3
```

> **Note:** Replace this with a real audio file before the demo.

### Acceptance Criteria

- [ ] The visualizer shows a flat line when idle
- [ ] When `isActive={true}`, it requests mic access and shows a live waveform
- [ ] The waveform has a blue glow effect
- [ ] Cleanup: mic stream stops when `isActive` becomes false
- [ ] `public/audio/thinking.mp3` exists (even if placeholder)

---

## TASK 8: Dashboard Component

### Create `app/components/Dashboard.tsx`

**File:** `app/components/Dashboard.tsx`

Uses Recharts to visualize confidence, clarity, pacing, and tone.

```tsx
'use client';

import type { AnalysisMetrics } from '@/types';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface Props {
  stats: AnalysisMetrics;
  allStats: AnalysisMetrics[];
}

const toneColor: Record<string, string> = {
  professional: '#10b981',
  uncertain: '#f59e0b',
  casual: '#3b82f6',
  aggressive: '#ef4444',
};

export default function Dashboard({ stats, allStats }: Props) {
  // ─── Radar Data ──────────────────────────────────────────
  const radarData = [
    { metric: 'Confidence', value: stats.confidence_score, max: 100 },
    { metric: 'Clarity', value: stats.clarity_score, max: 100 },
    { metric: 'Pacing', value: Math.min(stats.pacing_wpm, 200), max: 200 },
  ];

  // ─── History Bar Data (last 5 rounds) ────────────────────
  const barData = allStats.slice(-5).map((s, i) => ({
    round: `Q${i + 1}`,
    confidence: s.confidence_score,
    clarity: s.clarity_score,
  }));

  const hasData = stats.confidence_score > 0 || stats.clarity_score > 0;

  return (
    <div className='flex flex-col gap-6 w-full'>
      <h2 className='text-sm font-mono text-zinc-400 uppercase tracking-wider'>
        Performance
      </h2>

      {/* Tone Badge */}
      {hasData && (
        <div className='flex items-center gap-2 fade-in-up'>
          <span className='text-xs text-zinc-500'>Tone:</span>
          <span
            className='px-3 py-1 rounded-full text-xs font-medium'
            style={{
              backgroundColor: `${toneColor[stats.tone] || '#3b82f6'}20`,
              color: toneColor[stats.tone] || '#3b82f6',
            }}
          >
            {stats.tone}
          </span>
        </div>
      )}

      {/* Feedback Text */}
      {stats.feedback_text && (
        <p className='text-sm text-zinc-300 italic border-l-2 border-accent pl-3 fade-in-up'>
          {stats.feedback_text}
        </p>
      )}

      {/* Radar Chart */}
      {hasData && (
        <div className='w-full h-52 fade-in-up'>
          <ResponsiveContainer width='100%' height='100%'>
            <RadarChart data={radarData}>
              <PolarGrid stroke='#27272a' />
              <PolarAngleAxis
                dataKey='metric'
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <Radar
                dataKey='value'
                stroke='#3b82f6'
                fill='#3b82f6'
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score Cards */}
      {hasData && (
        <div className='grid grid-cols-2 gap-3 fade-in-up'>
          <MetricCard
            label='Confidence'
            value={stats.confidence_score}
            max={100}
          />
          <MetricCard label='Clarity' value={stats.clarity_score} max={100} />
          <MetricCard label='Pacing' value={stats.pacing_wpm} unit='wpm' />
        </div>
      )}

      {/* History Bar Chart (only if >1 round) */}
      {barData.length > 1 && (
        <div className='w-full h-40 fade-in-up'>
          <p className='text-xs text-zinc-500 mb-2'>Progress Over Rounds</p>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={barData}>
              <XAxis dataKey='round' tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#71717a', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#18181b',
                  border: '1px solid #27272a',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey='confidence' fill='#3b82f6' radius={[4, 4, 0, 0]} />
              <Bar dataKey='clarity' fill='#10b981' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <p className='text-zinc-600 text-sm text-center py-8'>
          Metrics will appear here after your first answer.
        </p>
      )}
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
}) {
  const percentage = max ? (value / max) * 100 : undefined;

  return (
    <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-3'>
      <p className='text-xs text-zinc-500 mb-1'>{label}</p>
      <p className='text-xl font-semibold metric-transition'>
        {value}
        {unit && <span className='text-xs text-zinc-500 ml-1'>{unit}</span>}
        {max && <span className='text-xs text-zinc-500'>/{max}</span>}
      </p>
      {percentage !== undefined && (
        <div className='w-full h-1 bg-zinc-800 rounded-full mt-2'>
          <div
            className='h-1 bg-accent rounded-full metric-transition'
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

### Acceptance Criteria

- [ ] Radar chart renders with 3 axes: Confidence, Clarity, Pacing
- [ ] Tone badge shows with color coding
- [ ] Feedback text appears in an italicized block quote
- [ ] Score cards show values with progress bars
- [ ] Bar chart appears after round 2, showing history
- [ ] Empty state message shows when no data exists
- [ ] All sections animate in with `fade-in-up`

---

## TASK 9: Transcript Component

### Create `app/components/Transcript.tsx`

**File:** `app/components/Transcript.tsx`

```tsx
'use client';

import { useRef, useEffect } from 'react';
import type { Message } from '@/types';

interface Props {
  history: Message[];
}

export default function Transcript({ history }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  if (history.length === 0) {
    return null;
  }

  return (
    <div className='w-full max-w-2xl'>
      <h3 className='text-sm font-mono text-zinc-400 uppercase tracking-wider mb-4'>
        Conversation
      </h3>
      <div className='flex flex-col gap-3 max-h-80 overflow-y-auto pr-2'>
        {history
          .filter((m) => m.role !== 'system')
          .map((message, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-accent/10 text-zinc-200 rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-300 rounded-bl-sm'
                }`}
              >
                <span className='text-[10px] uppercase tracking-wider text-zinc-500 block mb-1'>
                  {message.role === 'user' ? 'You' : 'Reflect'}
                </span>
                {message.content}
              </div>
            </div>
          ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

### Acceptance Criteria

- [ ] Messages display in a chat-like layout (user right, assistant left)
- [ ] New messages auto-scroll into view
- [ ] System messages are filtered out
- [ ] Returns null when history is empty (no visual noise)
- [ ] Messages have distinct styling per role

---

## TASK 10: Integration Test & Polish

This is not a code task — it's a **manual verification checklist**.

### Full Flow Test

1. [ ] Run `npm run dev` — app starts without errors
2. [ ] Open `http://localhost:3000` in **Chrome**
3. [ ] Landing page shows: title, description, "Start Interview" button
4. [ ] Click "Start Interview"
5. [ ] Browser speaks the opening question
6. [ ] Waveform visualizer activates when listening begins
7. [ ] Speak an answer — live transcript appears
8. [ ] After silence, filler audio plays, "Analyzing..." shows
9. [ ] Dashboard updates with new metrics (confidence, clarity, tone, pacing)
10. [ ] AI speaks the follow-up question
11. [ ] Loop repeats (steps 6-10)
12. [ ] Click "Finish" — summary screen shows with averages + full transcript
13. [ ] Click "Start New Interview" — resets everything

### Edge Cases

14. [ ] Deny microphone permission → shows error, doesn't crash
15. [ ] Open in Firefox/Safari → shows "Browser Not Supported" message
16. [ ] Say nothing (stay silent) → AI asks a probing follow-up
17. [ ] API key is missing → shows error toast, doesn't hang
18. [ ] Click "Done Speaking" button → manually ends STT, proceeds to processing

---

## Quick Reference: Execution Order

```
TASK 0  → Install deps (npm install openai recharts)
TASK 1  → Types + env file (foundation)
TASK 2  → Layout + global styles (visual base)
TASK 3  → STT hook + TTS utility (speech primitives)
TASK 4  → API route (the "brain")
TASK 5  → useInterview hook (state machine)
TASK 6  → InterviewControl + page.tsx (main UI)
TASK 7  → AudioVisualizer + filler audio
TASK 8  → Dashboard (Recharts)
TASK 9  → Transcript component
TASK 10 → Integration test
```

> **Total estimated time:** 6-10 hours for a skilled executor.
> Each task is independently testable. Do not proceed to the next task until the current one's acceptance criteria are met.
