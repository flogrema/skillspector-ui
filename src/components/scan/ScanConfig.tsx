import React, { useEffect, useState, useRef } from 'react';
import {
  Folder,
  Play,
  Loader2,
  Star,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  FileCode,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useScanStore } from '../../stores/scanStore';

export const ScanConfig: React.FC = () => {
  const {
    ollamaStatus,
    ollamaModels,
    selectedModel,
    setSelectedModel,
    favorites,
    addFavorite,
    removeFavorite,
    skillspectorStatus,
  } = useAppStore();

  const {
    targetPath,
    setTargetPath,
    recursive,
    setRecursive,
    llmEnabled,
    setLlmEnabled,
    model,
    setModel,
    isScanning,
    startScan,
    recentPaths,
  } = useScanStore();

  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if current targetPath is in favorites
  const currentFavorite = favorites.find(
    (f) => f.path.trim().toLowerCase() === targetPath.trim().toLowerCase()
  );

  // Synchronize model with appStore selected model if not set in scanStore
  useEffect(() => {
    if (!model && selectedModel) {
      setModel(selectedModel);
    }
  }, [model, selectedModel, setModel]);

  // Click outside listener for recent paths dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run scan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isScanning && targetPath.trim()) {
          e.preventDefault();
          startScan();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScanning, targetPath, startScan]);

  const handleBrowseFolder = async () => {
    if (!window.api?.selectFolder) return;
    const folder = await window.api.selectFolder();
    if (folder) {
      setTargetPath(folder);
    }
  };

  const handleToggleFavorite = async () => {
    if (!targetPath.trim()) return;
    if (currentFavorite) {
      await removeFavorite(currentFavorite.id);
    } else {
      // Derive name from last path segment
      const segments = targetPath.replace(/[/\\]+$/, '').split(/[/\\]/);
      const name = segments[segments.length - 1] || 'Skill Target';
      await addFavorite({
        name,
        path: targetPath.trim(),
        preferredMode: recursive ? 'recursive' : 'single',
      });
    }
  };

  return (
    <div className="surface-card p-5 space-y-4">
      {/* Top Row: Path Input, Browse, Favorite, Recent */}
      <div className="space-y-1.5">
        <label
          htmlFor="target-path-input"
          className="flex items-center justify-between text-xs font-medium text-zinc-400"
        >
          <span>Target Directory or Skill Path</span>
          <span className="text-[11px] text-zinc-500">Shortcut: Ctrl+Enter</span>
        </label>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              id="target-path-input"
              type="text"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="e.g. C:\path\to\agent\skills or C:\path\to\single-skill"
              disabled={isScanning}
              className="w-full rounded-input border border-white/[0.08] bg-[#09090b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-colors focus-visible:border-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500/30 disabled:opacity-60"
            />

            {/* Favorite toggle icon inside right of input */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={!targetPath.trim() || isScanning}
              title={currentFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle Favorite"
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 transition-colors ${
                currentFavorite
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-600 hover:text-zinc-300'
              } disabled:opacity-30`}
            >
              <Star
                className={`h-4 w-4 ${
                  currentFavorite ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>
          </div>

          {/* Browse button */}
          <button
            type="button"
            onClick={handleBrowseFolder}
            disabled={isScanning}
            className="flex items-center space-x-1.5 rounded-input border border-white/[0.08] bg-elevated px-3.5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50"
          >
            <Folder className="h-4 w-4 text-cyan-400" />
            <span>Browse</span>
          </button>

          {/* Recent paths dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowRecentDropdown(!showRecentDropdown)}
              disabled={isScanning || recentPaths.length === 0}
              className="flex items-center space-x-1 rounded-input border border-white/[0.08] bg-elevated px-2.5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-40"
              title="Recent Paths"
              aria-label="Recent Paths"
            >
              <Clock className="h-4 w-4 text-zinc-400" />
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {showRecentDropdown && recentPaths.length > 0 && (
              <div className="absolute right-0 top-full z-40 mt-1 w-80 max-h-64 overflow-y-auto rounded-xl border border-white/[0.1] bg-[#141418] p-1.5 shadow-2xl backdrop-blur-xl">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Recent Paths
                </div>
                {recentPaths.map((path, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTargetPath(path);
                      setShowRecentDropdown(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    <span className="truncate font-mono" title={path}>
                      {path}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Mode Toggle, LLM Toggle & Model Select, Scan Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-4">
          {/* Mode Pill Toggle */}
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#09090b] p-0.5">
            <button
              type="button"
              onClick={() => setRecursive(false)}
              disabled={isScanning}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                !recursive
                  ? 'bg-elevated text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="h-3.5 w-3.5 text-cyan-400" />
              <span>Single Skill</span>
            </button>
            <button
              type="button"
              onClick={() => setRecursive(true)}
              disabled={isScanning}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                recursive
                  ? 'bg-elevated text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>Recursive Scan</span>
            </button>
          </div>

          {/* LLM Analysis Toggle */}
          <div className="flex items-center space-x-2">
            <label
              htmlFor="llm-toggle"
              className={`flex items-center space-x-2 cursor-pointer select-none text-xs font-medium ${
                !ollamaStatus?.online
                  ? 'opacity-40 cursor-not-allowed text-zinc-500'
                  : 'text-zinc-300'
              }`}
              title={
                !ollamaStatus?.online
                  ? 'Ollama is offline. Start Ollama to enable LLM semantic analysis.'
                  : 'Enhance static inspection with local LLM semantic analysis'
              }
            >
              <div className="relative inline-flex items-center">
                <input
                  id="llm-toggle"
                  type="checkbox"
                  checked={llmEnabled && (ollamaStatus?.online ?? false)}
                  onChange={(e) => setLlmEnabled(e.target.checked)}
                  disabled={!ollamaStatus?.online || isScanning}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
              </div>
              <span className="flex items-center space-x-1">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>LLM Analysis</span>
              </span>
            </label>

            {!ollamaStatus?.online && (
              <span
                className="text-[11px] text-zinc-500 flex items-center space-x-1"
                title="Ollama is offline"
              >
                <AlertCircle className="h-3 w-3 text-zinc-600" />
                <span>(Ollama Offline)</span>
              </span>
            )}
          </div>

          {/* Model Selector (Visible if LLM is enabled and Ollama is online) */}
          {llmEnabled && ollamaStatus?.online && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-zinc-500 font-medium">Model:</span>
              <select
                value={model || selectedModel}
                onChange={(e) => {
                  setModel(e.target.value);
                  setSelectedModel(e.target.value);
                }}
                disabled={isScanning}
                className="rounded-input border border-white/[0.08] bg-[#09090b] px-2.5 py-1 text-xs text-zinc-200 font-mono focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              >
                {ollamaModels.map((m) => (
                  <option key={m.name} value={m.name} className="bg-[#141418] text-zinc-200">
                    {m.name} {m.parameterSize ? `(${m.parameterSize})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scan Action Button */}
        <div>
          <button
            type="button"
            onClick={startScan}
            disabled={isScanning || !targetPath.trim() || !skillspectorStatus?.found}
            className={`flex items-center space-x-2 rounded-btn px-6 py-2.5 text-sm font-semibold shadow-lg transition-all ${
              isScanning
                ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 cursor-wait'
                : !skillspectorStatus?.found
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20 active:scale-[0.98]'
            } disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-500/50`}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Scan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
