import { ipcMain } from 'electron';
import { exportStoredReport, runScanAndExport } from '../services/export';

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:report',
    async (
      _event,
      scanId: string,
      format: 'json',
      outputPath: string
    ): Promise<boolean> => {
      if (format !== 'json') {
        throw new Error('Only JSON is supported for instant export from history.');
      }
      return exportStoredReport(scanId, outputPath);
    }
  );

  ipcMain.handle(
    'export:scan-and-export',
    async (
      _event,
      params: {
        targetPath: string;
        format: 'markdown' | 'sarif';
        outputPath: string;
        recursive: boolean;
        llmEnabled: boolean;
        model?: string;
        ollamaUrl?: string;
      }
    ): Promise<boolean> => {
      return runScanAndExport(params);
    }
  );
}
