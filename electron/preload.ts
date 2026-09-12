import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  Favorite,
  FileFilter,
  HistoryEntry,
  NormalizedScanResult,
  OllamaModel,
  OllamaStatus,
  ProgressInfo,
  ScanRequest,
  SingleScanRequest,
  SkillSpectorAPI,
  SkillSpectorStatus,
} from './types';

const api: SkillSpectorAPI = {
  // Native Dialogs
  selectFolder: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-folder');
  },

  selectFile: (filters?: FileFilter[]): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-file', filters);
  },

  saveFileDialog: (defaultName: string, filters: FileFilter[]): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:save-file', defaultName, filters);
  },

  // SkillSpector Detection
  getSkillSpectorStatus: (): Promise<SkillSpectorStatus> => {
    return ipcRenderer.invoke('skillspector:status');
  },

  testSkillSpectorPath: (targetPath: string): Promise<SkillSpectorStatus> => {
    return ipcRenderer.invoke('skillspector:test', targetPath);
  },

  // Ollama
  getOllamaStatus: (baseUrl?: string): Promise<OllamaStatus> => {
    return ipcRenderer.invoke('ollama:status', baseUrl);
  },

  getOllamaModels: (baseUrl?: string): Promise<OllamaModel[]> => {
    return ipcRenderer.invoke('ollama:models', baseUrl);
  },

  // Scanning
  startScan: (params: ScanRequest): Promise<{ scanId: string }> => {
    return ipcRenderer.invoke('scan:start', params);
  },

  cancelScan: (scanId: string): Promise<void> => {
    return ipcRenderer.invoke('scan:cancel', scanId);
  },

  runSingleSkillScan: (params: SingleScanRequest): Promise<NormalizedScanResult> => {
    return ipcRenderer.invoke('scan:single-skill', params);
  },

  // Scan Event Listeners
  onScanStdout: (cb: (scanId: string, line: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, scanId: string, line: string) => {
      cb(scanId, line);
    };
    ipcRenderer.on('scan:stdout', listener);
    return () => {
      ipcRenderer.removeListener('scan:stdout', listener);
    };
  },

  onScanStderr: (cb: (scanId: string, line: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, scanId: string, line: string) => {
      cb(scanId, line);
    };
    ipcRenderer.on('scan:stderr', listener);
    return () => {
      ipcRenderer.removeListener('scan:stderr', listener);
    };
  },

  onScanProgress: (cb: (scanId: string, info: ProgressInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, scanId: string, info: ProgressInfo) => {
      cb(scanId, info);
    };
    ipcRenderer.on('scan:progress', listener);
    return () => {
      ipcRenderer.removeListener('scan:progress', listener);
    };
  },

  onScanComplete: (
    cb: (scanId: string, result: NormalizedScanResult) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      scanId: string,
      result: NormalizedScanResult
    ) => {
      cb(scanId, result);
    };
    ipcRenderer.on('scan:complete', listener);
    return () => {
      ipcRenderer.removeListener('scan:complete', listener);
    };
  },

  onScanCancelled: (cb: (scanId: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, scanId: string) => {
      cb(scanId);
    };
    ipcRenderer.on('scan:cancelled', listener);
    return () => {
      ipcRenderer.removeListener('scan:cancelled', listener);
    };
  },

  onScanError: (cb: (scanId: string, error: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, scanId: string, error: string) => {
      cb(scanId, error);
    };
    ipcRenderer.on('scan:error', listener);
    return () => {
      ipcRenderer.removeListener('scan:error', listener);
    };
  },

  // Settings
  getSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke('settings:get');
  },

  saveSettings: (settings: AppSettings): Promise<void> => {
    return ipcRenderer.invoke('settings:save', settings);
  },

  // History
  getHistoryIndex: (): Promise<HistoryEntry[]> => {
    return ipcRenderer.invoke('history:list');
  },

  getHistoryReport: (id: string): Promise<NormalizedScanResult | null> => {
    return ipcRenderer.invoke('history:get', id);
  },

  deleteHistoryEntry: (id: string): Promise<void> => {
    return ipcRenderer.invoke('history:delete', id);
  },

  clearHistory: (): Promise<void> => {
    return ipcRenderer.invoke('history:clear');
  },

  // Favorites
  getFavorites: (): Promise<Favorite[]> => {
    return ipcRenderer.invoke('favorites:list');
  },

  saveFavorite: (fav: Favorite): Promise<Favorite[]> => {
    return ipcRenderer.invoke('favorites:save', fav);
  },

  deleteFavorite: (id: string): Promise<Favorite[]> => {
    return ipcRenderer.invoke('favorites:delete', id);
  },

  // Safe Actions
  openFileInEditor: (
    scanTargetDir: string,
    relativeFilePath: string
  ): Promise<boolean> => {
    return ipcRenderer.invoke('shell:open-file', scanTargetDir, relativeFilePath);
  },

  exportReport: (
    scanId: string,
    format: 'json',
    outputPath: string
  ): Promise<boolean> => {
    return ipcRenderer.invoke('export:report', scanId, format, outputPath);
  },

  runScanAndExport: (params: {
    targetPath: string;
    format: 'markdown' | 'sarif';
    outputPath: string;
    recursive: boolean;
    llmEnabled: boolean;
    model?: string;
    ollamaUrl?: string;
  }): Promise<boolean> => {
    return ipcRenderer.invoke('export:scan-and-export', params);
  },

  copyToClipboard: (text: string): Promise<void> => {
    return ipcRenderer.invoke('shell:copy-text', text);
  },
};

// Expose safe, strict typed API in the renderer window
contextBridge.exposeInMainWorld('api', api);
