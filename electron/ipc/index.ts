import { BrowserWindow } from 'electron';
import { registerDialogHandlers } from './dialogs';
import { registerExportHandlers } from './export';
import { registerFavoritesHandlers } from './favorites';
import { registerHistoryHandlers } from './history';
import { registerOllamaHandlers } from './ollama';
import { registerScanHandlers } from './scan';
import { registerSettingsHandlers } from './settings';
import { registerShellHandlers } from './shell';

export function registerIpcHandlers(
  windowOrGetter: BrowserWindow | (() => BrowserWindow | null)
): void {
  const getWin =
    typeof windowOrGetter === 'function' ? windowOrGetter : () => windowOrGetter;

  registerDialogHandlers(getWin);
  registerSettingsHandlers();
  registerOllamaHandlers();
  registerScanHandlers(getWin);
  registerHistoryHandlers();
  registerFavoritesHandlers();
  registerShellHandlers();
  registerExportHandlers();
}
