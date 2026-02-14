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

// Fallback response for error handling (per SKILLS.md)
const FALLBACK_RESPONSE: APIResponse = {
  reply: "I'm having trouble processing that. Could you try rephrasing your answer?",
  analysis: {
    confidence_score: 50,
    pacing_wpm: 0,
    clarity_score: 50,
    tone: 'professional',
    feedback_text: 'Take a moment to organize your thoughts before responding.',
  },
};

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

    // Validate each message has required fields
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return NextResponse.json(
          { error: 'Invalid message format: role and content required' },
          { status: 400 },
        );
      }
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
      console.error('[/api/chat] No content in OpenAI response');
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    // Parse and validate the JSON
    const parsed: APIResponse = JSON.parse(content);

    // Basic validation
    if (typeof parsed.reply !== 'string' || !parsed.analysis) {
      console.error('[/api/chat] Invalid response structure from OpenAI:', parsed);
      return NextResponse.json(FALLBACK_RESPONSE);
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('[/api/chat] Error:', error);

    // Return fallback response instead of error (per SKILLS.md - never crash UI)
    if (error instanceof SyntaxError) {
      console.error('[/api/chat] OpenAI returned invalid JSON');
    }

    return NextResponse.json(FALLBACK_RESPONSE);
  }
}
