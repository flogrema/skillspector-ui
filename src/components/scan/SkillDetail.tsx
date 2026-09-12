import React, { useEffect } from 'react';
import {
  X,
  RefreshCw,
  FileDown,
  Terminal,
  Loader2,
  Folder,
  Shield,
  CheckCircle2,
  AlertOctagon,
  FileCode,
} from 'lucide-react';
import { useScanStore } from '../../stores/scanStore';
import { getSeverityBadge, formatScore, getScoreTextColor } from '../../lib/formatters';
import { FindingsList } from './FindingsList';
import { InspectionWarnings } from './InspectionWarnings';
import { ScanWarnings } from './ScanWarnings';
import { CompletenessCard } from './CompletenessCard';

export const SkillDetail: React.FC = () => {
  const {
    selectedSkill,
    detailLoading,
    closeSkillDetail,
    rescanSingleSkill,
    setIsRawOutputOpen,
    activeResult,
    rawStderrLines,
  } = useScanStore();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSkillDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSkillDetail]);

  if (!selectedSkill) return null;

  const severityBadge = getSeverityBadge(selectedSkill.severity);
  const SeverityIcon = severityBadge.icon;

  const handleExportJson = async () => {
    if (!window.api?.saveFileDialog) return;
    const defaultName = `${selectedSkill.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-report.json`;
    const outputPath = await window.api.saveFileDialog(defaultName, [
      { name: 'JSON Reports', extensions: ['json'] },
    ]);
    if (outputPath && activeResult?.id && window.api.exportReport) {
      await window.api.exportReport(activeResult.id, 'json', outputPath);
    } else if (outputPath && window.api.copyToClipboard) {
      // Fallback export by copying JSON
      await window.api.copyToClipboard(JSON.stringify(selectedSkill, null, 2));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-detail-title"
    >
      {/* Backdrop click area */}
      <div className="absolute inset-0" onClick={closeSkillDetail} />

      {/* Slide-over panel */}
      <div className="relative z-10 flex h-full w-full max-w-3xl flex-col border-l border-white/[0.08] bg-[#0e0e11] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-surface/90 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center space-x-3 truncate">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileCode className="h-5 w-5" />
            </div>
            <div className="truncate">
              <h2 id="skill-detail-title" className="text-base font-bold text-white truncate">
                {selectedSkill.name}
              </h2>
              <p className="text-xs text-zinc-500 font-mono truncate" title={selectedSkill.path}>
                {selectedSkill.path}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={closeSkillDetail}
            className="rounded-btn p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header Banner: Score, Severity, Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[#121215] px-6 py-3">
          {/* Risk Metrics */}
          <div className="flex items-center space-x-4">
            <div className="flex items-baseline space-x-1">
              <span className={`text-2xl font-bold tracking-tight ${getScoreTextColor(selectedSkill.score)}`}>
                {Math.round(selectedSkill.score ?? 0)}
              </span>
              <span className="text-xs text-zinc-500">/ 100</span>
            </div>

            <div
              className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityBadge.badgeClass}`}
            >
              <SeverityIcon className="h-3.5 w-3.5" />
              <span>{severityBadge.label}</span>
            </div>

            {selectedSkill.recommendation && (
              <span className="hidden sm:inline text-xs text-zinc-400 truncate max-w-xs">
                {selectedSkill.recommendation}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => rescanSingleSkill(selectedSkill.path)}
              disabled={detailLoading}
              className="flex items-center space-x-1.5 rounded-btn bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-50"
              title="Rescan this skill individually"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${detailLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Rescan</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRawOutputOpen(true)}
              className="flex items-center space-x-1.5 rounded-btn bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white transition-all"
              title="View stdout and stderr logs"
            >
              <Terminal className="h-3.5 w-3.5 text-zinc-400" />
              <span>Logs</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center space-x-1.5 rounded-btn bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white transition-all"
              title="Export report to JSON"
            >
              <FileDown className="h-3.5 w-3.5 text-cyan-400" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <div className="text-sm font-medium text-zinc-200">
                Loading detailed analysis...
              </div>
              <p className="text-xs text-zinc-500 max-w-sm text-center">
                Running in-depth static analyzers and pattern checks for this skill.
              </p>
            </div>
          ) : (
            <>
              {/* 1. True Security Findings (from issues[]) */}
              <FindingsList
                issues={selectedSkill.issues}
                targetDir={selectedSkill.sourcePath || selectedSkill.path}
              />

              {/* 2. Inspection Warnings (from ledger_exceptions[]) */}
              <InspectionWarnings
                warnings={selectedSkill.inspectionWarnings}
                targetDir={selectedSkill.sourcePath || selectedSkill.path}
              />

              {/* 3. Scan Warnings (from stderr) */}
              <ScanWarnings warnings={activeResult?.scanWarnings || rawStderrLines} />

              {/* 4. Completeness & Analyzer Breakdown */}
              <CompletenessCard completeness={selectedSkill.completeness} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
