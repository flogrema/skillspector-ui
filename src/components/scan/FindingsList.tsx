import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  ExternalLink,
  Check,
  Code2,
  FileText,
  AlertCircle,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Issue } from '../../types/api';
import { getSeverityBadge } from '../../lib/formatters';

interface FindingsListProps {
  issues: Issue[] | null | undefined;
  targetDir: string;
}

export const FindingsList: React.FC<FindingsListProps> = ({ issues, targetDir }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIssues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyFinding = async (issue: Issue) => {
    const text = JSON.stringify(issue, null, 2);
    if (window.api?.copyToClipboard) {
      await window.api.copyToClipboard(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    setCopiedId(issue.id || issue.finding_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenFile = async (file: string) => {
    if (window.api?.openFileInEditor) {
      await window.api.openFileInEditor(targetDir, file);
    }
  };

  if (!issues || issues.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0d0d10] p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
          <Check className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-white">No Security Findings Detected</h4>
        <p className="mt-1 text-xs text-zinc-500">
          Static and heuristic checks found no malicious patterns or policy violations in this skill.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Security Findings ({issues.length})
          </h4>
        </div>
        <span className="text-[11px] text-zinc-500">
          Issues detected by security analyzers
        </span>
      </div>

      <div className="space-y-3">
        {issues.map((issue, idx) => {
          const key = issue.id || issue.finding_id || `issue-${idx}`;
          const badge = getSeverityBadge(issue.severity);
          const BadgeIcon = badge.icon;
          const isExpanded = expandedIssues[key] ?? true;
          const isCopied = copiedId === key;

          return (
            <div
              key={key}
              className="rounded-xl border border-white/[0.08] bg-[#121215] overflow-hidden transition-all"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-surface-hover/50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Severity Badge */}
                  <span
                    className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.badgeClass}`}
                  >
                    <BadgeIcon className="h-3.5 w-3.5" />
                    <span>{badge.label}</span>
                  </span>

                  {/* Category / Pattern */}
                  <span className="text-sm font-semibold text-zinc-100">
                    {issue.category || issue.finding || 'Security Finding'}
                  </span>

                  {issue.pattern && (
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                      {issue.pattern}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyFinding(issue)}
                    className="flex items-center space-x-1 rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors"
                    title="Copy finding JSON"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-zinc-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(key)}
                    className="rounded-md p-1 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                    aria-label={isExpanded ? 'Collapse finding details' : 'Expand finding details'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card Body */}
              {isExpanded && (
                <div className="p-4 space-y-3 text-xs">
                  {/* Explanation */}
                  {issue.explanation && (
                    <div className="text-zinc-300 leading-relaxed">
                      {issue.explanation}
                    </div>
                  )}

                  {/* Location & File link */}
                  {issue.location && (
                    <div className="flex items-center justify-between rounded-lg bg-[#09090b] border border-white/[0.06] px-3 py-2 font-mono text-zinc-300">
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate" title={issue.location.file}>
                          {issue.location.file}
                          {issue.location.start_line > 0 && (
                            <span className="text-cyan-400 font-bold ml-1">
                              :{issue.location.start_line}
                              {issue.location.end_line && issue.location.end_line !== issue.location.start_line
                                ? `-${issue.location.end_line}`
                                : ''}
                            </span>
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenFile(issue.location.file)}
                        className="flex items-center space-x-1 rounded px-2 py-0.5 text-[11px] font-sans font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors shrink-0 ml-2"
                        title="Open file in external editor"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Open File</span>
                      </button>
                    </div>
                  )}

                  {/* Code Snippet (Safely escaped text representation) */}
                  {issue.code_snippet && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-zinc-400 font-medium">
                        <Code2 className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Code Evidence</span>
                      </div>
                      <pre className="overflow-x-auto rounded-lg bg-[#09090b] border border-white/[0.06] p-3 font-mono text-[11px] text-zinc-200 leading-normal selection:bg-cyan-500/30">
                        <code>{issue.code_snippet}</code>
                      </pre>
                    </div>
                  )}

                  {/* Remediation */}
                  {issue.remediation && (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-1">
                      <div className="flex items-center space-x-1.5 font-semibold text-emerald-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Remediation Guidance</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed pl-5">
                        {issue.remediation}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {issue.tags && issue.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {issue.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center space-x-1 rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400 font-mono"
                        >
                          <Tag className="h-2.5 w-2.5 text-zinc-500" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
