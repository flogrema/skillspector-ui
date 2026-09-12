import { ipcMain } from 'electron';
import type { OllamaModel, OllamaStatus } from '../types';
import { checkOllamaStatus, getOllamaModels } from '../services/ollama';

export function registerOllamaHandlers(): void {
  ipcMain.handle(
    'ollama:status',
    async (_event, baseUrl?: string): Promise<OllamaStatus> => {
      return checkOllamaStatus(baseUrl);
    }
  );

  ipcMain.handle(
    'ollama:models',
    async (_event, baseUrl?: string): Promise<OllamaModel[]> => {
      return getOllamaModels(baseUrl);
    }
  );
}
