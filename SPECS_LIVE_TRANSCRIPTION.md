# Feature Spec: Live Transcription Enhancement

> **Goal:** Make live transcription feel alive, responsive, and polished during the user's spoken answer.
> **Constraint:** Pure CSS animations only (no framer-motion). Web Speech API only (no external STT services).

---

## Current State Analysis

### What exists

The pipeline is wired end-to-end:

```
useSpeechRecognition (interimResults: true)
  └─> transcript state (final + interim combined)
       └─> useInterview.liveTranscript
            └─> InterviewControl renders during phase === 'listening'
```

### What's broken / missing

| Problem | Impact |
|---------|--------|
| No distinction between interim and final text | User can't tell what's confirmed vs still processing |
| Transcript vanishes on phase change to 'processing' | User loses context of what they just said |
| No live word count | User has no pacing awareness during speech |
| No typing cursor / active indicator | No visual proof the system is capturing speech |
| No overflow handling for long answers | Text overflows container on mobile |
| Single string state (final + interim concatenated) | Can't style them differently |

---

## Technical Specification

### Changes Required (3 files)

---

### 1. Update `app/hooks/useSpeechRecognition.ts`

**Why:** The hook currently concatenates final and interim text into a single string. We need them separated so the UI can style them differently.

**Change the state and return type:**

```typescript
interface SpeechResult {
  transcript: string;
  duration: number;
}

interface LiveTranscript {
  /** Text the browser has finalized (high confidence, won't change) */
  final: string;
  /** Text the browser is still processing (may change with next onresult) */
  interim: string;
  /** Total word count (final + interim) */
  wordCount: number;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  /** Structured live transcript with final/interim separation */
  liveTranscript: LiveTranscript;
  startListening: () => Promise<SpeechResult>;
  stopListening: () => void;
  isSupported: boolean;
  speechDuration: number;
}
```

**Update the `onresult` handler:**

```typescript
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

  const combined = (finalTranscript + interim).trim();
  const wordCount = combined ? combined.split(/\s+/).length : 0;

  setLiveTranscript({ final: finalTranscript, interim, wordCount });
};
```

**Update `onstart` to reset:**

```typescript
recognition.onstart = () => {
  setIsListening(true);
  setLiveTranscript({ final: '', interim: '', wordCount: 0 });
  startTimeRef.current = Date.now();
};
```

**Replace the `transcript` state:**

```typescript
// BEFORE
const [transcript, setTranscript] = useState('');

// AFTER
const [liveTranscript, setLiveTranscript] = useState<LiveTranscript>({
  final: '',
  interim: '',
  wordCount: 0,
});
```

**Return value update:**

```typescript
return {
  isListening,
  liveTranscript,  // was: transcript
  startListening,
  stopListening,
  isSupported,
  speechDuration,
};
```

### Acceptance Criteria (Hook)

- [ ] `liveTranscript.final` contains only text the browser marked as `isFinal`
- [ ] `liveTranscript.interim` contains only text still being processed
- [ ] `liveTranscript.wordCount` equals total word count of final + interim
- [ ] On `onstart`, all three fields reset to empty/zero
- [ ] Return type matches `LiveTranscript` interface

---

### 2. Update `app/hooks/useInterview.ts`

**Why:** `useInterview` currently exposes `liveTranscript` as a plain string. Update to pass through the structured object.

**Change the return value:**

```typescript
// BEFORE
return {
  state,
  liveTranscript: transcript,
  // ...
};

// AFTER
return {
  state,
  liveTranscript,  // Now a LiveTranscript object from useSpeechRecognition
  // ...
};
```

**No changes to the reducer or state machine.** The `UPDATE_TRANSCRIPT` and `START_PROCESSING` actions still use `finalTranscript` (the string from the resolved Promise), not the live transcript state.

### Acceptance Criteria (Hook)

- [ ] `useInterview().liveTranscript` is a `LiveTranscript` object, not a string
- [ ] `useInterview().liveTranscript.wordCount` updates in real time during speech
- [ ] No changes to the state machine phase transitions

---

### 3. Update `app/components/InterviewControl.tsx`

**Why:** The UI needs to render final and interim text differently, show a word count, persist text briefly during phase transitions, and handle overflow.

#### 3a. Live Transcript Display (Hero Mode)

Replace the current listening-phase text block:

```tsx
{/* BEFORE */}
{phase === 'listening' && (
  <div className="fade-in-up">
    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
      Your Response
    </p>
    <p className="text-2xl lg:text-3xl text-zinc-100 leading-relaxed font-light">
      {liveTranscript || (
        <span className="text-zinc-600">Start speaking...</span>
      )}
    </p>
  </div>
)}
```

```tsx
{/* AFTER */}
{phase === 'listening' && (
  <div className="fade-in-up">
    <div className="flex items-center justify-center gap-3 mb-3">
      <p className="text-xs uppercase tracking-wider text-zinc-500">
        Your Response
      </p>
      {liveTranscript.wordCount > 0 && (
        <span className="text-xs text-zinc-600 font-mono">
          {liveTranscript.wordCount} words
        </span>
      )}
    </div>
    <div className="max-h-[40vh] overflow-y-auto scrollbar-thin">
      <p className="text-2xl lg:text-3xl text-zinc-100 leading-relaxed font-light">
        {liveTranscript.final || liveTranscript.interim ? (
          <>
            {/* Final text: solid white */}
            {liveTranscript.final && (
              <span>{liveTranscript.final}</span>
            )}
            {/* Interim text: dimmed, indicates "still processing" */}
            {liveTranscript.interim && (
              <span className="text-zinc-400">{liveTranscript.interim}</span>
            )}
            {/* Blinking cursor to show active capture */}
            <span className="inline-block w-0.5 h-6 bg-accent ml-1 animate-pulse align-middle" />
          </>
        ) : (
          <span className="text-zinc-600">Start speaking...</span>
        )}
      </p>
    </div>
  </div>
)}
```

**Visual behavior:**
- **Final text** (`liveTranscript.final`): Rendered in full white (`text-zinc-100`)
- **Interim text** (`liveTranscript.interim`): Rendered in dimmed grey (`text-zinc-400`), flickers as the browser updates
- **Typing cursor**: A blinking blue bar (`bg-accent animate-pulse`) at the end of text
- **Word count badge**: Shows `N words` in monospace next to the "Your Response" label
- **Overflow**: `max-h-[40vh] overflow-y-auto` prevents text from pushing other elements off screen

#### 3b. Persist Transcript During Processing Phase

When the phase transitions from `listening` to `processing`, the transcript currently vanishes. Instead, keep the final transcript visible while the spinner shows.

```tsx
{/* BEFORE */}
{phase === 'processing' && (
  <div className="flex flex-col items-center gap-3">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    <p className="text-zinc-400 text-lg">Analyzing your response...</p>
  </div>
)}
```

```tsx
{/* AFTER */}
{phase === 'processing' && (
  <div className="flex flex-col items-center gap-4">
    {/* Show the captured transcript (faded) so user remembers what they said */}
    {state.transcript && (
      <p className="text-lg text-zinc-500 leading-relaxed font-light max-w-2xl text-center max-h-[20vh] overflow-y-auto">
        "{state.transcript}"
      </p>
    )}
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-400 text-sm">Analyzing your response...</p>
    </div>
  </div>
)}
```

**Visual behavior:**
- User's final transcript shown in quotes, dimmed (`text-zinc-500`)
- Spinner + "Analyzing..." text shown below, smaller
- Transcript fades away when the `speaking` phase begins

#### 3c. Add scrollbar utility class to globals.css

Add to `app/globals.css`:

```css
/* Thin scrollbar for transcript overflow */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #27272a transparent;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: #27272a;
  border-radius: 2px;
}
```

### Acceptance Criteria (UI)

- [ ] Final text renders in full white, interim text renders in dimmed grey
- [ ] A blinking blue cursor appears at the end of the text while listening
- [ ] Word count updates in real-time during speech, shown as "N words" badge
- [ ] Long transcripts scroll within a max-height container (40vh)
- [ ] During processing phase, the captured transcript persists in quotes (dimmed)
- [ ] The spinner appears below the transcript quote during processing
- [ ] When speaking phase begins, the quoted transcript is replaced by AI response
- [ ] "Start speaking..." placeholder shows when no text has been captured yet
- [ ] Scrollbar is thin and matches the dark theme

---

## Data Flow Diagram

```
[Browser Mic] ──► SpeechRecognition.onresult
                      │
                      ├── isFinal=true  → liveTranscript.final  ──► white text
                      ├── isFinal=false → liveTranscript.interim ──► grey text
                      └── wordCount     → liveTranscript.wordCount → "N words" badge
                                │
                [User stops speaking]
                                │
                                ▼
                SpeechRecognition.onend
                      │
                      ├── resolve({ transcript, duration })
                      │
                      ▼
                runLoop continues
                      │
                      ├── dispatch(UPDATE_TRANSCRIPT, finalTranscript)
                      ├── dispatch(START_PROCESSING, finalTranscript)
                      │         │
                      │         └── state.transcript = finalTranscript
                      │                    │
                      │                    ▼
                      │         [Processing Phase UI]
                      │         Shows: "finalTranscript" (dimmed quote)
                      │         Shows: spinner + "Analyzing..."
                      │
                      ▼
                [API returns]
                      │
                      ├── dispatch(RECEIVE_RESPONSE, reply, analysis)
                      ├── dispatch(START_SPEAKING)
                      │
                      ▼
                [Speaking Phase UI]
                Shows: AI reply in Hero Mode
```

---

## Execution Checklist

```
Step 1 → Update useSpeechRecognition.ts (split transcript into final/interim/wordCount)
Step 2 → Update useInterview.ts (pass through LiveTranscript object)
Step 3 → Update InterviewControl.tsx (new listening UI + persist transcript in processing)
Step 4 → Update globals.css (scrollbar-thin utility)
Step 5 → Verify: npm run build passes
Step 6 → Commit with: feat(transcription): add live transcript with final/interim visual distinction
```

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User speaks 500+ words | Text scrolls within 40vh container, no layout shift |
| User pauses mid-sentence (3s gap) | Browser may fire `onend` then restart — cursor stays visible, text preserved |
| User speaks very fast | Interim text flickers frequently — this is normal Web Speech API behavior |
| User says nothing (silence) | "Start speaking..." placeholder remains, word count hidden |
| Browser processes final result mid-word | Final text may have trailing space — trim in display |
| Phase transitions during interim update | No race condition — phase change doesn't affect `liveTranscript` state in `useSpeechRecognition` |

---

## Visual Mockup (ASCII)

### Listening Phase:

```
┌─────────────────────────────────────────────┐
│  YOUR RESPONSE                    42 words  │
│                                             │
│  I faced a major challenge when our team    │
│  had to migrate a monolithic application    │
│  to microservices under a tight deadline.   │
│  The biggest issue was ▌ <-- cursor         │
│  (grey interim text here)                   │
│                                             │
│  ─────── Audio Waveform ───────             │
│                                             │
│            [Done Speaking]   [Finish]        │
└─────────────────────────────────────────────┘
```

### Processing Phase:

```
┌─────────────────────────────────────────────┐
│                                             │
│  "I faced a major challenge when our team   │
│   had to migrate a monolithic application   │
│   to microservices under a tight deadline." │
│                                             │
│     ◎ Analyzing your response...            │
│                                             │
│                              [Finish]        │
└─────────────────────────────────────────────┘
```
