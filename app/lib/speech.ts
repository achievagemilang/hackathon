'use client';

// ─── Voice preloading ────────────────────────────────────────
// Some browsers (Chrome) load voices asynchronously.
// We listen for the voiceschanged event to cache them.
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

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

    // Use cached voices (handles async loading)
    const voices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
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
