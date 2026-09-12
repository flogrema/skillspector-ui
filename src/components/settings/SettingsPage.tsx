import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bot,
  Sliders,
  CheckCircle2,
  XCircle,
  Folder,
  RefreshCw,
  Save,
  Cpu,
  Layers,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { AppSettings } from '../../types/api';

export const SettingsPage: React.FC = () => {
  const {
    appSettings,
    skillspectorStatus,
    ollamaStatus,
    ollamaModels,
    testSkillSpector,
    testOllama,
    saveSettings,
  } = useAppStore();

  const [skillspectorPath, setSkillspectorPath] = useState(appSettings?.skillspectorPath || '');
  const [ollamaUrl, setOllamaUrl] = useState(appSettings?.ollamaUrl || 'http://localhost:11434');
  const [defaultRecursive, setDefaultRecursive] = useState(appSettings?.defaultRecursive ?? false);
  const [defaultLlmEnabled, setDefaultLlmEnabled] = useState(
    appSettings?.defaultLlmEnabled ?? false
  );
  const [defaultModel, setDefaultModel] = useState(appSettings?.defaultModel || '');

  const [testingSS, setTestingSS] = useState(false);
  const [testingOllama, setTestingOllama] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (appSettings) {
      setSkillspectorPath(appSettings.skillspectorPath || '');
      setOllamaUrl(appSettings.ollamaUrl || 'http://localhost:11434');
      setDefaultRecursive(appSettings.defaultRecursive ?? false);
      setDefaultLlmEnabled(appSettings.defaultLlmEnabled ?? false);
      setDefaultModel(appSettings.defaultModel || '');
    }
  }, [appSettings]);

  const handleBrowseSS = async () => {
    if (!window.api?.selectFile) return;
    const path = await window.api.selectFile([
      { name: 'Executable or Python Script', extensions: ['exe', 'py', 'bat', 'cmd'] },
    ]);
    if (path) {
      setSkillspectorPath(path);
    }
  };

  const handleTestSS = async () => {
    setTestingSS(true);
    try {
      await testSkillSpector(skillspectorPath.trim() || undefined);
    } finally {
      setTestingSS(false);
    }
  };

  const handleTestOllama = async () => {
    setTestingOllama(true);
    try {
      await testOllama(ollamaUrl.trim() || undefined);
    } finally {
      setTestingOllama(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newSettings: AppSettings = {
        skillspectorPath: skillspectorPath.trim() || null,
        ollamaUrl: ollamaUrl.trim() || 'http://localhost:11434',
        defaultRecursive,
        defaultLlmEnabled,
        defaultModel: defaultModel.trim() || null,
      };
      await saveSettings(newSettings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="surface-card p-5">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Sliders className="h-5 w-5 text-cyan-400" />
          <span>Application Preferences & Integrations</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Configure local paths for NVIDIA SkillSpector CLI, Ollama endpoint, and default analysis options.
        </p>
      </div>

      {/* 1. SkillSpector Section */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2.5">
            <Shield className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">SkillSpector CLI Integration</h3>
              <p className="text-[11px] text-zinc-500">
                Path to the executable or wrapper script (e.g. skillspector in PATH or custom directory)
              </p>
            </div>
          </div>

          <div>
            {skillspectorStatus?.found ? (
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Detected</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/25">
                <XCircle className="h-3.5 w-3.5" />
                <span>Not Detected</span>
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            SkillSpector Executable / Command Path
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={skillspectorPath}
              onChange={(e) => setSkillspectorPath(e.target.value)}
              placeholder="Leave empty to use 'skillspector' from system PATH"
              className="flex-1 rounded-input border border-white/[0.08] bg-[#09090b] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 font-mono focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            />
            <button
              type="button"
              onClick={handleBrowseSS}
              className="flex items-center space-x-1.5 rounded-input border border-white/[0.08] bg-elevated px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all"
            >
              <Folder className="h-3.5 w-3.5 text-cyan-400" />
              <span>Browse</span>
            </button>
            <button
              type="button"
              onClick={handleTestSS}
              disabled={testingSS}
              className="flex items-center space-x-1.5 rounded-input border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-950/40 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingSS ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        {/* Detected Info Box */}
        {skillspectorStatus && (
          <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                CLI Version
              </span>
              <div className="font-mono text-zinc-200 mt-0.5">
                {skillspectorStatus.version || 'Unknown'}
              </div>
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Python Environment
              </span>
              <div className="font-mono text-zinc-200 mt-0.5">
                {skillspectorStatus.pythonVersion || 'System'}
              </div>
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Resolved Executable
              </span>
              <div className="font-mono text-zinc-400 truncate mt-0.5" title={skillspectorStatus.path || ''}>
                {skillspectorStatus.path || 'Auto (PATH)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Ollama Section */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2.5">
            <Bot className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Local Ollama LLM Service</h3>
              <p className="text-[11px] text-zinc-500">
                Endpoint for local semantic models (recommended: qwen2.5-coder:14b)
              </p>
            </div>
          </div>

          <div>
            {ollamaStatus?.online ? (
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-700">
                <XCircle className="h-3.5 w-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Ollama Server URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="flex-1 rounded-input border border-white/[0.08] bg-[#09090b] px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 font-mono focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            />
            <button
              type="button"
              onClick={handleTestOllama}
              disabled={testingOllama}
              className="flex items-center space-x-1.5 rounded-input border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-950/40 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingOllama ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        {/* Dynamic Model Badges */}
        {ollamaStatus?.online && ollamaModels.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-[#09090b] p-3 space-y-2">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
              Available Ollama Models ({ollamaModels.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ollamaModels.map((m) => (
                <span
                  key={m.name}
                  onClick={() => setDefaultModel(m.name)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-mono transition-all ${
                    defaultModel === m.name
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]'
                  }`}
                  title="Click to set as default model"
                >
                  {m.name} {m.parameterSize && `(${m.parameterSize})`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Scan Defaults Section */}
      <div className="surface-card p-5 space-y-4">
        <div className="border-b border-white/[0.08] pb-3">
          <h3 className="text-sm font-semibold text-white">Default Scan Behavior</h3>
          <p className="text-[11px] text-zinc-500">
            Initial configuration pre-selected whenever starting a new scan
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Default Mode */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Default Scan Mode
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setDefaultRecursive(false)}
                className={`flex-1 flex items-center justify-center space-x-1.5 rounded-input py-2 text-xs font-medium border transition-all ${
                  !defaultRecursive
                    ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
                    : 'border-white/[0.08] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Single Skill</span>
              </button>
              <button
                type="button"
                onClick={() => setDefaultRecursive(true)}
                className={`flex-1 flex items-center justify-center space-x-1.5 rounded-input py-2 text-xs font-medium border transition-all ${
                  defaultRecursive
                    ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
                    : 'border-white/[0.08] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Recursive</span>
              </button>
            </div>
          </div>

          {/* Default LLM Enabled */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Default LLM State
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setDefaultLlmEnabled(false)}
                className={`flex-1 rounded-input py-2 text-xs font-medium border transition-all ${
                  !defaultLlmEnabled
                    ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
                    : 'border-white/[0.08] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Off (Static Only)
              </button>
              <button
                type="button"
                onClick={() => setDefaultLlmEnabled(true)}
                className={`flex-1 rounded-input py-2 text-xs font-medium border transition-all ${
                  defaultLlmEnabled
                    ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
                    : 'border-white/[0.08] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                On (LLM Active)
              </button>
            </div>
          </div>

          {/* Default Model */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Preferred Model
            </label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full rounded-input border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-zinc-200 font-mono focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            >
              <option value="">Auto / First Available</option>
              {ollamaModels.map((m) => (
                <option key={m.name} value={m.name} className="bg-[#141418] text-zinc-200">
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 rounded-btn bg-cyan-500 hover:bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-black transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </form>
  );
};
