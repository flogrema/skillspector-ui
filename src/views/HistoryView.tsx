import React from 'react';
import { History } from 'lucide-react';
import { HistoryList } from '../components/history/HistoryList';
import { SkillDetail } from '../components/scan/SkillDetail';
import { RawOutput } from '../components/scan/RawOutput';

export const HistoryView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <History className="h-5 w-5 text-cyan-400" />
          <span>Scan Audit History & Reports</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Review historical security scan reports, track risk regressions, and compare changes over time.
        </p>
      </div>

      <HistoryList />

      {/* Slide-over skill detail if a skill is opened */}
      <SkillDetail />

      {/* Process log modal if requested */}
      <RawOutput />
    </div>
  );
};
