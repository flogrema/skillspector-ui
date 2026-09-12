import React from 'react';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import { useScanStore } from '../../stores/scanStore';
import { getSeverityBadge, getScoreTextColor } from '../../lib/formatters';
import { getScanCompleteness } from '../../lib/completeness';

export const ScanSummary: React.FC = () => {
  const { activeResult } = useScanStore();

  if (!activeResult) return null;

  const completenessInfo = getScanCompleteness(activeResult);

  const {
    skillCount,
    maxScore,
    maxSeverity,
    totalFindings,
    scanMode,
    recommendation,
  } = activeResult;

  const severityBadge = getSeverityBadge(maxSeverity);
  const SeverityIcon = severityBadge.icon;

  // Aggregate issues breakdown if detailed skills are available
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  activeResult.skills?.forEach((skill) => {
    skill.issues?.forEach((issue) => {
      const sev = (issue.severity || '').toUpperCase();
      if (sev === 'CRITICAL') criticalCount++;
      else if (sev === 'HIGH') highCount++;
      else if (sev === 'MEDIUM') mediumCount++;
      else if (sev === 'LOW') lowCount++;
    });
  });

  const hasBreakdown = criticalCount + highCount + mediumCount + lowCount > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Skills Scanned */}
      <div className="surface-card surface-card-hover p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Skills Scanned
          </span>
          <div className="rounded-lg bg-white/[0.05] p-2 text-cyan-400">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-3xl font-bold tracking-tight text-white">
            {skillCount}
          </div>
        </div>

        <div className="text-xs text-text-secondary">
          Mode: <span className="text-zinc-300 font-medium capitalize">{scanMode}</span>
        </div>
      </div>

      {/* 2. Max Risk Score */}
      <div className="surface-card surface-card-hover p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Max Risk Score
          </span>
          <div className={`rounded-lg p-2 ${severityBadge.bgClass} ${severityBadge.textClass}`}>
            <SeverityIcon className="h-4 w-4" />
          </div>
        </div>

        <div className="my-3 flex items-baseline space-x-2">
          <span className={`text-3xl font-bold tracking-tight ${getScoreTextColor(maxScore)}`}>
            {Math.round(maxScore)}
          </span>
          <span className="text-sm font-medium text-text-secondary">/ 100</span>

          <div
            className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-xs font-semibold ${severityBadge.badgeClass} ml-2`}
          >
            <SeverityIcon className="h-3 w-3" />
            <span>{severityBadge.label}</span>
          </div>
        </div>

        <div className="text-xs text-text-secondary truncate" title={recommendation}>
          {recommendation || (maxScore === 0 ? 'No immediate risks identified' : 'Review findings')}
        </div>
      </div>

      {/* 3. Security Findings */}
      <div className="surface-card surface-card-hover p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Security Findings
          </span>
          <div className="rounded-lg bg-white/[0.05] p-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="my-3">
          <div
            className={`text-3xl font-bold tracking-tight ${
              totalFindings > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {totalFindings}
          </div>
        </div>

        <div className="text-xs text-text-secondary">
          {hasBreakdown ? (
            <div className="flex items-center space-x-2 font-mono text-[11px]">
              {criticalCount > 0 && (
                <span className="text-red-400 font-bold">{criticalCount} Crit</span>
              )}
              {highCount > 0 && <span className="text-orange-400 font-bold">{highCount} High</span>}
              {mediumCount > 0 && <span className="text-amber-400">{mediumCount} Med</span>}
              {lowCount > 0 && <span className="text-emerald-400">{lowCount} Low</span>}
            </div>
          ) : totalFindings === 0 ? (
            <span className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Clean scan result</span>
            </span>
          ) : (
            <span>Total issues flagged</span>
          )}
        </div>
      </div>

      {/* 4. Coverage & Completeness */}
      <div className="surface-card surface-card-hover p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Completeness
          </span>
          <div className="rounded-lg bg-white/[0.05] p-2 text-emerald-400">
            <FileCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="my-3 flex items-baseline space-x-2">
          <span className="text-3xl font-bold tracking-tight text-white">
            {completenessInfo.coveragePercent !== null
              ? `${Math.round(completenessInfo.coveragePercent)}%`
              : 'Unknown'}
          </span>
          {completenessInfo.coveragePercent !== null && (
            <span className="text-xs font-medium text-text-secondary">coverage</span>
          )}
        </div>

        <div className="text-xs text-text-secondary flex items-center space-x-1.5">
          {completenessInfo.completenessStatus === 'complete' ? (
            <span className="text-emerald-400 font-medium flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>{completenessInfo.label}</span>
            </span>
          ) : completenessInfo.completenessStatus === 'unknown' ? (
            <span className="text-zinc-400 font-medium flex items-center space-x-1">
              <HelpCircle className="h-3 w-3" />
              <span>{completenessInfo.label}</span>
            </span>
          ) : (
            <span className="text-amber-400 font-medium flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>{completenessInfo.label}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
