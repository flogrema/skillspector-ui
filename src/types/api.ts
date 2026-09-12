// Shared types for the IPC contract between preload and renderer.
// This file is imported by both src/ and electron/ code.

// ─── SkillSpector Status ───────────────────────────────────────────

export interface SkillSpectorStatus {
  found: boolean;
  path: string | null;
  version: string | null;
  pythonVersion: string | null;
}

// ─── Ollama ────────────────────────────────────────────────────────

export interface OllamaStatus {
  online: boolean;
  url: string;
}

export interface OllamaModel {
  name: string;
  parameterSize?: string;
  family?: string;
}

// ─── Scan Request / Response ───────────────────────────────────────

export interface ScanRequest {
  targetPath: string;
  recursive: boolean;
  llmEnabled: boolean;
  model?: string;
  ollamaUrl?: string;
}

export interface SingleScanRequest {
  skillPath: string;
  llmEnabled: boolean;
  model?: string;
  ollamaUrl?: string;
}

export type ExecutionStatus = 'completed' | 'failed' | 'cancelled';

export interface ProgressInfo {
  currentSkill?: string;
  skillIndex?: number;
  totalSkills?: number;
}

// ─── SkillSpector JSON Report Types ────────────────────────────────

export interface SkillInfo {
  name: string;
  source: string;
  scanned_at: string;
}

export interface RiskAssessment {
  score: number;
  severity: string;
  recommendation: string;
  max_issue_severity: string;
}

export interface Component {
  path: string;
  type: string;
  lines: number;
  executable: boolean;
  size_bytes: number;
  source_url: string | null;
  source_identity: string | null;
  source_digest: string | null;
}

export interface IssueLocation {
  file: string;
  start_line: number;
  end_line: number;
}

export interface Issue {
  id: string;
  finding_id: string;
  category: string | null;
  pattern: string | null;
  severity: string;
  confidence: number;
  location: IssueLocation;
  finding: string | null;
  explanation: string;
  remediation: string | null;
  code_snippet: string | null;
  intent: string | null;
  tags: string[];
  evidence: Record<string, unknown>;
  match_fingerprint: string | null;
  occurrences?: unknown[];
}

export interface LedgerException {
  outcome: string;
  phase: string;
  reason_code: string;
  message: string;
  path: string;
  start_line: number;
  end_line: number;
  fatal: boolean;
}

export interface AnalyzerStatus {
  analyzer_id: string;
  status: string;
  planned_work: number;
  completed: number;
  partial: number;
  skipped: number;
  failed: number;
  unaccounted: number;
  reason_code?: string;
  message?: string;
}

export interface AnalysisCompleteness {
  total_components: number;
  scanned_components: number;
  coverage_percent: number;
  is_complete: boolean;
  status: string;
  execution_successful: boolean;
  fully_inspected_files: number;
  partially_inspected_files: number;
  entirely_uninspected_files: number;
  ledger_exceptions: LedgerException[];
  scope_exclusions: unknown[];
  analyzer_statuses: AnalyzerStatus[];
  references?: unknown[];
  limitations?: unknown[];
}

export interface ReportMetadata {
  has_executable_scripts: boolean;
  skillspector_version: string;
  llm_requested: boolean;
  llm_available: boolean;
  meta_analysis_applied: boolean;
  inference_usage: unknown[];
  filtering_mode: string;
}

// Single skill report (from single-skill scan JSON output)
export interface SingleSkillReport {
  skill: SkillInfo;
  risk_assessment: RiskAssessment;
  components: Component[];
  structured_summaries: unknown[];
  issues: Issue[];
  suppressed_count: number;
  suppressed: unknown[];
  metadata: ReportMetadata;
  execution_successful: boolean;
  analysis_completeness: AnalysisCompleteness;
}

// Per-skill entry in a recursive scan report
export interface RecursiveSkillEntry {
  name: string;
  path: string;
  risk_score: number;
  risk_severity: string;
  finding_count: number;
  execution_successful: boolean;
  transitive_finding_count: number;
  transitive_sources: unknown[];
  // Full single-skill report fields (may or may not be present)
  skill?: SkillInfo;
  risk_assessment?: RiskAssessment;
  components?: Component[];
  structured_summaries?: unknown[];
  issues?: Issue[];
  suppressed_count?: number;
  suppressed?: unknown[];
  metadata?: ReportMetadata;
  analysis_completeness?: AnalysisCompleteness;
}

export interface RecursiveAnalysisCompleteness {
  is_complete: boolean;
  execution_successful: boolean;
  status: string;
  coverage_percent: number;
  fully_inspected_files: number;
  partially_inspected_files: number;
  entirely_uninspected_files: number;
  total_files: number;
  limitations: unknown[];
  scope: string;
}

// Recursive scan report (from recursive scan JSON output)
export interface RecursiveScanReport {
  multi_skill: true;
  skill_count: number;
  max_risk_score: number;
  execution_successful: boolean;
  risk_recommendation: string;
  analysis_completeness: RecursiveAnalysisCompleteness;
  skills_scanned: number;
  skills_omitted: number;
  public_finding_records: number;
  transitive_finding_count: number;
  transitive_sources: unknown[];
  skills: RecursiveSkillEntry[];
}

// ─── Normalized Result (internal application type) ──────────────────

export interface NormalizedSkillResult {
  name: string;
  path: string;
  sourcePath: string;
  score: number;
  severity: string;
  findingCount: number;
  executionSuccessful: boolean;
  recommendation?: string;
  // Detail data (may be null if only recursive summary was available)
  issues: Issue[] | null;
  inspectionWarnings: LedgerException[] | null;
  completeness: AnalysisCompleteness | null;
  components: Component[] | null;
  metadata: ReportMetadata | null;
}

export type CompletenessStatus = 'complete' | 'partial' | 'incomplete' | 'unknown';

export interface NormalizedScanResult {
  id: string;
  timestamp: string;
  targetPath: string;
  scanMode: 'single' | 'recursive';
  executionStatus: ExecutionStatus;
  skillspectorVersion: string;
  llmEnabled: boolean;
  model: string | null;
  // Summary metrics
  skillCount: number;
  maxScore: number;
  maxSeverity: string;
  totalFindings: number;
  recommendation: string;
  coveragePercent: number | null;
  completenessStatus?: CompletenessStatus;
  // Per-skill results
  skills: NormalizedSkillResult[];
  // Scan warnings (from stderr)
  scanWarnings: string[];
  // Raw output
  stdout: string;
  stderr: string;
}

// ─── History ────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  timestamp: string;
  targetPath: string;
  scanMode: 'single' | 'recursive';
  skillspectorVersion: string;
  llmEnabled: boolean;
  model: string | null;
  score: number;
  severity: string;
  findingsCount: number;
  skillCount: number;
  executionStatus: ExecutionStatus;
}

// ─── Settings ───────────────────────────────────────────────────────

export interface AppSettings {
  skillspectorPath: string | null;
  ollamaUrl: string;
  defaultModel: string | null;
  defaultRecursive: boolean;
  defaultLlmEnabled: boolean;
}

// ─── Favorites ──────────────────────────────────────────────────────

export interface Favorite {
  id: string;
  name: string;
  path: string;
  preferredMode: 'single' | 'recursive';
}

// ─── File Filter ────────────────────────────────────────────────────

export interface FileFilter {
  name: string;
  extensions: string[];
}

// ─── API Interface ──────────────────────────────────────────────────

export interface SkillSpectorAPI {
  // Native Dialogs
  selectFolder(): Promise<string | null>;
  selectFile(filters?: FileFilter[]): Promise<string | null>;
  saveFileDialog(defaultName: string, filters: FileFilter[]): Promise<string | null>;

  // SkillSpector Detection
  getSkillSpectorStatus(): Promise<SkillSpectorStatus>;
  testSkillSpectorPath(path: string): Promise<SkillSpectorStatus>;

  // Ollama
  getOllamaStatus(baseUrl?: string): Promise<OllamaStatus>;
  getOllamaModels(baseUrl?: string): Promise<OllamaModel[]>;

  // Scanning
  startScan(params: ScanRequest): Promise<{ scanId: string }>;
  cancelScan(scanId: string): Promise<void>;
  runSingleSkillScan(params: SingleScanRequest): Promise<NormalizedScanResult>;

  // Scan Event Listeners (return unsubscribe function)
  onScanStdout(cb: (scanId: string, line: string) => void): () => void;
  onScanStderr(cb: (scanId: string, line: string) => void): () => void;
  onScanProgress(cb: (scanId: string, info: ProgressInfo) => void): () => void;
  onScanComplete(cb: (scanId: string, result: NormalizedScanResult) => void): () => void;
  onScanCancelled(cb: (scanId: string) => void): () => void;
  onScanError(cb: (scanId: string, error: string) => void): () => void;

  // Settings
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  // History
  getHistoryIndex(): Promise<HistoryEntry[]>;
  getHistoryReport(id: string): Promise<NormalizedScanResult | null>;
  deleteHistoryEntry(id: string): Promise<void>;
  clearHistory(): Promise<void>;

  // Favorites
  getFavorites(): Promise<Favorite[]>;
  saveFavorite(fav: Favorite): Promise<Favorite[]>;
  deleteFavorite(id: string): Promise<Favorite[]>;

  // Safe Actions
  openFileInEditor(scanTargetDir: string, relativeFilePath: string): Promise<boolean>;
  exportReport(scanId: string, format: 'json', outputPath: string): Promise<boolean>;
  runScanAndExport(params: {
    targetPath: string;
    format: 'markdown' | 'sarif';
    outputPath: string;
    recursive: boolean;
    llmEnabled: boolean;
    model?: string;
    ollamaUrl?: string;
  }): Promise<boolean>;
  copyToClipboard(text: string): Promise<void>;
}

// Extend Window to include the API
declare global {
  interface Window {
    api: SkillSpectorAPI;
  }
}
