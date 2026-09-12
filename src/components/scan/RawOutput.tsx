import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, AlertCircle } from 'lucide-react';
import { useScanStore } from '../../stores/scanStore';

export const RawOutput: React.FC = () => {
  const { isRawOutputOpen, setIsRawOutputOpen, rawStdoutLines, rawStderrLines, activeResult } =
    useScanStore();
  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr'>('stdout');
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRawOutputOpen) {
        setIsRawOutputOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRawOutputOpen, setIsRawOutputOpen]);

  if (!isRawOutputOpen) return null;

  const stdoutText =
    rawStdoutLines.length > 0 ? rawStdoutLines.join('\n') : activeResult?.stdout || '';
  const stderrText =
    rawStderrLines.length > 0 ? rawStderrLines.join('\n') : activeResult?.stderr || '';

  const activeContent = activeTab === 'stdout' ? stdoutText : stderrText;

  const handleCopyAll = async () => {
    if (window.api?.copyToClipboard) {
      await window.api.copyToClipboard(activeContent);
    } else {
      await navigator.clipboard.writeText(activeContent);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="raw-output-title"
    >
      <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-white/[0.1] bg-[#0c0c0e] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-surface px-5 py-3.5">
          <div className="flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <h3 id="raw-output-title" className="text-sm font-bold text-white">
              SkillSpector CLI Process Logs
            </h3>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={() => setIsRawOutputOpen(false)}
            className="rounded-btn p-1 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            aria-label="Close raw output modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar & Copy Action */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#111114] px-5 py-2">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('stdout')}
              className={`rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-all ${
                activeTab === 'stdout'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              stdout ({stdoutText ? stdoutText.split('\n').length : 0} lines)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stderr')}
              className={`rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-all ${
                activeTab === 'stderr'
                  ? 'bg-red-500/20 text-red-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              stderr ({stderrText ? stderrText.split('\n').length : 0} lines)
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center space-x-1.5 rounded-btn bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-zinc-400" />
                <span>Copy All</span>
              </>
            )}
          </button>
        </div>

        {/* Monospace Log Viewer */}
        <div className="flex-1 overflow-auto bg-[#08080a] p-4 font-mono text-xs leading-relaxed text-zinc-300 select-text">
          {activeContent.trim() ? (
            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-zinc-300">
              {activeContent}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <Terminal className="h-8 w-8 mb-2 opacity-50" />
              <span>No {activeTab} output recorded for this scan.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
