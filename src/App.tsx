import React, { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ScanView } from './views/ScanView';
import { HistoryView } from './views/HistoryView';
import { FavoritesView } from './views/FavoritesView';
import { SettingsView } from './views/SettingsView';
import { useAppStore } from './stores/appStore';

export const App: React.FC = () => {
  const { activeView, setActiveView, initApp } = useAppStore();

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Global keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveView('scan');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveView('history');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveView('favorites');
        } else if (e.key === '4') {
          e.preventDefault();
          setActiveView('settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-zinc-100 antialiased font-sans">
      {/* Functional Layer: Sidebar */}
      <Sidebar />

      {/* Main Content Area with Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Functional Layer: Header */}
        <Header />

        {/* Content Layer: Solid dark surfaces */}
        <main
          className="flex-1 overflow-y-auto p-6 bg-canvas selection:bg-cyan-500/30 selection:text-white"
          id="main-content"
          role="main"
          tabIndex={-1}
        >
          <div className="mx-auto max-w-6xl">
            {activeView === 'scan' && <ScanView />}
            {activeView === 'history' && <HistoryView />}
            {activeView === 'favorites' && <FavoritesView />}
            {activeView === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
