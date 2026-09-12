import React from 'react';
import { Loader2, XCircle, Clock, Shield } from 'lucide-react';
import { useScanStore } from '../../stores/scanStore';
import { formatDuration } from '../../lib/formatters';

export const ScanProgress: React.FC = () => {
  const { isScanning, elapsedSeconds, progressInfo, cancelScan } = useScanStore();

  if (!isScanning) return null;

  const total = progressInfo?.totalSkills || 0;
  const currentIdx = progressInfo?.skillIndex || 0;
  const currentSkill = progressInfo?.currentSkill || 'Initializing SkillSpector...';

  const percentage = total > 0 ? Math.min(100, Math.round((currentIdx / total) * 100)) : null;

  return (
    <div
      className="surface-card p-4 border border-cyan-500/20 bg-gradient-to-r from-surface to-cyan-950/10 shadow-lg relative overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">Analysis in Progress</span>
              {total > 0 && (
                <span className="rounded bg-white/[0.08] px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                  {currentIdx} / {total} skills
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400 font-mono truncate max-w-lg mt-0.5">
              {currentSkill}
            </p>
          </div>
        </div>

        {/* Right side: Elapsed time & Cancel */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-mono">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={cancelScan}
            className="flex items-center space-x-1.5 rounded-btn border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-all focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        {percentage !== null ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
        )}
      </div>
    </div>
  );
};
