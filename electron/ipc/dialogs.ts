import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { FileFilter } from '../types';

export function registerDialogHandlers(
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('dialog:select-folder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:select-file', async (event, filters?: FileFilter[]) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters || [],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle(
    'dialog:save-file',
    async (event, defaultName: string, filters: FileFilter[]) => {
      const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
      if (!win) return null;
      const result = await dialog.showSaveDialog(win, {
        defaultPath: defaultName,
        filters: filters || [],
      });
      if (result.canceled || !result.filePath) {
        return null;
      }
      return result.filePath;
    }
  );
}
