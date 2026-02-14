import type { APIResponse, AnalysisMetrics, Message } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

const VALID_TONES = ['professional', 'uncertain', 'casual', 'aggressive'];

/**
 * Clamp a value to a given range. Returns 0 if not a valid number.
 */
function clampScore(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Validate and sanitize the analysis metrics from OpenAI.
 * Ensures all values are within expected ranges.
 */
function sanitizeAnalysis(raw: Record<string, unknown>): AnalysisMetrics {
  return {
    confidence_score: clampScore(raw.confidence_score, 0, 100),
    pacing_wpm: 0, // Always 0 — calculated client-side
    clarity_score: clampScore(raw.clarity_score, 0, 100),
    tone: VALID_TONES.includes(raw.tone as string)
      ? (raw.tone as AnalysisMetrics['tone'])
      : 'professional',
    feedback_text:
      typeof raw.feedback_text === 'string' ? raw.feedback_text : '',
  };
}

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
    const parsed = JSON.parse(content);

    // Basic structure validation
    if (typeof parsed.reply !== 'string' || !parsed.analysis) {
      return NextResponse.json(
        { error: 'Invalid response structure from OpenAI' },
        { status: 502 },
      );
    }

    // Sanitize and validate all metric values
    const response: APIResponse = {
      reply: parsed.reply,
      analysis: sanitizeAnalysis(parsed.analysis),
    };

    return NextResponse.json(response);
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
