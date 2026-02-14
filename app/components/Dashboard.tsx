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
    round: `Q${allStats.length - allStats.slice(-5).length + i + 1}`,
    confidence: s.confidence_score,
    clarity: s.clarity_score,
  }));

  const hasData = stats.confidence_score > 0 || stats.clarity_score > 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider">
        Performance
      </h2>

      {/* Tone Badge */}
      {hasData && (
        <div className="flex items-center gap-2 fade-in-up">
          <span className="text-xs text-zinc-500">Tone:</span>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
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
        <p className="text-sm text-zinc-300 italic border-l-2 border-accent pl-3 fade-in-up">
          {stats.feedback_text}
        </p>
      )}

      {/* Radar Chart */}
      {hasData && (
        <div className="w-full h-52 fade-in-up">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <Radar
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score Cards */}
      {hasData && (
        <div className="grid grid-cols-2 gap-3 fade-in-up">
          <MetricCard
            label="Confidence"
            value={stats.confidence_score}
            max={100}
          />
          <MetricCard label="Clarity" value={stats.clarity_score} max={100} />
          <MetricCard label="Pacing" value={stats.pacing_wpm} unit="wpm" />
        </div>
      )}

      {/* History Bar Chart (only if >1 round) */}
      {barData.length > 1 && (
        <div className="w-full h-40 fade-in-up">
          <p className="text-xs text-zinc-500 mb-2">Progress Over Rounds</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="round" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
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
              <Bar dataKey="confidence" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clarity" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <p className="text-zinc-600 text-sm text-center py-8">
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-xl font-semibold metric-transition">
        {value}
        {unit && <span className="text-xs text-zinc-500 ml-1">{unit}</span>}
        {max && <span className="text-xs text-zinc-500">/{max}</span>}
      </p>
      {percentage !== undefined && (
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-2">
          <div
            className="h-1 bg-accent rounded-full metric-transition"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
