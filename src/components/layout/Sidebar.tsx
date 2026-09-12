import React from 'react';
import {
  Radar,
  History,
  Star,
  Settings,
  Shield,
  Search,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { ViewType } from '../../types/skillspector';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'scan',
    label: 'Scan',
    icon: Radar,
    description: 'Security & Static Analysis',
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    description: 'Past Scan Reports & Diff',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: Star,
    description: 'Saved Paths & Skills',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'SkillSpector & Ollama Config',
  },
];

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView } = useAppStore();

  return (
    <aside
      className="flex h-screen w-64 flex-col border-r border-white/[0.08] bg-[#0c0c0e]/90 backdrop-blur-xl select-none"
      role="navigation"
      aria-label="Main Navigation"
    >
      {/* Brand / Logo */}
      <div className="flex h-14 items-center space-x-3 border-b border-white/[0.08] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold tracking-tight text-white text-sm">
            SkillSpector <span className="text-cyan-400 text-xs font-normal">UI</span>
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
            Agent Security
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 space-y-1.5 p-3">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex w-full items-center space-x-3 rounded-btn px-3 py-2.5 text-left text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              } focus-visible:ring-2 focus-visible:ring-cyan-500/50`}
            >
              {/* Active vertical accent bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-cyan-400 shadow-sm shadow-cyan-400/50"
                  aria-hidden="true"
                />
              )}

              <Icon
                className={`h-4 w-4 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              />

              <div className="flex flex-col">
                <span>{item.label}</span>
                <span
                  className={`text-[11px] ${
                    isActive ? 'text-zinc-400' : 'text-zinc-600 group-hover:text-zinc-400'
                  }`}
                >
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="border-t border-white/[0.08] p-4 text-xs text-zinc-500">
        <div className="flex items-center justify-between text-[11px]">
          <span>NVIDIA SkillSpector</span>
          <span className="font-mono text-zinc-600">v2.11+</span>
        </div>
      </div>
    </aside>
  );
};
