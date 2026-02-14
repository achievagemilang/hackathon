'use client';

import { useEffect } from 'react';
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

  // Auto-dismiss error toast after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        // Error will be cleared automatically on next START_LISTENING via reducer
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ─── Not supported fallback ──────────────────────────────
  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <h1 className="text-2xl font-semibold">Browser Not Supported</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Reflect AI requires the Web Speech API, which is only available in
          Chrome or Edge. Please switch browsers to continue.
        </p>
      </div>
    );
  }

  // ─── Idle / Landing State ────────────────────────────────
  if (!isActive && allStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center backdrop-blur-sm">
            <div className="w-3 h-3 rounded-full bg-accent" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Reflect AI</h1>
          <p className="text-zinc-400 text-center max-w-sm">
            Your voice-first interview coach. Practice behavioral questions and
            get real-time feedback on your soft skills.
          </p>
        </div>
        <button
          onClick={startInterview}
          className="px-8 py-4 rounded-full bg-accent text-white font-medium text-lg
                     hover:bg-blue-600 transition-colors duration-200 listening-glow"
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
      <div className="flex flex-col items-center min-h-screen py-16 px-6 gap-8">
        <h1 className="text-3xl font-bold">Interview Summary</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
          <SummaryCard
            label="Avg. Confidence"
            value={avg('confidence_score')}
            unit="/ 100"
          />
          <SummaryCard
            label="Avg. Clarity"
            value={avg('clarity_score')}
            unit="/ 100"
          />
          <SummaryCard
            label="Avg. Pacing"
            value={avg('pacing_wpm')}
            unit="WPM"
          />
        </div>
        <Dashboard stats={stats} allStats={allStats} />
        <Transcript history={history} />
        <button
          onClick={startInterview}
          className="px-8 py-3 rounded-full bg-accent text-white font-medium
                     hover:bg-blue-600 transition-colors"
        >
          Start New Interview
        </button>
      </div>
    );
  }

  // ─── Active Interview State (HERO MODE per SKILLS.md) ──────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar with phase indicator and controls */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <span className="text-sm text-zinc-400 font-mono">
          {phase === 'listening' && '● Listening...'}
          {phase === 'processing' && '◉ Thinking...'}
          {phase === 'speaking' && '◈ Speaking...'}
        </span>
        <div className="flex gap-3">
          {phase === 'listening' && (
            <button
              onClick={stopListening}
              className="px-4 py-2 text-sm rounded-full border border-zinc-600
                         hover:bg-zinc-800 transition-colors"
            >
              Done Speaking
            </button>
          )}
          <button
            onClick={endInterview}
            className="px-4 py-2 text-sm rounded-full border border-danger text-danger
                       hover:bg-danger hover:text-white transition-colors"
          >
            Finish
          </button>
        </div>
      </header>

      {/* Main content area - HERO MODE: Large typography, center focus */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Visualizer + Hero Text Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <AudioVisualizer isActive={isListening} />
          
          {/* HERO MODE: Large, prominent display of current text */}
          <div className="w-full max-w-2xl min-h-[120px] text-center">
            {phase === 'listening' && (
              <div className="fade-in-up">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    Your Response
                  </p>
                  {liveTranscript.wordCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-mono bg-accent/20 text-accent rounded-full border border-accent/30">
                      {liveTranscript.wordCount} {liveTranscript.wordCount === 1 ? 'word' : 'words'}
                    </span>
                  )}
                </div>
                <div className="max-h-[40vh] overflow-y-auto scrollbar-thin px-4">
                  <p className="text-2xl lg:text-3xl leading-relaxed font-light text-left">
                    {liveTranscript.final || liveTranscript.interim ? (
                      <>
                        <span className="text-zinc-100">{liveTranscript.final}</span>
                        {liveTranscript.interim && (
                          <span className="text-zinc-500"> {liveTranscript.interim}</span>
                        )}
                        <span className="inline-block w-0.5 h-8 bg-accent ml-1 animate-pulse" />
                      </>
                    ) : (
                      <span className="text-zinc-600">Start speaking...</span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {phase === 'processing' && (
              <div className="fade-in-up">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  Your Response
                </p>
                {state.transcript && (
                  <div className="max-h-[40vh] overflow-y-auto scrollbar-thin px-4 mb-6">
                    <p className="text-lg lg:text-xl text-zinc-500 italic leading-relaxed text-left">
                      "{state.transcript}"
                    </p>
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400 text-lg">Analyzing your response...</p>
                </div>
              </div>
            )}
            {phase === 'speaking' && history.length > 0 && (
              <div className="fade-in-up">
                <p className="text-xs uppercase tracking-wider text-accent mb-3">
                  Reflect
                </p>
                <p className="text-2xl lg:text-3xl text-zinc-100 leading-relaxed font-light">
                  {history[history.length - 1].content}
                </p>
              </div>
            )}
          </div>

          {/* Mobile compact metrics bar (visible only on mobile during active interview) */}
          {stats.confidence_score > 0 && (
            <div className="lg:hidden w-full max-w-2xl grid grid-cols-3 gap-3 mt-6">
              <CompactMetric label="Confidence" value={stats.confidence_score} max={100} />
              <CompactMetric label="Clarity" value={stats.clarity_score} max={100} />
              <CompactMetric label="Pacing" value={stats.pacing_wpm} unit="wpm" />
            </div>
          )}
        </div>

        {/* Right: Dashboard (hidden on mobile when active) */}
        <div className="hidden lg:block lg:w-96 border-l border-zinc-800 p-6">
          <Dashboard stats={stats} allStats={allStats} />
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-danger/90 text-white px-6 py-3 rounded-lg shadow-xl backdrop-blur-sm fade-in-up">
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center fade-in-up backdrop-blur-sm">
      <p className="text-sm text-zinc-400 mb-2">{label}</p>
      <p className="text-3xl font-bold">
        {value}{' '}
        <span className="text-base font-normal text-zinc-500">{unit}</span>
      </p>
    </div>
  );
}

// Compact metric card for mobile view during active interview
function CompactMetric({
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
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-center backdrop-blur-sm">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-semibold">
        {value}
        {unit && <span className="text-xs text-zinc-500 ml-1">{unit}</span>}
        {max && <span className="text-xs text-zinc-500">/{max}</span>}
      </p>
    </div>
  );
}
