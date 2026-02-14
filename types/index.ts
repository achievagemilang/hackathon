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
