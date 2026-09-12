import { create } from 'zustand';
import {
  SkillSpectorStatus,
  OllamaStatus,
  OllamaModel,
  AppSettings,
  Favorite,
} from '../types/api';
import { ViewType } from '../types/skillspector';

interface AppState {
  activeView: ViewType;
  skillspectorStatus: SkillSpectorStatus | null;
  ollamaStatus: OllamaStatus | null;
  ollamaModels: OllamaModel[];
  selectedModel: string;
  appSettings: AppSettings | null;
  favorites: Favorite[];
  isInitializing: boolean;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;

  // Actions
  setActiveView: (view: ViewType) => void;
  initApp: () => Promise<void>;
  testSkillSpector: (customPath?: string) => Promise<SkillSpectorStatus>;
  testOllama: (customUrl?: string) => Promise<OllamaStatus>;
  setSelectedModel: (model: string) => void;
  saveSettings: (settings: AppSettings) => Promise<boolean>;
  loadFavorites: () => Promise<void>;
  addFavorite: (fav: Omit<Favorite, 'id'>) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  setToast: (toast: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: 'scan',
  skillspectorStatus: null,
  ollamaStatus: null,
  ollamaModels: [],
  selectedModel: '',
  appSettings: null,
  favorites: [],
  isInitializing: false,
  toast: null,

  setActiveView: (view: ViewType) => set({ activeView: view }),

  setToast: (toast) => {
    set({ toast });
    if (toast) {
      setTimeout(() => {
        if (get().toast?.message === toast.message) {
          set({ toast: null });
        }
      }, 4000);
    }
  },

  initApp: async () => {
    if (typeof window === 'undefined' || !window.api) {
      console.warn('window.api not found. Running in standalone browser?');
      return;
    }

    set({ isInitializing: true });
    try {
      // 1. Load settings
      const settings = await window.api.getSettings().catch(() => null);
      if (settings) {
        set({ appSettings: settings });
      }

      // 2. Load favorites
      const favorites = await window.api.getFavorites().catch(() => []);
      set({ favorites });

      // 3. Test SkillSpector status
      const ssStatus = await window.api.getSkillSpectorStatus().catch(() => ({
        found: false,
        path: null,
        version: null,
        pythonVersion: null,
      }));
      set({ skillspectorStatus: ssStatus });

      // 4. Test Ollama status & models
      const ollamaUrl = settings?.ollamaUrl || 'http://localhost:11434';
      const oStatus = await window.api.getOllamaStatus(ollamaUrl).catch(() => ({
        online: false,
        url: ollamaUrl,
      }));
      set({ ollamaStatus: oStatus });

      if (oStatus.online) {
        const models = await window.api.getOllamaModels(ollamaUrl).catch(() => []);
        set({ ollamaModels: models });
        
        // Select default model if available
        if (settings?.defaultModel && models.some((m) => m.name === settings.defaultModel)) {
          set({ selectedModel: settings.defaultModel });
        } else if (models.length > 0) {
          // Look for qwen2.5-coder or first model
          const preferred = models.find((m) => m.name.toLowerCase().includes('qwen2.5-coder')) || models[0];
          set({ selectedModel: preferred.name });
        }
      }
    } catch (err) {
      console.error('Failed to initialize app store:', err);
    } finally {
      set({ isInitializing: false });
    }
  },

  testSkillSpector: async (customPath?: string) => {
    if (!window.api) throw new Error('API not available');
    try {
      const status = customPath
        ? await window.api.testSkillSpectorPath(customPath)
        : await window.api.getSkillSpectorStatus();
      set({ skillspectorStatus: status });
      return status;
    } catch (err) {
      const fallback: SkillSpectorStatus = {
        found: false,
        path: customPath || null,
        version: null,
        pythonVersion: null,
      };
      set({ skillspectorStatus: fallback });
      return fallback;
    }
  },

  testOllama: async (customUrl?: string) => {
    if (!window.api) throw new Error('API not available');
    const url = customUrl || get().appSettings?.ollamaUrl || 'http://localhost:11434';
    try {
      const status = await window.api.getOllamaStatus(url);
      set({ ollamaStatus: status });
      if (status.online) {
        const models = await window.api.getOllamaModels(url).catch(() => []);
        set({ ollamaModels: models });
        if (!get().selectedModel && models.length > 0) {
          set({ selectedModel: models[0].name });
        }
      } else {
        set({ ollamaModels: [] });
      }
      return status;
    } catch (err) {
      const fallback: OllamaStatus = { online: false, url };
      set({ ollamaStatus: fallback, ollamaModels: [] });
      return fallback;
    }
  },

  setSelectedModel: (model: string) => set({ selectedModel: model }),

  saveSettings: async (settings: AppSettings) => {
    if (!window.api) return false;
    try {
      await window.api.saveSettings(settings);
      set({ appSettings: settings });
      get().setToast({ message: 'Settings saved successfully', type: 'success' });
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      get().setToast({ message: 'Failed to save settings', type: 'error' });
      return false;
    }
  },

  loadFavorites: async () => {
    if (!window.api) return;
    try {
      const favorites = await window.api.getFavorites();
      set({ favorites });
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  },

  addFavorite: async (fav: Omit<Favorite, 'id'>) => {
    if (!window.api) return;
    try {
      const newFav: Favorite = {
        ...fav,
        id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      const updated = await window.api.saveFavorite(newFav);
      set({ favorites: updated });
      get().setToast({ message: `Saved "${fav.name}" to favorites`, type: 'success' });
    } catch (err) {
      console.error('Failed to add favorite:', err);
      get().setToast({ message: 'Failed to add favorite', type: 'error' });
    }
  },

  removeFavorite: async (id: string) => {
    if (!window.api) return;
    try {
      const updated = await window.api.deleteFavorite(id);
      set({ favorites: updated });
      get().setToast({ message: 'Removed favorite', type: 'info' });
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      get().setToast({ message: 'Failed to remove favorite', type: 'error' });
    }
  },
}));
