import React, { useState } from 'react';
import {
  X,
  FileDown,
  Copy,
  FileCode,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';
import { NormalizedScanResult } from '../../types/api';
import { useAppStore } from '../../stores/appStore';

interface ExportModalProps {
  report: NormalizedScanResult;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ report, isOpen, onClose }) => {
  const { setToast } = useAppStore();
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'copy' | 'markdown' | 'sarif'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (selectedFormat === 'copy') {
        const summary = [
          `# SkillSpector Scan Summary`,
          `Target: ${report.targetPath}`,
          `Date: ${new Date(report.timestamp).toLocaleString()}`,
          `Mode: ${report.scanMode}`,
          `Skills Scanned: ${report.skillCount}`,
          `Max Risk Score: ${report.maxScore}/100 (${report.maxSeverity})`,
          `Total Findings: ${report.totalFindings}`,
          `Coverage: ${report.coveragePercent !== null && report.coveragePercent !== undefined ? `${report.coveragePercent}%` : 'Unknown'}`,
          `Execution: ${report.executionStatus}`,
          ``,
          `## Discovered Skills:`,
          ...report.skills.map(
            (s) => `- ${s.name}: Score ${s.score}/100 | ${s.severity} | ${s.findingCount} findings | ${s.executionSuccessful ? 'OK' : 'FAIL'}`
          ),
        ].join('\n');

        if (window.api?.copyToClipboard) {
          await window.api.copyToClipboard(summary);
        } else {
          await navigator.clipboard.writeText(summary);
        }
        setCopied(true);
        setToast({ message: 'Summary copied to clipboard', type: 'success' });
        setTimeout(() => {
          setCopied(false);
          onClose();
        }, 1200);
        return;
      }

      if (selectedFormat === 'json') {
        const defaultName = `skillspector-${report.scanMode}-${new Date(report.timestamp).toISOString().slice(0, 10)}.json`;
        const outputPath = await window.api?.saveFileDialog(defaultName, [
          { name: 'JSON Reports', extensions: ['json'] },
        ]);
        if (!outputPath) {
          setIsExporting(false);
          return;
        }

        await window.api.exportReport(report.id, 'json', outputPath);
        setToast({ message: `JSON report exported to ${outputPath}`, type: 'success' });
        onClose();
        return;
      }

      // Markdown or SARIF requires a confirmed CLI scan
      if (selectedFormat === 'markdown' || selectedFormat === 'sarif') {
        const ext = selectedFormat === 'markdown' ? 'md' : 'sarif';
        const defaultName = `skillspector-${report.scanMode}-${new Date(report.timestamp).toISOString().slice(0, 10)}.${ext}`;
        const outputPath = await window.api?.saveFileDialog(defaultName, [
          { name: selectedFormat === 'markdown' ? 'Markdown Reports' : 'SARIF Reports', extensions: [ext] },
        ]);
        if (!outputPath) {
          setIsExporting(false);
          return;
        }

        await window.api.runScanAndExport({
          targetPath: report.targetPath,
          format: selectedFormat,
          outputPath,
          recursive: report.scanMode === 'recursive',
          llmEnabled: report.llmEnabled,
          model: report.model ?? undefined,
        });

        setToast({ message: `${selectedFormat.toUpperCase()} report exported to ${outputPath}`, type: 'success' });
        onClose();
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Export failed', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#121215] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-base font-bold text-white">
                Export Scan Report
              </h3>
              <p className="text-xs text-zinc-400">
                Choose format for {report.scanMode} scan ({report.skillCount} skill{report.skillCount === 1 ? '' : 's'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Format
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {/* JSON option */}
            <button
              type="button"
              onClick={() => setSelectedFormat('json')}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'json'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                  : 'border-white/[0.06] bg-[#0c0c0e] text-zinc-300 hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <FileCode className="h-4 w-4 text-cyan-400" />
                  <span>JSON Report</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Saved directly from stored data. No scan required.
              </p>
            </button>

            {/* Copy Summary option */}
            <button
              type="button"
              onClick={() => setSelectedFormat('copy')}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'copy'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                  : 'border-white/[0.06] bg-[#0c0c0e] text-zinc-300 hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <Copy className="h-4 w-4 text-cyan-400" />
                  <span>Copy Summary</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Markdown summary copied to your clipboard.
              </p>
            </button>

            {/* Markdown option */}
            <button
              type="button"
              onClick={() => setSelectedFormat('markdown')}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'markdown'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                  : 'border-white/[0.06] bg-[#0c0c0e] text-zinc-300 hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span>Markdown (.md)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  Runs Scan
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Official SkillSpector markdown document.
              </p>
            </button>

            {/* SARIF option */}
            <button
              type="button"
              onClick={() => setSelectedFormat('sarif')}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'sarif'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                  : 'border-white/[0.06] bg-[#0c0c0e] text-zinc-300 hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center space-x-2 text-xs font-bold">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span>SARIF (.sarif)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  Runs Scan
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Static Analysis Results Interchange Format.
              </p>
            </button>
          </div>
        </div>

        {/* Scan Confirmation Notice for Markdown/SARIF */}
        {(selectedFormat === 'markdown' || selectedFormat === 'sarif') && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-100">
                  This export format requires a new SkillSpector scan.
                </p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  SkillSpector will run using its native <code className="bg-black/30 px-1 rounded">--format {selectedFormat}</code> exporter.
                </p>
                <div className="text-[11px] font-mono text-zinc-400 pt-1">
                  Target: {report.targetPath}<br />
                  Mode: {report.scanMode} | LLM: {report.llmEnabled ? `enabled (${report.model})` : 'disabled (static)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-btn border border-white/[0.08] px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 rounded-btn bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-semibold text-black transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied!</span>
              </>
            ) : selectedFormat === 'markdown' || selectedFormat === 'sarif' ? (
              <>
                <FileDown className="h-3.5 w-3.5" />
                <span>Run Scan & Export</span>
              </>
            ) : selectedFormat === 'copy' ? (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Summary</span>
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" />
                <span>Save JSON</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
