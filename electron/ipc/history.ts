import { ipcMain } from 'electron';
import type { HistoryEntry, NormalizedScanResult } from '../types';
import {
  clearHistory,
  deleteHistoryEntry,
  getHistoryIndex,
  getHistoryReport,
} from '../services/history';

export function registerHistoryHandlers(): void {
  ipcMain.handle('history:list', async (): Promise<HistoryEntry[]> => {
    return getHistoryIndex();
  });

  ipcMain.handle(
    'history:get',
    async (_event, id: string): Promise<NormalizedScanResult | null> => {
      return getHistoryReport(id);
    }
  );

  ipcMain.handle('history:delete', async (_event, id: string): Promise<void> => {
    return deleteHistoryEntry(id);
  });

  ipcMain.handle('history:clear', async (): Promise<void> => {
    return clearHistory();
  });
}
