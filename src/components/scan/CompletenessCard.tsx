import React, { useState } from 'react';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import { AnalysisCompleteness } from '../../types/api';
import { isAnalysisComplete } from '../../lib/completeness';

interface CompletenessCardProps {
  completeness: AnalysisCompleteness | null | undefined;
}

export const CompletenessCard: React.FC<CompletenessCardProps> = ({ completeness }) => {
  const [showAnalyzers, setShowAnalyzers] = useState(false);

  if (!completeness) return null;

  const {
    coverage_percent,
    fully_inspected_files,
    partially_inspected_files,
    entirely_uninspected_files,
    analyzer_statuses,
  } = completeness;

  const isComplete = isAnalysisComplete(completeness);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileCheck className="h-4 w-4 text-cyan-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Inspection Completeness & Scope
          </h4>
        </div>

        <div className="flex items-center space-x-2">
          {isComplete ? (
            <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/25">
              <CheckCircle2 className="h-3 w-3" />
              <span>Complete</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/25">
              <AlertTriangle className="h-3 w-3" />
              <span>Partial Coverage</span>
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Coverage */}
        <div className="rounded-lg bg-[#09090b] border border-white/[0.05] p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Coverage
          </span>
          <div className="text-xl font-bold text-white mt-1">
            {Math.round(coverage_percent ?? 100)}%
          </div>
        </div>

        {/* Fully Inspected */}
        <div className="rounded-lg bg-[#09090b] border border-white/[0.05] p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Fully Inspected
          </span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {fully_inspected_files ?? 0}
          </div>
        </div>

        {/* Partially Inspected */}
        <div className="rounded-lg bg-[#09090b] border border-white/[0.05] p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Partially Inspected
          </span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {partially_inspected_files ?? 0}
          </div>
        </div>

        {/* Uninspected */}
        <div className="rounded-lg bg-[#09090b] border border-white/[0.05] p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Uninspected
          </span>
          <div className="text-xl font-bold text-zinc-400 mt-1">
            {entirely_uninspected_files ?? 0}
          </div>
        </div>
      </div>

      {/* Collapsible Analyzer Status Table */}
      {analyzer_statuses && analyzer_statuses.length > 0 && (
        <div className="border-t border-white/[0.06] pt-3">
          <button
            type="button"
            onClick={() => setShowAnalyzers(!showAnalyzers)}
            className="flex w-full items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span className="font-medium flex items-center space-x-1.5">
              <Cpu className="h-3.5 w-3.5 text-zinc-500" />
              <span>Analyzer Execution Breakdown ({analyzer_statuses.length})</span>
            </span>
            <div className="flex items-center space-x-1 text-[11px] text-zinc-500">
              <span>{showAnalyzers ? 'Hide' : 'Show details'}</span>
              {showAnalyzers ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>

          {showAnalyzers && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-white/[0.06] bg-[#09090b]">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-surface-hover/30 text-zinc-400">
                    <th className="px-3 py-2 font-semibold">Analyzer</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold text-center">Progress</th>
                    <th className="px-3 py-2 font-semibold">Message / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-zinc-300">
                  {analyzer_statuses.map((analyzer, aIdx) => {
                    const statusNorm = (analyzer.status || '').toLowerCase();
                    return (
                      <tr key={aIdx} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono font-medium text-white">
                          {analyzer.analyzer_id}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                              statusNorm === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : statusNorm === 'failed'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {analyzer.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-zinc-400">
                          {analyzer.completed} / {analyzer.planned_work || analyzer.completed}
                        </td>
                        <td className="px-3 py-2 text-zinc-400 text-[10px] max-w-xs truncate" title={analyzer.message || analyzer.reason_code}>
                          {analyzer.message || analyzer.reason_code || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
