import React from 'react';
import {
  Shield,
  Layers,
  Terminal,
  RotateCcw,
  AlertCircle,
  FileSearch,
  CheckCircle2,
  Sparkles,
  FileDown,
} from 'lucide-react';
import { useScanStore } from '../stores/scanStore';
import { ScanConfig } from '../components/scan/ScanConfig';
import { ScanProgress } from '../components/scan/ScanProgress';
import { ScanSummary } from '../components/scan/ScanSummary';
import { ResultsTable } from '../components/scan/ResultsTable';
import { SkillDetail } from '../components/scan/SkillDetail';
import { RawOutput } from '../components/scan/RawOutput';
import { ExportModal } from '../components/scan/ExportModal';

export const ScanView: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const {
    activeResult,
    isScanning,
    scanError,
    clearScan,
    setIsRawOutputOpen,
  } = useScanStore();

  return (
    <div className="space-y-6">
      {/* 1. Scan Configuration */}
      <ScanConfig />

      {/* 2. Scanning Progress (Visible while scanning) */}
      <ScanProgress />

      {/* Error Banner if scan failed */}
      {scanError && (
        <div
          className="flex items-start justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 animate-in fade-in"
          role="alert"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-200">Scan Execution Failed</h4>
              <p className="mt-1 text-xs text-red-300/90 leading-relaxed font-mono">
                {scanError}
              </p>
              <div className="mt-2 flex items-center space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => setIsRawOutputOpen(true)}
                  className="font-medium underline hover:text-white"
                >
                  View full CLI error log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Scan Results (Summary & Table) */}
      {activeResult && (
        <div className="space-y-6">
          {/* Result Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Scan Report Metrics
              </span>
              <span className="font-mono text-xs text-zinc-500">
                ID: {activeResult.id.slice(0, 8)}...
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="flex items-center space-x-1.5 rounded-btn border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-all"
                title="Export report to file or clipboard"
              >
                <FileDown className="h-3.5 w-3.5 text-cyan-400" />
                <span>Export...</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRawOutputOpen(true)}
                className="flex items-center space-x-1.5 rounded-btn border border-white/[0.08] bg-elevated px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all"
                title="View process stdout/stderr"
              >
                <Terminal className="h-3.5 w-3.5 text-zinc-400" />
                <span>Process Logs</span>
              </button>

              <button
                type="button"
                onClick={clearScan}
                className="flex items-center space-x-1.5 rounded-btn border border-white/[0.08] bg-elevated px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-all"
                title="Clear current scan results"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Bento Grid Summary Cards */}
          <ScanSummary />

          {/* Dense Results Table */}
          <ResultsTable />
        </div>
      )}

      {/* Empty State / Welcome */}
      {!activeResult && !isScanning && !scanError && (
        <div className="surface-card p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
            <Shield className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">
            Ready to Inspect AI Agent Skills
          </h3>
          <p className="mt-2 text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Select a target directory containing agent skills or a single skill folder above.
            SkillSpector runs comprehensive static analysis, security policies, and optional LLM semantic evaluation.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl mx-auto text-left">
            <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-4">
              <FileSearch className="h-4 w-4 text-cyan-400 mb-2" />
              <div className="text-xs font-semibold text-white">Static Analyzers</div>
              <p className="text-[11px] text-zinc-500 mt-1">
                AST inspections, dangerous API usage, command injection, and permission escapes.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-4">
              <Sparkles className="h-4 w-4 text-cyan-400 mb-2" />
              <div className="text-xs font-semibold text-white">Ollama Semantic LLM</div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Intent verification and prompt injection detection via local models like Qwen 2.5 Coder.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-4">
              <Layers className="h-4 w-4 text-cyan-400 mb-2" />
              <div className="text-xs font-semibold text-white">Recursive Auditing</div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Audit entire repositories of skills in batch with per-skill breakdown and deep inspection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Skill Detail Viewer */}
      <SkillDetail />

      {/* Process Output Log Modal */}
      <RawOutput />

      {/* Export Report Modal */}
      {activeResult && (
        <ExportModal
          report={activeResult}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
};
