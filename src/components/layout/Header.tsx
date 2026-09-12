import React from 'react';
import {
  Shield,
  Bot,
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderSearch,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export const Header: React.FC = () => {
  const {
    skillspectorStatus,
    ollamaStatus,
    selectedModel,
    isInitializing,
    testSkillSpector,
    testOllama,
    setActiveView,
    toast,
  } = useAppStore();

  const handleLocateSkillSpector = async () => {
    if (window.api?.selectFile) {
      const path = await window.api.selectFile();
      if (path) {
        await testSkillSpector(path);
      }
    } else {
      setActiveView('settings');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-white/[0.08] bg-surface/80 px-6 backdrop-blur-xl">
      {/* Left / Status context */}
      <div className="flex items-center space-x-3">
        {/* SkillSpector status pill */}
        <div className="flex items-center space-x-1.5 rounded-full border border-white/[0.08] bg-elevated/80 px-3 py-1 text-xs">
          <Shield className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-zinc-300">SkillSpector</span>
          {skillspectorStatus?.found ? (
            <div className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-mono text-[11px]">{skillspectorStatus.version || 'Ready'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-400">
              <XCircle className="h-3 w-3" />
              <span>Not Found</span>
              <button
                type="button"
                onClick={handleLocateSkillSpector}
                className="ml-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300 hover:bg-red-500/30 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                title="Locate SkillSpector executable"
              >
                Locate
              </button>
            </div>
          )}
        </div>

        {/* Ollama status pill */}
        <div className="flex items-center space-x-1.5 rounded-full border border-white/[0.08] bg-elevated/80 px-3 py-1 text-xs">
          <Bot className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-medium text-zinc-300">Ollama</span>
          {ollamaStatus?.online ? (
            <div className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-[11px]">Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              <span className="text-[11px]">Offline</span>
            </div>
          )}
        </div>

        {/* Active Model pill (if ollama online and model set) */}
        {ollamaStatus?.online && selectedModel && (
          <div className="hidden items-center space-x-1.5 rounded-full border border-cyan-500/20 bg-cyan-950/30 px-3 py-1 text-xs text-cyan-300 sm:flex">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-[11px] font-medium">{selectedModel}</span>
          </div>
        )}
      </div>

      {/* Right actions / notifications */}
      <div className="flex items-center space-x-3">
        {/* Toast alert banner if present */}
        {toast && (
          <div
            className={`flex items-center space-x-1.5 rounded-full px-3 py-0.5 text-xs font-medium border animate-in fade-in transition-all ${
              toast.type === 'error'
                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                : toast.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
            }`}
            role="status"
          >
            <AlertCircle className="h-3 w-3" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Refresh health checks */}
        <button
          type="button"
          onClick={() => {
            testSkillSpector();
            testOllama();
          }}
          disabled={isInitializing}
          className="rounded-btn p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          title="Refresh connection status"
          aria-label="Refresh status"
        >
          <RefreshCw className={`h-4 w-4 ${isInitializing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* Settings shortcut button */}
        <button
          type="button"
          onClick={() => setActiveView('settings')}
          className="rounded-btn p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          title="Open Settings"
          aria-label="Settings"
        >
          <Sliders className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
