import { create } from 'zustand';
import {
  NormalizedScanResult,
  NormalizedSkillResult,
  ProgressInfo,
  ScanRequest,
  SingleScanRequest,
} from '../types/api';
import { FilterOption, SortState } from '../types/skillspector';
import { useAppStore } from './appStore';

interface ScanState {
  // Config
  targetPath: string;
  recursive: boolean;
  llmEnabled: boolean;
  model: string;
  recentPaths: string[];

  // Scan execution
  isScanning: boolean;
  scanId: string | null;
  elapsedSeconds: number;
  progressInfo: ProgressInfo | null;
  scanError: string | null;

  // Scan results
  activeResult: NormalizedScanResult | null;
  selectedSkill: NormalizedSkillResult | null;
  singleSkillDetailCache: Record<string, NormalizedSkillResult>;
  detailLoading: boolean;

  // Logs
  rawStdoutLines: string[];
  rawStderrLines: string[];
  isRawOutputOpen: boolean;

  // Table controls
  filter: FilterOption;
  sort: SortState;

  // Actions
  setTargetPath: (path: string) => void;
  setRecursive: (recursive: boolean) => void;
  setLlmEnabled: (enabled: boolean) => void;
  setModel: (model: string) => void;
  setFilter: (filter: FilterOption) => void;
  setSort: (column: string) => void;
  setIsRawOutputOpen: (open: boolean) => void;
  startScan: () => Promise<void>;
  cancelScan: () => Promise<void>;
  selectSkillForDetail: (skill: NormalizedSkillResult, rootTargetPath?: string) => Promise<void>;
  closeSkillDetail: () => void;
  rescanSingleSkill: (skillPath: string) => Promise<void>;
  loadResult: (result: NormalizedScanResult) => void;
  clearScan: () => void;
  addRecentPath: (path: string) => void;
}

// Store listeners unsubscribe callbacks outside reactive state
let cleanupListeners: (() => void) | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;

const RECENT_PATHS_KEY = 'skillspector_recent_paths';

function getStoredRecentPaths(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_PATHS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRecentPaths(paths: string[]) {
  try {
    localStorage.setItem(RECENT_PATHS_KEY, JSON.stringify(paths.slice(0, 10)));
  } catch {
    // Ignore localStorage errors
  }
}

export const useScanStore = create<ScanState>((set, get) => ({
  // Config defaults
  targetPath: '',
  recursive: false,
  llmEnabled: false,
  model: '',
  recentPaths: getStoredRecentPaths(),

  // Execution
  isScanning: false,
  scanId: null,
  elapsedSeconds: 0,
  progressInfo: null,
  scanError: null,

  // Results
  activeResult: null,
  selectedSkill: null,
  singleSkillDetailCache: {},
  detailLoading: false,

  // Logs
  rawStdoutLines: [],
  rawStderrLines: [],
  isRawOutputOpen: false,

  // Table controls
  filter: 'all',
  sort: { column: 'score', direction: 'desc' },

  setTargetPath: (path: string) => set({ targetPath: path }),
  setRecursive: (recursive: boolean) => set({ recursive }),
  setLlmEnabled: (enabled: boolean) => set({ llmEnabled: enabled }),
  setModel: (model: string) => set({ model }),
  setFilter: (filter: FilterOption) => set({ filter }),

  setSort: (column: string) => {
    const currentSort = get().sort;
    if (currentSort.column === column) {
      set({
        sort: {
          column,
          direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
        },
      });
    } else {
      // Default to descending for numbers/findings, asc for text
      const defaultDesc = ['score', 'findingCount', 'warnings'].includes(column);
      set({
        sort: {
          column,
          direction: defaultDesc ? 'desc' : 'asc',
        },
      });
    }
  },

  setIsRawOutputOpen: (open: boolean) => set({ isRawOutputOpen: open }),

  addRecentPath: (path: string) => {
    if (!path || !path.trim()) return;
    const clean = path.trim();
    const updated = [clean, ...get().recentPaths.filter((p) => p !== clean)].slice(0, 10);
    set({ recentPaths: updated });
    saveRecentPaths(updated);
  },

  startScan: async () => {
    const state = get();
    if (state.isScanning || !state.targetPath) return;

    if (!window.api) {
      set({ scanError: 'API not available in current window' });
      return;
    }

    // Stop existing timers / listeners
    if (cleanupListeners) {
      cleanupListeners();
      cleanupListeners = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    get().addRecentPath(state.targetPath);

    // Reset scan state — scanId starts null, set after IPC returns
    set({
      isScanning: true,
      scanId: null,
      elapsedSeconds: 0,
      progressInfo: null,
      scanError: null,
      activeResult: null,
      selectedSkill: null,
      rawStdoutLines: [],
      rawStderrLines: [],
    });

    // Start timer
    timerInterval = setInterval(() => {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
    }, 1000);

    try {
      const selectedModel = state.model || useAppStore.getState().selectedModel;
      const request: ScanRequest = {
        targetPath: state.targetPath,
        recursive: state.recursive,
        llmEnabled: state.llmEnabled,
        model: state.llmEnabled && selectedModel ? selectedModel : undefined,
        ollamaUrl: useAppStore.getState().appSettings?.ollamaUrl,
      };

      // Mutable ref for the expected scanId — set synchronously after
      // startScan returns, before any queued IPC events are processed.
      // Listeners check this ref instead of reactive store state to avoid
      // the race where events arrive before set({ scanId }) propagates.
      let expectedScanId: string | null = null;

      // Set up real-time IPC listeners
      const unsubs: (() => void)[] = [];

      unsubs.push(
        window.api.onScanStdout((id, line) => {
          if (!expectedScanId || id !== expectedScanId) return;
          set((s) => ({ rawStdoutLines: [...s.rawStdoutLines, line] }));
        })
      );

      unsubs.push(
        window.api.onScanStderr((id, line) => {
          if (!expectedScanId || id !== expectedScanId) return;
          set((s) => ({ rawStderrLines: [...s.rawStderrLines, line] }));
        })
      );

      unsubs.push(
        window.api.onScanProgress((id, info) => {
          if (!expectedScanId || id !== expectedScanId) return;
          set({ progressInfo: info });
        })
      );

      unsubs.push(
        window.api.onScanComplete((id, result) => {
          if (!expectedScanId || id !== expectedScanId) return;
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          // Clean up listeners immediately after terminal event
          if (cleanupListeners) {
            cleanupListeners();
            cleanupListeners = null;
          }
          set({
            isScanning: false,
            activeResult: result,
            progressInfo: null,
          });

          // If single skill mode, auto-select the skill if available
          if (!result.scanMode || result.scanMode === 'single') {
            if (result.skills && result.skills.length > 0) {
              set({ selectedSkill: result.skills[0] });
            }
          }
        })
      );

      unsubs.push(
        window.api.onScanCancelled((id) => {
          if (!expectedScanId || id !== expectedScanId) return;
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          if (cleanupListeners) {
            cleanupListeners();
            cleanupListeners = null;
          }
          set({
            isScanning: false,
            progressInfo: null,
          });
        })
      );

      unsubs.push(
        window.api.onScanError((id, error) => {
          if (!expectedScanId || id !== expectedScanId) return;
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          if (cleanupListeners) {
            cleanupListeners();
            cleanupListeners = null;
          }
          set({
            isScanning: false,
            scanError: error,
            progressInfo: null,
          });
        })
      );

      cleanupListeners = () => {
        unsubs.forEach((unsub) => {
          try {
            unsub();
          } catch {
            // Ignore unsubscribe errors
          }
        });
      };

      // Call startScan — IPC returns the scanId synchronously.
      // Set expectedScanId immediately so queued events are accepted.
      const resp = await window.api.startScan(request);
      expectedScanId = resp.scanId;
      set({ scanId: resp.scanId });
    } catch (err: unknown) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      if (cleanupListeners) {
        cleanupListeners();
        cleanupListeners = null;
      }
      set({
        isScanning: false,
        scanError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  cancelScan: async () => {
    const { scanId } = get();
    if (!scanId || !window.api) return;
    try {
      await window.api.cancelScan(scanId);
    } catch (err) {
      console.error('Failed to cancel scan:', err);
    }
  },

  selectSkillForDetail: async (skill: NormalizedSkillResult, _rootTargetPath?: string) => {
    // 1. Check if complete detail is already in skill
    if (skill.issues !== null && skill.issues !== undefined) {
      set({ selectedSkill: skill, detailLoading: false });
      return;
    }

    // 2. Check cache
    const cached = get().singleSkillDetailCache[skill.path];
    if (cached && cached.issues !== null) {
      set({ selectedSkill: cached, detailLoading: false });
      return;
    }

    // 3. Fallback: transparent single-skill scan
    set({ selectedSkill: skill, detailLoading: true });

    try {
      if (!window.api) throw new Error('API not available');

      const appStore = useAppStore.getState();
      const singleReq: SingleScanRequest = {
        skillPath: skill.path,
        llmEnabled: get().llmEnabled,
        model: get().llmEnabled ? (get().model || appStore.selectedModel) : undefined,
        ollamaUrl: appStore.appSettings?.ollamaUrl,
      };

      const fullResult = await window.api.runSingleSkillScan(singleReq);
      const detailedSkill = fullResult.skills?.[0] || {
        ...skill,
        issues: [],
        inspectionWarnings: [],
        completeness: null,
        components: [],
        metadata: null,
      };

      // Update cache
      set((s) => ({
        singleSkillDetailCache: {
          ...s.singleSkillDetailCache,
          [skill.path]: detailedSkill,
        },
        selectedSkill: detailedSkill,
        detailLoading: false,
      }));
    } catch (err) {
      console.error('Failed to load detailed analysis:', err);
      set({
        detailLoading: false,
        // Keep selectedSkill so modal is open with error or partial info
      });
    }
  },

  closeSkillDetail: () => {
    set({ selectedSkill: null, detailLoading: false });
  },

  rescanSingleSkill: async (skillPath: string) => {
    const skill = get().selectedSkill;
    if (!skill || !window.api) return;

    set({ detailLoading: true });
    try {
      const appStore = useAppStore.getState();
      const singleReq: SingleScanRequest = {
        skillPath: skillPath,
        llmEnabled: get().llmEnabled,
        model: get().llmEnabled ? (get().model || appStore.selectedModel) : undefined,
        ollamaUrl: appStore.appSettings?.ollamaUrl,
      };

      const fullResult = await window.api.runSingleSkillScan(singleReq);
      const updatedSkill = fullResult.skills?.[0] || skill;

      // Update cache, selectedSkill, and replace in activeResult.skills
      set((s) => {
        const nextActiveResult = s.activeResult
          ? {
              ...s.activeResult,
              skills: s.activeResult.skills.map((sk) =>
                sk.path === skillPath ? updatedSkill : sk
              ),
            }
          : null;

        return {
          detailLoading: false,
          selectedSkill: updatedSkill,
          activeResult: nextActiveResult,
          singleSkillDetailCache: {
            ...s.singleSkillDetailCache,
            [skillPath]: updatedSkill,
          },
        };
      });
    } catch (err) {
      console.error('Failed to rescan skill:', err);
      set({ detailLoading: false });
    }
  },

  loadResult: (result: NormalizedScanResult) => {
    set({
      activeResult: result,
      targetPath: result.targetPath,
      recursive: result.scanMode === 'recursive',
      llmEnabled: result.llmEnabled,
      model: result.model || '',
      selectedSkill: null,
      rawStdoutLines: result.stdout ? result.stdout.split('\n') : [],
      rawStderrLines: result.stderr ? result.stderr.split('\n') : [],
      scanError: result.executionStatus === 'failed' ? 'Scan failed' : null,
      isScanning: false,
    });
  },

  clearScan: () => {
    if (cleanupListeners) {
      cleanupListeners();
      cleanupListeners = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({
      activeResult: null,
      selectedSkill: null,
      rawStdoutLines: [],
      rawStderrLines: [],
      scanError: null,
      isScanning: false,
      progressInfo: null,
    });
  },
}));
