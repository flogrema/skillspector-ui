import { BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import type { NormalizedScanResult, ProgressInfo, ScanRequest, SingleScanRequest } from '../types';
import { cancelScan, runSingleSkillScan, startScan } from '../services/runner';

export function registerScanHandlers(
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(
    'scan:start',
    async (_event, params: ScanRequest): Promise<{ scanId: string }> => {
      if (!params.targetPath || typeof params.targetPath !== 'string') {
        throw new Error('Target path is required.');
      }
      if (!fs.existsSync(params.targetPath)) {
        throw new Error(`Target path does not exist: ${params.targetPath}`);
      }
      return startScan(params, {
        onStdout: (scanId: string, line: string) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('scan:stdout', scanId, line);
          }
        },
        onStderr: (scanId: string, line: string) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('scan:stderr', scanId, line);
          }
        },
        onProgress: (scanId: string, info: ProgressInfo) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('scan:progress', scanId, info);
          }
        },
        onComplete: (scanId: string, result: NormalizedScanResult) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('scan:complete', scanId, result);
          }
        },
        onCancelled: (scanId: string) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('scan:cancelled', scanId);
          }
        },
        onError: (scanId: string, error: string) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('scan:error', scanId, error);
          }
        },
      });
    }
  );

  ipcMain.handle('scan:cancel', async (_event, scanId: string): Promise<void> => {
    return cancelScan(scanId);
  });

  ipcMain.handle(
    'scan:single-skill',
    async (_event, params: SingleScanRequest): Promise<NormalizedScanResult> => {
      return runSingleSkillScan(params);
    }
  );
}
