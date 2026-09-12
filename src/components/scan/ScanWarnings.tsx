import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, AlertCircle, Copy, Check } from 'lucide-react';
import { groupWarnings } from '../../lib/warnings';

interface ScanWarningsProps {
  warnings: string[] | null | undefined;
}

export const ScanWarnings: React.FC<ScanWarningsProps> = ({ warnings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRawLog, setShowRawLog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter for warning lines if given all stderr lines
  const warningLines = (warnings || []).filter(
    (line) =>
      typeof line === 'string' &&
      (line.toUpperCase().includes('WARN') ||
        line.toUpperCase().includes('FALLBACK') ||
        line.toUpperCase().includes('CONTEXT LENGTH'))
  );

  if (warningLines.length === 0) {
    return null;
  }

  const grouped = groupWarnings(warningLines);

  const handleCopyRaw = () => {
    const rawText = warningLines.join('\n');
    if (window.api?.copyToClipboard) {
      window.api.copyToClipboard(rawText);
    } else {
      navigator.clipboard?.writeText(rawText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-[#121215] overflow-hidden">
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-2.5 bg-surface-hover/60 hover:bg-surface-hover text-left transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Runtime & Config Warnings ({warningLines.length})
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-zinc-400 font-mono">
            stderr
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-zinc-500">
            {isOpen ? 'Hide' : 'Show details'}
          </span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-3 bg-[#09090b] border-t border-white/[0.06] space-y-3">
          {/* Grouped Warnings List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {grouped.map((group, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex items-start space-x-2 min-w-0">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="break-all font-mono text-[11px] text-zinc-300">
                    {group.message}
                  </span>
                </div>
                {group.count > 1 && (
                  <span
                    className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400 border border-amber-500/25"
                    title={`${group.count} occurrences`}
                  >
                    ×{group.count}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Expandable Raw Log Section */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRawLog(!showRawLog)}
                className="flex items-center space-x-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Terminal className="h-3 w-3 text-zinc-500" />
                <span>{showRawLog ? 'Hide raw log' : 'Show raw log'}</span>
                <span className="text-zinc-500 font-mono text-[10px]">
                  ({warningLines.length} line{warningLines.length === 1 ? '' : 's'})
                </span>
                {showRawLog ? (
                  <ChevronUp className="h-3 w-3 text-zinc-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                )}
              </button>

              {showRawLog && (
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="flex items-center space-x-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Copy raw warning lines"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy log</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {showRawLog && (
              <div className="mt-2 p-2.5 bg-[#050507] rounded-lg border border-white/[0.05] max-h-56 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1 select-text">
                {warningLines.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

