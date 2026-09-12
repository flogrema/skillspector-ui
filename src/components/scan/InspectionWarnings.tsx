import React, { useState } from 'react';
import {
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  ExternalLink,
} from 'lucide-react';
import { LedgerException } from '../../types/api';

interface InspectionWarningsProps {
  warnings: LedgerException[] | null | undefined;
  targetDir?: string;
}

export const InspectionWarnings: React.FC<InspectionWarningsProps> = ({
  warnings,
  targetDir,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!warnings || warnings.length === 0) {
    return null;
  }

  const handleOpenFile = async (file: string) => {
    if (targetDir && window.api?.openFileInEditor) {
      await window.api.openFileInEditor(targetDir, file);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] overflow-hidden">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/20 bg-amber-500/10">
        <div className="flex items-center space-x-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Inspection Warnings ({warnings.length})
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded p-1 text-amber-400 hover:bg-amber-500/20 transition-colors"
          aria-label={isOpen ? 'Collapse warnings' : 'Expand warnings'}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Critical Mandatory Disclaimer */}
      <div className="flex items-start space-x-2 px-4 py-2.5 bg-amber-500/[0.07] border-b border-amber-500/15 text-[11px] text-amber-200/90 leading-relaxed">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          Inspection warnings indicate incomplete or ambiguous analysis and are not necessarily
          security vulnerabilities.
        </span>
      </div>

      {/* Warning Items Table */}
      {isOpen && (
        <div className="p-3 space-y-2 text-xs">
          {warnings.map((warn, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-white/[0.06] bg-[#0c0c0e] p-3 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                    {warn.reason_code || warn.outcome || 'INSPECTION_LIMITATION'}
                  </span>
                  {warn.phase && (
                    <span className="text-[11px] text-zinc-400">
                      phase: <span className="font-mono text-zinc-300">{warn.phase}</span>
                    </span>
                  )}
                  {warn.fatal && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.2 text-[10px] font-bold text-red-400">
                      FATAL
                    </span>
                  )}
                </div>

                {warn.path && (
                  <div className="flex items-center space-x-1.5 font-mono text-[11px] text-zinc-400">
                    <FileQuestion className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="truncate max-w-xs" title={warn.path}>
                      {warn.path}
                      {warn.start_line > 0 && `:${warn.start_line}`}
                    </span>
                    {targetDir && (
                      <button
                        type="button"
                        onClick={() => handleOpenFile(warn.path)}
                        className="ml-1 text-cyan-400 hover:text-cyan-300"
                        title="Open file in editor"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-zinc-300 font-sans text-[11px] leading-relaxed pl-1">
                {warn.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
