import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { HistoryEntry, NormalizedScanResult } from '../types';

function getHistoryDir(): string {
  const dir = path.join(app.getPath('userData'), 'history');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getScansDir(): string {
  const dir = path.join(getHistoryDir(), 'scans');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getIndexFilePath(): string {
  return path.join(getHistoryDir(), 'index.json');
}

function sanitizeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Reads history index, returning entries sorted newest first.
 */
export async function getHistoryIndex(): Promise<HistoryEntry[]> {
  const indexPath = getIndexFilePath();
  try {
    if (!fs.existsSync(indexPath)) {
      return [];
    }
    const content = await fs.promises.readFile(indexPath, 'utf8');
    if (!content.trim()) {
      return [];
    }
    const entries = JSON.parse(content) as HistoryEntry[];
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Saves a scan result: lightweight entry to index.json, full report to scans/<id>.json.
 */
export async function saveScanToHistory(report: NormalizedScanResult): Promise<void> {
  if (!sanitizeId(report.id)) {
    throw new Error('Invalid scan ID format');
  }

  const scansDir = getScansDir();
  const scanReportPath = path.join(scansDir, `${report.id}.json`);
  const tempScanPath = `${scanReportPath}.tmp-${Date.now()}`;

  // 1. Write full report
  await fs.promises.writeFile(tempScanPath, JSON.stringify(report, null, 2), 'utf8');
  await fs.promises.rename(tempScanPath, scanReportPath);

  // 2. Create lightweight HistoryEntry
  const entry: HistoryEntry = {
    id: report.id,
    timestamp: report.timestamp,
    targetPath: report.targetPath,
    scanMode: report.scanMode,
    skillspectorVersion: report.skillspectorVersion,
    llmEnabled: report.llmEnabled,
    model: report.model,
    score: report.maxScore,
    severity: report.maxSeverity,
    findingsCount: report.totalFindings,
    skillCount: report.skillCount,
    executionStatus: report.executionStatus,
  };

  // 3. Update index.json
  const currentEntries = await getHistoryIndex();
  const filtered = currentEntries.filter((e) => e.id !== entry.id);
  filtered.unshift(entry);

  const indexPath = getIndexFilePath();
  const tempIndexPath = `${indexPath}.tmp-${Date.now()}`;
  await fs.promises.writeFile(tempIndexPath, JSON.stringify(filtered, null, 2), 'utf8');
  await fs.promises.rename(tempIndexPath, indexPath);
}

/**
 * Retrieves full scan report by ID from history/scans/<id>.json.
 */
export async function getHistoryReport(id: string): Promise<NormalizedScanResult | null> {
  if (!sanitizeId(id)) {
    return null;
  }
  const scanReportPath = path.join(getScansDir(), `${id}.json`);
  try {
    if (!fs.existsSync(scanReportPath)) {
      return null;
    }
    const content = await fs.promises.readFile(scanReportPath, 'utf8');
    return JSON.parse(content) as NormalizedScanResult;
  } catch {
    return null;
  }
}

/**
 * Deletes a single history entry from index and scans/.
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  if (!sanitizeId(id)) {
    return;
  }

  // Remove from index
  const currentEntries = await getHistoryIndex();
  const filtered = currentEntries.filter((e) => e.id !== id);
  const indexPath = getIndexFilePath();
  const tempIndexPath = `${indexPath}.tmp-${Date.now()}`;
  await fs.promises.writeFile(tempIndexPath, JSON.stringify(filtered, null, 2), 'utf8');
  await fs.promises.rename(tempIndexPath, indexPath);

  // Delete scan file
  const scanReportPath = path.join(getScansDir(), `${id}.json`);
  if (fs.existsSync(scanReportPath)) {
    try {
      await fs.promises.unlink(scanReportPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Clears all history entries and scan files.
 */
export async function clearHistory(): Promise<void> {
  // Clear index atomically
  const indexPath = getIndexFilePath();
  const tempIndexPath = `${indexPath}.tmp-${Date.now()}`;
  await fs.promises.writeFile(tempIndexPath, JSON.stringify([], null, 2), 'utf8');
  await fs.promises.rename(tempIndexPath, indexPath);

  // Remove all files in scans directory
  const scansDir = getScansDir();
  try {
    const files = await fs.promises.readdir(scansDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          await fs.promises.unlink(path.join(scansDir, file));
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}
