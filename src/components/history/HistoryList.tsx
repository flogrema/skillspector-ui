import React, { useState, useEffect } from 'react';
import {
  Clock,
  Trash2,
  GitCompare,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  Layers,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { HistoryEntry, NormalizedScanResult } from '../../types/api';
import { useScanStore } from '../../stores/scanStore';
import { useAppStore } from '../../stores/appStore';
import {
  formatDate,
  getSeverityBadge,
  getExecutionStatusBadge,
  formatPath,
  getScoreTextColor,
} from '../../lib/formatters';
import { ScanComparison } from './ScanComparison';

export const HistoryList: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonReports, setComparisonReports] = useState<{
    scanA: NormalizedScanResult;
    scanB: NormalizedScanResult;
  } | null>(null);

  const { loadResult } = useScanStore();
  const { setActiveView, setToast } = useAppStore();

  const fetchHistory = async () => {
    if (!window.api?.getHistoryIndex) return;
    setLoading(true);
    try {
      const index = await window.api.getHistoryIndex();
      setHistory(index || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleOpenScan = async (id: string) => {
    if (!window.api?.getHistoryReport) return;
    try {
      const report = await window.api.getHistoryReport(id);
      if (report) {
        loadResult(report);
        setActiveView('scan');
      } else {
        setToast({ message: 'Could not load scan report', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to open scan report:', err);
      setToast({ message: 'Error opening scan report', type: 'error' });
    }
  };

  const handleDeleteScan = async (id: string) => {
    if (!window.api?.deleteHistoryEntry) return;
    try {
      await window.api.deleteHistoryEntry(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      setSelectedForCompare((prev) => prev.filter((i) => i !== id));
      setToast({ message: 'Scan removed from history', type: 'info' });
    } catch (err) {
      console.error('Failed to delete scan:', err);
      setToast({ message: 'Failed to delete scan', type: 'error' });
    }
  };

  const handleClearAll = async () => {
    if (!window.api?.clearHistory) return;
    if (window.confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
      try {
        await window.api.clearHistory();
        setHistory([]);
        setSelectedForCompare([]);
        setToast({ message: 'History cleared', type: 'info' });
      } catch (err) {
        console.error('Failed to clear history:', err);
        setToast({ message: 'Failed to clear history', type: 'error' });
      }
    }
  };

  const toggleSelectCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        // Replace second
        return [prev[0], id];
      }
      return [...prev, id];
    });
  };

  const handleLaunchCompare = async () => {
    if (selectedForCompare.length !== 2 || !window.api?.getHistoryReport) return;
    try {
      const [scanA, scanB] = await Promise.all([
        window.api.getHistoryReport(selectedForCompare[0]),
        window.api.getHistoryReport(selectedForCompare[1]),
      ]);

      if (scanA && scanB) {
        setComparisonReports({ scanA, scanB });
      } else {
        setToast({ message: 'Failed to load both reports for comparison', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to compare scans:', err);
      setToast({ message: 'Error loading comparison reports', type: 'error' });
    }
  };

  const filteredHistory = history.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.targetPath.toLowerCase().includes(q) ||
      (item.model || '').toLowerCase().includes(q) ||
      (item.severity || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Action and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 surface-card p-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history by target path, model..."
            className="w-full rounded-input border border-white/[0.08] bg-[#09090b] pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          />
        </div>

        <div className="flex items-center space-x-2">
          {selectedForCompare.length === 2 && (
            <button
              type="button"
              onClick={handleLaunchCompare}
              className="flex items-center space-x-1.5 rounded-btn bg-cyan-500/20 border border-cyan-500/40 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-sm"
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Compare Selected (2)</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 rounded-btn border border-white/[0.08] bg-elevated px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0d0d0f] text-zinc-400">
                <th scope="col" className="px-3 py-3 w-10 text-center">
                  Compare
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Timestamp
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Target Path
                </th>
                <th scope="col" className="px-3 py-3 font-semibold text-center">
                  Mode
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  LLM / Model
                </th>
                <th scope="col" className="px-3 py-3 font-semibold text-right">
                  Score
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Severity
                </th>
                <th scope="col" className="px-3 py-3 font-semibold text-center">
                  Findings
                </th>
                <th scope="col" className="px-3 py-3 font-semibold text-center">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    Loading scan history...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="h-8 w-8 text-zinc-600" />
                      <span>No scan history recorded yet</span>
                      <p className="text-[11px] text-zinc-600 max-w-sm">
                        Scans performed will automatically appear here with their risk metrics.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const severityBadge = getSeverityBadge(item.severity);
                  const SeverityIcon = severityBadge.icon;
                  const statusBadge = getExecutionStatusBadge(item.executionStatus);
                  const isChecked = selectedForCompare.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Compare Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectCompare(item.id)}
                          className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/50"
                          title="Select to compare"
                        />
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-300">
                        {formatDate(item.timestamp)}
                      </td>

                      {/* Target Path */}
                      <td className="px-4 py-3 font-medium text-white max-w-xs truncate" title={item.targetPath}>
                        {formatPath(item.targetPath, 35)}
                      </td>

                      {/* Mode */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-zinc-300 uppercase">
                          {item.scanMode}
                        </span>
                      </td>

                      {/* LLM / Model */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.llmEnabled ? (
                          <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-cyan-400">
                            <Sparkles className="h-3 w-3" />
                            <span>{item.model || 'LLM On'}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-mono text-[11px]">Static only</span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="px-3 py-3 text-right font-mono font-bold">
                        <span className={getScoreTextColor(item.score)}>
                          {Math.round(item.score ?? 0)}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-normal">/100</span>
                      </td>

                      {/* Severity */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityBadge.badgeClass}`}
                        >
                          <SeverityIcon className="h-3 w-3" />
                          <span>{severityBadge.label}</span>
                        </span>
                      </td>

                      {/* Findings */}
                      <td className="px-3 py-3 text-center font-mono font-semibold">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] ${
                            item.findingsCount > 0
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {item.findingsCount}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.badgeClass}`}
                        >
                          <span>{statusBadge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenScan(item.id)}
                            className="flex items-center space-x-1 rounded-md bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white transition-colors"
                            title="Open scan report in viewer"
                          >
                            <Eye className="h-3 w-3 text-cyan-400" />
                            <span>Open</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteScan(item.id)}
                            className="rounded-md p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Delete scan record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side comparison modal if triggered */}
      {comparisonReports && (
        <ScanComparison
          scanA={comparisonReports.scanA}
          scanB={comparisonReports.scanB}
          onClose={() => setComparisonReports(null)}
        />
      )}
    </div>
  );
};
