import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { AppSettings, Favorite } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  skillspectorPath: null,
  ollamaUrl: 'http://localhost:11434',
  defaultModel: 'qwen2.5-coder:14b',
  defaultRecursive: true,
  defaultLlmEnabled: true,
};

function getUserDataDir(): string {
  const dir = app.getPath('userData');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getFilePath(filename: string): string {
  return path.join(getUserDataDir(), filename);
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const filePath = getFilePath(filename);
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const content = await fs.promises.readFile(filePath, 'utf8');
    if (!content.trim()) {
      return fallback;
    }
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const filePath = getFilePath(filename);
  const tempPath = `${filePath}.tmp-${Date.now()}`;
  const content = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(tempPath, content, 'utf8');
  await fs.promises.rename(tempPath, filePath);
}

// ─── Settings ───────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const loaded = await readJsonFile<Partial<AppSettings>>('settings.json', {});
  return {
    ...DEFAULT_SETTINGS,
    ...loaded,
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await writeJsonFile('settings.json', settings);
}

// ─── Favorites ──────────────────────────────────────────────────────

export async function getFavorites(): Promise<Favorite[]> {
  return readJsonFile<Favorite[]>('favorites.json', []);
}

export async function saveFavorite(fav: Favorite): Promise<Favorite[]> {
  const favorites = await getFavorites();
  const index = favorites.findIndex((f) => f.id === fav.id);
  if (index >= 0) {
    favorites[index] = fav;
  } else {
    favorites.push(fav);
  }
  await writeJsonFile('favorites.json', favorites);
  return favorites;
}

export async function deleteFavorite(id: string): Promise<Favorite[]> {
  const favorites = await getFavorites();
  const updated = favorites.filter((f) => f.id !== id);
  await writeJsonFile('favorites.json', updated);
  return updated;
}

// ─── Recent Paths ───────────────────────────────────────────────────

export async function getRecent(): Promise<string[]> {
  return readJsonFile<string[]>('recent.json', []);
}

export async function addRecent(targetPath: string): Promise<string[]> {
  if (!targetPath || typeof targetPath !== 'string') {
    return getRecent();
  }
  const recent = await getRecent();
  const filtered = recent.filter((p) => p !== targetPath);
  filtered.unshift(targetPath);
  const truncated = filtered.slice(0, 10);
  await writeJsonFile('recent.json', truncated);
  return truncated;
}
