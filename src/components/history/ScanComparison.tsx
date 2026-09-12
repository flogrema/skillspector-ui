import React from 'react';
import {
  X,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { NormalizedScanResult } from '../../types/api';
import { formatDate, getSeverityBadge, getScoreTextColor } from '../../lib/formatters';
import { computeScanComparison, ComparisonFinding } from '../../lib/comparison';

interface ScanComparisonProps {
  scanA: NormalizedScanResult;
  scanB: NormalizedScanResult;
  onClose: () => void;
}

export const ScanComparison: React.FC<ScanComparisonProps> = ({ scanA, scanB, onClose }) => {
  const comparison = computeScanComparison(scanA, scanB);
  const {
    base,
    current,
    analysis,
    scoreDelta,
    findingsDelta,
    unobservedOrResolvedFindings,
    additionalOrNewFindings,
  } = comparison;

  const baseBadge = getSeverityBadge(base.maxSeverity);
  const currentBadge = getSeverityBadge(current.maxSeverity);
  const BaseIcon = baseBadge.icon;
  const CurrentIcon = currentBadge.icon;

  const isEquiv = analysis.isEquivalent;

  const formatFindingLabel = (f: ComparisonFinding) => {
    const loc = f.file ? `${f.file}${f.startLine ? `:${f.startLine}` : ''}` : '';
    const rule = f.ruleId ? `[${f.ruleId}] ` : '';
    return `${f.skillName} — ${rule}${f.category}${loc ? ` (${loc})` : ''} — ${f.explanation}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-dialog-title"
    >
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-white/[0.1] bg-[#0d0d10] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-surface px-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h3 id="compare-dialog-title" className="text-base font-bold text-white">
                Scan Comparison Diff
              </h3>
              {isEquiv ? (
                <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Equivalent Configuration</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Configuration Changed</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono truncate max-w-xl">
              Target: {current.targetPath}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Non-Equivalent Configuration Warning Banner */}
          {!isEquiv && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Non-Equivalent Scans — Configuration Changed
                  </h4>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {analysis.explanation}
                  </p>
                </div>
              </div>

              {/* Individual Differentiating Configuration Fields */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-500/15">
                {analysis.differences.map((diff) => (
                  <div
                    key={diff.field}
                    className="rounded-lg bg-black/40 border border-amber-500/20 px-2.5 py-1 text-[11px] font-mono text-zinc-300"
                  >
                    <span className="text-zinc-500 mr-1.5">{diff.label}:</span>
                    <span className="text-amber-300 font-semibold">{diff.baseValue}</span>
                    <span className="text-zinc-500 mx-1.5">→</span>
                    <span className="text-cyan-300 font-semibold">{diff.currentValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diff Metrics Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* 1. Risk Score Delta */}
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Risk Score Delta
              </span>

              <div className="my-3 flex items-center space-x-3">
                <span className={`text-2xl font-bold ${getScoreTextColor(base.maxScore)}`}>
                  {Math.round(base.maxScore)}
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-500" />
                <span className={`text-2xl font-bold ${getScoreTextColor(current.maxScore)}`}>
                  {Math.round(current.maxScore)}
                </span>
              </div>

              <div className="text-xs">
                {isEquiv ? (
                  scoreDelta < 0 ? (
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <TrendingDown className="h-4 w-4" />
                      <span>{scoreDelta} pts (Improved)</span>
                    </span>
                  ) : scoreDelta > 0 ? (
                    <span className="text-red-400 font-semibold flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>+{scoreDelta} pts (Regressed)</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 flex items-center space-x-1">
                      <Minus className="h-4 w-4" />
                      <span>No change</span>
                    </span>
                  )
                ) : (
                  // Neutral phrasing for non-equivalent scans
                  scoreDelta !== 0 ? (
                    <span className="text-zinc-300 font-medium flex items-center space-x-1">
                      <Minus className="h-4 w-4 text-zinc-500" />
                      <span>
                        Score changed {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
                      </span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 flex items-center space-x-1">
                      <Minus className="h-4 w-4" />
                      <span>No change</span>
                    </span>
                  )
                )}
              </div>
            </div>

            {/* 2. Severity Delta */}
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Max Severity Delta
              </span>

              <div className="my-3 flex items-center space-x-2">
                <span
                  className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${baseBadge.badgeClass}`}
                >
                  <BaseIcon className="h-3 w-3" />
                  <span>{baseBadge.label}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-500" />
                <span
                  className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${currentBadge.badgeClass}`}
                >
                  <CurrentIcon className="h-3 w-3" />
                  <span>{currentBadge.label}</span>
                </span>
              </div>

              <div className="text-[11px] text-zinc-500">
                {base.maxSeverity === current.maxSeverity
                  ? 'Severity level maintained'
                  : 'Severity shifted'}
              </div>
            </div>

            {/* 3. Findings Count Delta */}
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Findings Delta
              </span>

              <div className="my-3 flex items-center space-x-3">
                <span className="text-2xl font-bold text-zinc-200">{base.totalFindings}</span>
                <ArrowRight className="h-4 w-4 text-zinc-500" />
                <span className="text-2xl font-bold text-zinc-200">{current.totalFindings}</span>
              </div>

              <div className="text-xs">
                {isEquiv ? (
                  findingsDelta < 0 ? (
                    <span className="text-emerald-400 font-semibold">
                      {Math.abs(findingsDelta)} findings resolved
                    </span>
                  ) : findingsDelta > 0 ? (
                    <span className="text-red-400 font-semibold">
                      +{findingsDelta} new findings
                    </span>
                  ) : (
                    <span className="text-zinc-400">Identical finding count</span>
                  )
                ) : (
                  // Neutral phrasing for non-equivalent scans
                  findingsDelta < 0 ? (
                    <span className="text-zinc-300 font-medium">
                      {Math.abs(findingsDelta)} fewer findings observed
                    </span>
                  ) : findingsDelta > 0 ? (
                    <span className="text-zinc-300 font-medium">
                      +{findingsDelta} additional findings observed
                    </span>
                  ) : (
                    <span className="text-zinc-400">Identical finding count</span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Timestamps & Configuration Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl bg-[#121215] border border-white/[0.06] p-4 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-zinc-400">Baseline Scan:</span>
              <div className="text-zinc-300 font-mono">{formatDate(base.timestamp)}</div>
              <div className="text-zinc-500 text-[11px] space-y-0.5 pt-0.5">
                <div>
                  Version: <span className="font-mono text-zinc-400">{base.skillspectorVersion}</span> | Mode: <span className="text-zinc-400 capitalize">{base.scanMode}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>LLM:</span>
                  <span className={base.llmEnabled ? 'text-cyan-400 font-medium' : 'text-zinc-400'}>
                    {base.llmEnabled ? `Enabled (${base.model || 'default'})` : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-zinc-400">Comparison Scan:</span>
              <div className="text-zinc-300 font-mono">{formatDate(current.timestamp)}</div>
              <div className="text-zinc-500 text-[11px] space-y-0.5 pt-0.5">
                <div>
                  Version: <span className="font-mono text-zinc-400">{current.skillspectorVersion}</span> | Mode: <span className="text-zinc-400 capitalize">{current.scanMode}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>LLM:</span>
                  <span className={current.llmEnabled ? 'text-cyan-400 font-medium' : 'text-zinc-400'}>
                    {current.llmEnabled ? `Enabled (${current.model || 'default'})` : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* New / Additional Findings List */}
          {additionalOrNewFindings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isEquiv ? 'text-red-400' : 'text-cyan-400'
                  }`}
                >
                  {isEquiv
                    ? `New Findings (${additionalOrNewFindings.length})`
                    : `Additional Findings in Comparison Scan (${additionalOrNewFindings.length})`}
                </h4>
                {Math.abs(findingsDelta) !== additionalOrNewFindings.length && (
                  <span className="text-[11px] text-zinc-500">
                    {additionalOrNewFindings.length} distinct finding(s)
                  </span>
                )}
              </div>
              <div
                className={`rounded-xl border p-3 space-y-2 font-mono text-xs ${
                  isEquiv
                    ? 'border-red-500/20 bg-red-500/[0.04] text-red-300'
                    : 'border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300'
                }`}
              >
                {additionalOrNewFindings.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      + {formatFindingLabel(f)}
                    </div>
                    {f.isLlm && (
                      <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300 flex items-center space-x-1">
                        <Cpu className="h-2.5 w-2.5" />
                        <span>LLM</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolved / Not Observed Findings List */}
          {unobservedOrResolvedFindings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isEquiv ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isEquiv
                    ? `Resolved Findings (${unobservedOrResolvedFindings.length})`
                    : `Findings Not Observed in Comparison Scan (${unobservedOrResolvedFindings.length})`}
                </h4>
                {Math.abs(findingsDelta) !== unobservedOrResolvedFindings.length && (
                  <span className="text-[11px] text-zinc-500">
                    {unobservedOrResolvedFindings.length} distinct finding(s)
                  </span>
                )}
              </div>
              <div
                className={`rounded-xl border p-3 space-y-2 font-mono text-xs ${
                  isEquiv
                    ? 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300'
                    : 'border-amber-500/20 bg-amber-500/[0.04] text-amber-200'
                }`}
              >
                {unobservedOrResolvedFindings.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      {isEquiv ? '✓' : '—'} {formatFindingLabel(f)}
                    </div>
                    {f.isLlm && !current.llmEnabled && (
                      <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 flex items-center space-x-1">
                        <Cpu className="h-2.5 w-2.5" />
                        <span>LLM disabled</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Diff State */}
          {additionalOrNewFindings.length === 0 && unobservedOrResolvedFindings.length === 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#121215] p-6 text-center text-xs text-zinc-500">
              No finding discrepancies observed between these two reports.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
