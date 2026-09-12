import React, { useState } from 'react';
import {
  Star,
  Play,
  Trash2,
  Edit2,
  FolderPlus,
  Folder,
  Layers,
  FileCode,
  X,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useScanStore } from '../../stores/scanStore';
import { Favorite } from '../../types/api';

export const FavoritesList: React.FC = () => {
  const { favorites, addFavorite, removeFavorite, saveSettings, appSettings, setActiveView } =
    useAppStore();
  const { setTargetPath, setRecursive, startScan } = useScanStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formMode, setFormMode] = useState<'single' | 'recursive'>('recursive');

  const handleBrowse = async () => {
    if (!window.api?.selectFolder) return;
    const folder = await window.api.selectFolder();
    if (folder) {
      setFormPath(folder);
      if (!formName) {
        const segs = folder.replace(/[/\\]+$/, '').split(/[/\\]/);
        setFormName(segs[segs.length - 1] || 'My Skill Directory');
      }
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPath.trim()) return;

    await addFavorite({
      name: formName.trim() || 'Untitled Skill',
      path: formPath.trim(),
      preferredMode: formMode,
    });

    setIsAdding(false);
    setFormName('');
    setFormPath('');
  };

  const handleScanFavorite = (fav: Favorite) => {
    setTargetPath(fav.path);
    setRecursive(fav.preferredMode === 'recursive');
    setActiveView('scan');
    // Start scan after switching view
    setTimeout(() => {
      startScan();
    }, 100);
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 surface-card p-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <span>Saved Skills & Targets</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Bookmark frequently scanned repositories or skill directories for one-click security audits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setFormName('');
            setFormPath('');
            setFormMode('recursive');
          }}
          className="flex items-center space-x-1.5 rounded-btn bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-semibold text-black transition-all shadow-md shadow-cyan-500/20"
        >
          <FolderPlus className="h-4 w-4" />
          <span>Add Favorite</span>
        </button>
      </div>

      {/* Add New Favorite Modal / Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveNew}
          className="surface-card p-5 border border-cyan-500/30 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-semibold text-white">Add Target to Favorites</h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Display Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Production Agent Skills"
                className="w-full rounded-input border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Scan Mode</label>
              <select
                value={formMode}
                onChange={(e) => setFormMode(e.target.value as 'single' | 'recursive')}
                className="w-full rounded-input border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-zinc-100 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              >
                <option value="recursive">Recursive Scan (Directory of Skills)</option>
                <option value="single">Single Skill Scan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Target Path</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formPath}
                onChange={(e) => setFormPath(e.target.value)}
                placeholder="C:\path\to\skills"
                className="flex-1 rounded-input border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 font-mono focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                required
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="flex items-center space-x-1 rounded-input border border-white/[0.08] bg-elevated px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.06]"
              >
                <Folder className="h-3.5 w-3.5 text-cyan-400" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-btn px-4 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-btn bg-cyan-500 hover:bg-cyan-400 px-4 py-1.5 text-xs font-semibold text-black"
            >
              Save Favorite
            </button>
          </div>
        </form>
      )}

      {/* Favorites Grid */}
      {favorites.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <Star className="mx-auto h-10 w-10 text-zinc-700" />
          <h3 className="mt-3 text-sm font-semibold text-white">No Favorites Saved</h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            You can bookmark directories from the scan screen or click &quot;Add Favorite&quot; above to quickly access your skills.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="surface-card surface-card-hover p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
                    <h3 className="font-semibold text-sm text-white truncate" title={fav.name}>
                      {fav.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFavorite(fav.id)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Remove favorite"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                    {fav.preferredMode === 'recursive' ? (
                      <>
                        <Layers className="h-3 w-3 text-cyan-400" />
                        <span>Recursive</span>
                      </>
                    ) : (
                      <>
                        <FileCode className="h-3 w-3 text-cyan-400" />
                        <span>Single Skill</span>
                      </>
                    )}
                  </span>
                </div>

                <p
                  className="font-mono text-xs text-zinc-400 break-all bg-[#09090b] rounded-lg p-2 border border-white/[0.04]"
                  title={fav.path}
                >
                  {fav.path}
                </p>
              </div>

              <div className="pt-2 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => handleScanFavorite(fav)}
                  className="flex w-full items-center justify-center space-x-1.5 rounded-btn bg-white/[0.06] hover:bg-cyan-500 hover:text-black py-2 text-xs font-semibold text-zinc-200 transition-all shadow-sm"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Scan Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
