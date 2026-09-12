import { ipcMain } from 'electron';
import type { AppSettings, SkillSpectorStatus } from '../types';
import { detectSkillSpector, testSkillSpectorPath } from '../services/detector';
import { getSettings, saveSettings } from '../services/storage';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return getSettings();
  });

  ipcMain.handle('settings:save', async (_event, settings: AppSettings): Promise<void> => {
    return saveSettings(settings);
  });

  ipcMain.handle('skillspector:status', async (): Promise<SkillSpectorStatus> => {
    const currentSettings = await getSettings();
    return detectSkillSpector(currentSettings.skillspectorPath ?? undefined);
  });

  ipcMain.handle('skillspector:test', async (_event, targetPath: string): Promise<SkillSpectorStatus> => {
    return testSkillSpectorPath(targetPath);
  });
}
