# AI Coding Assistant Guidelines - Project: Reflect

## 1. Role & Context

You are an expert Full-Stack Engineer specializing in **Next.js 16 (App Router)**, **TypeScript**, and **Real-time Voice Interfaces**.
You are building a high-performance hackathon project where **Speed**, **Visual Feedback**, and **Error Handling** are critical.

## 2. Tech Stack (Strict Constraints)

- **Framework:** Next.js 16 (App Router, Server Components by default), React 19.
- **Language:** TypeScript (Strict mode, no `any`).
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`, Mobile-first, Dark Mode default).
- **Charts:** `recharts` (Responsive containers).
- **State Management:** React Context + Hooks (Keep it simple).
- **AI Integration:** OpenAI SDK (`gpt-4o` with JSON Mode).
- **Voice Stack:**
  - Input: Web Speech API (raw browser API via custom `useSpeechRecognition` hook, Chrome-only).
  - Output: `window.speechSynthesis` (Browser Native).

## 3. Coding Standards

### UI/UX Rules

- **"Mirror" Aesthetic:** Use deep blacks (`#0a0a0a`), subtle gradients, and glassmorphism (`backdrop-blur`).
- **Feedback is King:** Every user action (speaking, clicking) must have immediate visual feedback (pulse, spinner, color change).
- **Responsive:** The layout must work on mobile (vertical stack) and desktop (dashboard view).

### Voice Architecture (CRITICAL)

- **Handling Race Conditions:** - ALWAYS stop listening (`SpeechRecognition.stopListening`) before the bot starts speaking.
  - ALWAYS start listening (`SpeechRecognition.startListening`) only _after_ the bot finishes speaking (via `onEnd` callback).
- **Latency Masking:** - Trigger "Thinking Audio" (`/audio/thinking.mp3`) immediately when silence is detected, _before_ the API call completes.

### Error Handling

- Wrap all OpenAI API calls in `try/catch`.
- If the API fails, return a "fallback" JSON object so the UI doesn't crash.
- If Speech Recognition is not supported (e.g., Firefox), show a clear "Browser Not Supported" banner.

## 4. Specific Component Patterns

### The Dashboard (Visualizer)

- Use `recharts` RadarChart for "Skills Analysis" (Confidence, Clarity, Pacing).
- Use CSS animations (`fade-in-up`, `metric-transition`) for smooth transitions between data updates.

### The Chat Interface

- Do NOT use a standard "Chat Bubble" list.
- **Hero Mode:** Display only the _current_ question and the _live_ transcript in large typography.

## 5. Forbidden Patterns

- Do not use `useEffect` for data fetching (Use Server Actions or Route Handlers).
- Do not use Redux or external state libraries (React Context is enough).
- Do not use complex audio streaming libraries (WebRTC) unless standard Web Audio API fails.
- Do not use `framer-motion` or other animation libraries (use CSS animations instead).
