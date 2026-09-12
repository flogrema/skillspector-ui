import { app } from 'electron';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type {
  AnalysisCompleteness,
  Component,
  ExecutionStatus,
  Issue,
  LedgerException,
  NormalizedScanResult,
  NormalizedSkillResult,
  ProgressInfo,
  RecursiveScanReport,
  RecursiveSkillEntry,
  ReportMetadata,
  ScanRequest,
  SingleScanRequest,
  SingleSkillReport,
} from '../types';
import { detectSkillSpector } from './detector';
import { saveScanToHistory } from './history';
import { getSettings } from './storage';
import {
  deriveRecursiveCompleteness,
  deriveSingleSkillCompleteness,
} from './completeness';

interface ActiveScan {
  scanId: string;
  pid?: number;
  cancelled: boolean;
  tempJsonPath: string;
}

const activeScans = new Map<string, ActiveScan>();

export interface ScanCallbacks {
  onStdout?: (scanId: string, line: string) => void;
  onStderr?: (scanId: string, line: string) => void;
  onProgress?: (scanId: string, info: ProgressInfo) => void;
  onComplete?: (scanId: string, result: NormalizedScanResult) => void;
  onCancelled?: (scanId: string) => void;
  onError?: (scanId: string, error: string) => void;
}

export function normalizeScanResult(params: {
  id: string;
  timestamp: string;
  targetPath: string;
  scanMode: 'single' | 'recursive';
  executionStatus: ExecutionStatus;
  skillspectorVersion: string;
  llmEnabled: boolean;
  model: string | null;
  rawReport: unknown | null;
  scanWarnings: string[];
  stdout: string;
  stderr: string;
}): NormalizedScanResult {
  const {
    id,
    timestamp,
    targetPath,
    scanMode,
    executionStatus,
    skillspectorVersion,
    llmEnabled,
    model,
    rawReport,
    scanWarnings,
    stdout,
    stderr,
  } = params;

  if (executionStatus !== 'completed' || !rawReport || typeof rawReport !== 'object') {
    return {
      id,
      timestamp,
      targetPath,
      scanMode,
      executionStatus,
      skillspectorVersion,
      llmEnabled,
      model,
      skillCount: 0,
      maxScore: 0,
      maxSeverity: 'NONE',
      totalFindings: 0,
      recommendation: '',
      coveragePercent: executionStatus === 'failed' ? 0 : null,
      completenessStatus: executionStatus === 'failed' ? 'incomplete' : 'unknown',
      skills: [],
      scanWarnings,
      stdout,
      stderr,
    };
  }

  const rawObj = rawReport as Record<string, unknown>;
  const isRecursive = rawObj.multi_skill === true || Array.isArray(rawObj.skills);

  if (isRecursive) {
    const report = rawReport as RecursiveScanReport;
    const skills: NormalizedSkillResult[] = (report.skills || []).map((entry: RecursiveSkillEntry) => {
      const score = entry.risk_score ?? entry.risk_assessment?.score ?? 0;
      const severity = entry.risk_severity || entry.risk_assessment?.severity || 'NONE';
      const findingCount = entry.finding_count ?? entry.issues?.length ?? 0;
      const executionSuccessful = entry.execution_successful ?? true;
      const recommendation = entry.risk_assessment?.recommendation;

      return {
        name: entry.name || path.basename(entry.path || targetPath),
        path: entry.path || targetPath,
        sourcePath: entry.skill?.source || entry.path || targetPath,
        score,
        severity,
        findingCount,
        executionSuccessful,
        recommendation,
        issues: entry.issues ?? null,
        inspectionWarnings: entry.analysis_completeness?.ledger_exceptions ?? null,
        completeness: entry.analysis_completeness ?? null,
        components: entry.components ?? null,
        metadata: entry.metadata ?? null,
      };
    });

    // Determine max severity
    const severityRanks: Record<string, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFORMATIONAL: 1,
      INFO: 1,
      NONE: 0,
    };
    let maxSeverity = 'NONE';
    let maxRank = 0;
    for (const s of skills) {
      const rank = severityRanks[s.severity.toUpperCase()] ?? 0;
      if (rank > maxRank) {
        maxRank = rank;
        maxSeverity = s.severity;
      }
    }

    const totalFindings =
      report.public_finding_records ?? skills.reduce((sum, s) => sum + s.findingCount, 0);

    const maxScore =
      report.max_risk_score ?? (skills.length > 0 ? Math.max(...skills.map((s) => s.score)) : 0);

    const completeness = deriveRecursiveCompleteness({
      reportCompleteness: report.analysis_completeness,
      skills,
      totalSkillsExpected: report.skill_count,
      skillsOmitted: report.skills_omitted ?? 0,
    });

    return {
      id,
      timestamp,
      targetPath,
      scanMode: 'recursive',
      executionStatus: 'completed',
      skillspectorVersion,
      llmEnabled,
      model,
      skillCount: skills.length > 0 ? skills.length : (report.skill_count ?? 0),
      maxScore,
      maxSeverity,
      totalFindings,
      recommendation: report.risk_recommendation || '',
      coveragePercent: completeness.coveragePercent,
      completenessStatus: completeness.completenessStatus,
      skills,
      scanWarnings,
      stdout,
      stderr,
    };
  }

  // Single skill report
  const report = rawReport as SingleSkillReport;
  const findingCount = Array.isArray(report.issues) ? report.issues.length : 0;
  const score = report.risk_assessment?.score ?? 0;
  const severity = report.risk_assessment?.severity ?? 'NONE';
  const recommendation = report.risk_assessment?.recommendation ?? '';

  const skillName = report.skill?.name || path.basename(targetPath);
  const sourcePath = report.skill?.source || targetPath;

  const skillResult: NormalizedSkillResult = {
    name: skillName,
    path: targetPath,
    sourcePath,
    score,
    severity,
    findingCount,
    executionSuccessful: report.execution_successful ?? true,
    recommendation,
    issues: report.issues || [],
    inspectionWarnings: report.analysis_completeness?.ledger_exceptions || [],
    completeness: report.analysis_completeness || null,
    components: report.components || [],
    metadata: report.metadata || null,
  };

  const completeness = deriveSingleSkillCompleteness(
    report.execution_successful ?? true,
    report.analysis_completeness
  );

  return {
    id,
    timestamp,
    targetPath,
    scanMode: 'single',
    executionStatus: 'completed',
    skillspectorVersion: report.metadata?.skillspector_version || skillspectorVersion,
    llmEnabled,
    model,
    skillCount: 1,
    maxScore: score,
    maxSeverity: severity,
    totalFindings: findingCount,
    recommendation,
    coveragePercent: completeness.coveragePercent,
    completenessStatus: completeness.completenessStatus,
    skills: [skillResult],
    scanWarnings,
    stdout,
    stderr,
  };
}

/**
 * Execute scan with SkillSpector CLI
 */
async function executeScan(
  scanId: string,
  request: {
    targetPath: string;
    recursive: boolean;
    llmEnabled: boolean;
    model?: string;
    ollamaUrl?: string;
  },
  callbacks?: ScanCallbacks
): Promise<NormalizedScanResult> {
  const timestamp = new Date().toISOString();
  const settings = await getSettings();

  // Resolve executable
  const detection = await detectSkillSpector(settings.skillspectorPath ?? undefined);
  if (!detection.found || !detection.path) {
    const errorMsg = 'SkillSpector executable not found. Please check your settings.';
    callbacks?.onError?.(scanId, errorMsg);
    return normalizeScanResult({
      id: scanId,
      timestamp,
      targetPath: request.targetPath,
      scanMode: request.recursive ? 'recursive' : 'single',
      executionStatus: 'failed',
      skillspectorVersion: 'unknown',
      llmEnabled: request.llmEnabled,
      model: request.model ?? null,
      rawReport: null,
      scanWarnings: [],
      stdout: '',
      stderr: errorMsg,
    });
  }

  const skillspectorPath = detection.path;
  const skillspectorVersion = detection.version || 'v2.11.2';
  const tempJsonPath = path.join(app.getPath('temp'), `skillspector-${randomUUID()}.json`);

  const activeScan: ActiveScan = {
    scanId,
    cancelled: false,
    tempJsonPath,
  };
  activeScans.set(scanId, activeScan);

  const args = ['scan', request.targetPath, '--format', 'json', '--output', tempJsonPath];
  if (request.recursive) {
    args.push('--recursive');
  }
  if (!request.llmEnabled) {
    args.push('--no-llm');
  }

  const processEnv: Record<string, string | undefined> = { ...process.env };
  if (request.llmEnabled) {
    processEnv.SKILLSPECTOR_PROVIDER = 'ollama';
    const chosenModel = request.model || settings.defaultModel || 'qwen2.5-coder:14b';
    processEnv.SKILLSPECTOR_MODEL = chosenModel;
    const ollamaUrl = request.ollamaUrl || settings.ollamaUrl || 'http://localhost:11434';
    if (ollamaUrl.replace(/\/+$/, '') !== 'http://localhost:11434') {
      processEnv.OLLAMA_BASE_URL = `${ollamaUrl.replace(/\/+$/, '')}/v1`;
    }
  }

  let rawStdout = '';
  let rawStderr = '';
  const scanWarnings: string[] = [];
  const stderrLines: string[] = [];

  let stdoutLineBuffer = '';
  let stderrLineBuffer = '';

  function processStdoutLine(line: string) {
    rawStdout += `${line}\n`;
    callbacks?.onStdout?.(scanId, line);

    // Parse progress e.g. "[1/7] Scanning <name>"
    const progressMatch = line.match(/\[(\d+)\/(\d+)\]\s+Scanning\s+(.+)/i);
    if (progressMatch) {
      const info: ProgressInfo = {
        skillIndex: parseInt(progressMatch[1], 10),
        totalSkills: parseInt(progressMatch[2], 10),
        currentSkill: progressMatch[3].trim(),
      };
      callbacks?.onProgress?.(scanId, info);
    }
  }

  function processStderrLine(line: string) {
    rawStderr += `${line}\n`;
    stderrLines.push(line);
    callbacks?.onStderr?.(scanId, line);

    // Stderr parsing: extract lines matching WARNING [skillspector.*]
    if (/WARNING\s+\[skillspector[.\w]*\]/i.test(line)) {
      scanWarnings.push(line.trim());
    }
  }

  try {
    const child = spawn(skillspectorPath, args, {
      shell: false,
      env: processEnv as NodeJS.ProcessEnv,
      windowsHide: true,
    });

    activeScan.pid = child.pid;

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutLineBuffer += chunk.toString('utf8');
      const lines = stdoutLineBuffer.split(/\r?\n/);
      stdoutLineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length > 0) {
          processStdoutLine(line);
        }
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrLineBuffer += chunk.toString('utf8');
      const lines = stderrLineBuffer.split(/\r?\n/);
      stderrLineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length > 0) {
          processStderrLine(line);
        }
      }
    });

    await new Promise<void>((resolve) => {
      child.on('error', () => {
        resolve();
      });
      child.on('close', () => {
        resolve();
      });
    });

    // Flush any remaining line fragments
    if (stdoutLineBuffer.length > 0) {
      processStdoutLine(stdoutLineBuffer);
    }
    if (stderrLineBuffer.length > 0) {
      processStderrLine(stderrLineBuffer);
    }

    // Determine execution status
    let executionStatus: ExecutionStatus = 'failed';
    let rawReport: unknown = null;

    if (activeScan.cancelled) {
      executionStatus = 'cancelled';
      callbacks?.onCancelled?.(scanId);
    } else if (fs.existsSync(tempJsonPath)) {
      try {
        const fileContent = await fs.promises.readFile(tempJsonPath, 'utf8');
        if (fileContent.trim().length > 0) {
          rawReport = JSON.parse(fileContent);
          executionStatus = 'completed';
        }
      } catch {
        executionStatus = 'failed';
      }
    }

    if (executionStatus === 'failed' && !activeScan.cancelled) {
      const errorMsg =
        stderrLines.filter((l) => !l.includes('WARNING [skillspector')).join('\n').trim() ||
        'Scan failed to produce a valid report';
      callbacks?.onError?.(scanId, errorMsg);
    }

    const normalizedResult = normalizeScanResult({
      id: scanId,
      timestamp,
      targetPath: request.targetPath,
      scanMode: request.recursive ? 'recursive' : 'single',
      executionStatus,
      skillspectorVersion,
      llmEnabled: request.llmEnabled,
      model: request.model ?? null,
      rawReport,
      scanWarnings,
      stdout: rawStdout,
      stderr: rawStderr,
    });

    if (executionStatus === 'completed') {
      callbacks?.onComplete?.(scanId, normalizedResult);
      // Persist to history
      try {
        await saveScanToHistory(normalizedResult);
      } catch {
        // ignore history write errors
      }
    }

    return normalizedResult;
  } finally {
    activeScans.delete(scanId);
    if (fs.existsSync(tempJsonPath)) {
      try {
        await fs.promises.unlink(tempJsonPath);
      } catch {
        // ignore unlink error
      }
    }
  }
}

/**
 * Start a scan asynchronously and stream events via callbacks.
 */
export async function startScan(
  params: ScanRequest,
  callbacks?: ScanCallbacks
): Promise<{ scanId: string }> {
  const scanId = randomUUID();

  // Run execution in background
  executeScan(scanId, params, callbacks).catch((err) => {
    callbacks?.onError?.(scanId, err instanceof Error ? err.message : String(err));
  });

  return { scanId };
}

/**
 * Cancel an active scan process using taskkill.
 */
export async function cancelScan(scanId: string): Promise<void> {
  const active = activeScans.get(scanId);
  if (!active) return;

  active.cancelled = true;
  if (active.pid) {
    try {
      const killer = spawn('taskkill', ['/PID', String(active.pid), '/T', '/F'], {
        shell: false,
        windowsHide: true,
      });
      await new Promise<void>((resolve) => {
        killer.on('close', () => resolve());
        killer.on('error', () => resolve());
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Runs a single-skill scan against skillPath with --format json --output tempFile.
 * Used for both direct single-skill scans and transparent recursive detail fallback.
 */
export async function runSingleSkillScan(
  params: SingleScanRequest,
  callbacks?: ScanCallbacks
): Promise<NormalizedScanResult> {
  const scanId = randomUUID();
  return executeScan(
    scanId,
    {
      targetPath: params.skillPath,
      recursive: false,
      llmEnabled: params.llmEnabled,
      model: params.model,
      ollamaUrl: params.ollamaUrl,
    },
    callbacks
  );
}
