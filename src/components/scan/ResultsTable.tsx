import React, { useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCode,
  Shield,
  Filter,
} from 'lucide-react';
import { useScanStore } from '../../stores/scanStore';
import { NormalizedSkillResult } from '../../types/api';
import { FilterOption } from '../../types/skillspector';
import { getSeverityBadge, getScoreTextColor } from '../../lib/formatters';

const FILTER_OPTIONS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'All Skills' },
  { id: 'clean', label: 'Clean' },
  { id: 'findings', label: 'Findings' },
  { id: 'medium+', label: 'Medium+' },
  { id: 'high+', label: 'High+' },
  { id: 'failed', label: 'Failed' },
];

export const ResultsTable: React.FC = () => {
  const {
    activeResult,
    targetPath,
    filter,
    setFilter,
    sort,
    setSort,
    selectSkillForDetail,
    rescanSingleSkill,
    detailLoading,
    selectedSkill,
  } = useScanStore();

  const skills = activeResult?.skills || [];

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const sev = (skill.severity || '').toUpperCase();
      const findings = skill.findingCount || 0;
      const isClean = findings === 0 && (skill.score === 0 || sev === 'CLEAN' || sev === 'LOW');

      switch (filter) {
        case 'clean':
          return isClean;
        case 'findings':
          return findings > 0;
        case 'medium+':
          return ['MEDIUM', 'HIGH', 'CRITICAL'].includes(sev);
        case 'high+':
          return ['HIGH', 'CRITICAL'].includes(sev);
        case 'failed':
          return !skill.executionSuccessful;
        case 'all':
        default:
          return true;
      }
    });
  }, [skills, filter]);

  // Sort skills
  const sortedSkills = useMemo(() => {
    const list = [...filteredSkills];
    const { column, direction } = sort;
    const factor = direction === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (column === 'name') {
        return factor * a.name.localeCompare(b.name);
      }
      if (column === 'score') {
        return factor * ((a.score ?? 0) - (b.score ?? 0));
      }
      if (column === 'severity') {
        const order: Record<string, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
          CLEAN: 0,
        };
        const orderA = order[(a.severity || '').toUpperCase()] ?? 0;
        const orderB = order[(b.severity || '').toUpperCase()] ?? 0;
        return factor * (orderA - orderB);
      }
      if (column === 'findingCount') {
        return factor * ((a.findingCount ?? 0) - (b.findingCount ?? 0));
      }
      if (column === 'warnings') {
        const warnA = a.inspectionWarnings?.length ?? 0;
        const warnB = b.inspectionWarnings?.length ?? 0;
        return factor * (warnA - warnB);
      }
      if (column === 'execution') {
        return factor * (Number(b.executionSuccessful) - Number(a.executionSuccessful));
      }
      return 0;
    });

    return list;
  }, [filteredSkills, sort]);

  const renderSortIndicator = (columnName: string) => {
    if (sort.column !== columnName) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />;
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-cyan-400" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-cyan-400" />
    );
  };

  if (!activeResult) return null;

  return (
    <div className="surface-card overflow-hidden">
      {/* Table Header Controls: Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5 bg-surface/50">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Skills Overview
          </span>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-mono text-zinc-300">
            {sortedSkills.length} of {skills.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 text-zinc-500 mr-1" />
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dense Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0d0d0f] text-zinc-400">
              {/* Skill */}
              <th
                scope="col"
                className="group cursor-pointer px-4 py-3 font-semibold hover:text-zinc-200 select-none"
                onClick={() => setSort('name')}
              >
                <div className="flex items-center">
                  <span>Skill Name</span>
                  {renderSortIndicator('name')}
                </div>
              </th>

              {/* Score */}
              <th
                scope="col"
                className="group cursor-pointer px-4 py-3 font-semibold hover:text-zinc-200 select-none text-right"
                onClick={() => setSort('score')}
              >
                <div className="flex items-center justify-end">
                  <span>Score</span>
                  {renderSortIndicator('score')}
                </div>
              </th>

              {/* Severity */}
              <th
                scope="col"
                className="group cursor-pointer px-4 py-3 font-semibold hover:text-zinc-200 select-none"
                onClick={() => setSort('severity')}
              >
                <div className="flex items-center">
                  <span>Severity</span>
                  {renderSortIndicator('severity')}
                </div>
              </th>

              {/* Findings */}
              <th
                scope="col"
                className="group cursor-pointer px-4 py-3 font-semibold hover:text-zinc-200 select-none text-center"
                onClick={() => setSort('findingCount')}
              >
                <div className="flex items-center justify-center">
                  <span>Findings</span>
                  {renderSortIndicator('findingCount')}
                </div>
              </th>

              {/* Warnings */}
              <th
                scope="col"
                className="group cursor-pointer px-4 py-3 font-semibold hover:text-zinc-200 select-none text-center"
                onClick={() => setSort('warnings')}
              >
                <div className="flex items-center justify-center">
                  <span>Inspection Warnings</span>
                  {renderSortIndicator('warnings')}
                </div>
              </th>

              {/* Execution */}
              <th
                scope="col"
                className="group cursor-pointer px-4 py-3 font-semibold hover:text-zinc-200 select-none text-center"
                onClick={() => setSort('execution')}
              >
                <div className="flex items-center justify-center">
                  <span>Status</span>
                  {renderSortIndicator('execution')}
                </div>
              </th>

              {/* Actions */}
              <th scope="col" className="px-4 py-3 font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.04]">
            {sortedSkills.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileCode className="h-8 w-8 text-zinc-600" />
                    <span>No skills match the selected filter &quot;{filter}&quot;</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedSkills.map((skill) => {
                const badge = getSeverityBadge(skill.severity);
                const BadgeIcon = badge.icon;
                const isSelected = selectedSkill?.path === skill.path;
                const warningCount = skill.inspectionWarnings?.length ?? 0;

                return (
                  <tr
                    key={skill.path}
                    onClick={() => selectSkillForDetail(skill, targetPath)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        selectSkillForDetail(skill, targetPath);
                      }
                    }}
                    className={`group cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/30'
                        : 'hover:bg-white/[0.03] focus-visible:bg-white/[0.04]'
                    }`}
                  >
                    {/* Skill info */}
                    <td className="px-4 py-3 font-medium text-white max-w-xs">
                      <div className="flex items-center space-x-2">
                        <FileCode className="h-4 w-4 shrink-0 text-cyan-400/80" />
                        <div className="truncate">
                          <div className="font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                            {skill.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono truncate" title={skill.path}>
                            {skill.path}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={getScoreTextColor(skill.score)}>
                        {Math.round(skill.score ?? 0)}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-normal ml-0.5">/100</span>
                    </td>

                    {/* Severity (ALWAYS text + icon) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.badgeClass}`}
                      >
                        <BadgeIcon className="h-3 w-3 shrink-0" />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    {/* Findings count */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block min-w-6 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                          (skill.findingCount ?? 0) > 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {skill.findingCount ?? 0}
                      </span>
                    </td>

                    {/* Inspection Warnings */}
                    <td className="px-4 py-3 text-center">
                      {warningCount > 0 ? (
                        <span className="inline-flex items-center space-x-1 rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                          <span>{warningCount}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Execution status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {skill.executionSuccessful ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>OK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-red-400 text-[11px]">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => selectSkillForDetail(skill, targetPath)}
                          className="flex items-center space-x-1 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors"
                          title="View detailed skill report"
                        >
                          <Eye className="h-3 w-3 text-cyan-400" />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => rescanSingleSkill(skill.path)}
                          disabled={detailLoading}
                          className="flex items-center space-x-1 rounded-md bg-white/[0.06] p-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors disabled:opacity-50"
                          title="Rescan this skill individually"
                        >
                          <RefreshCw
                            className={`h-3 w-3 text-zinc-400 ${
                              detailLoading && isSelected ? 'animate-spin text-cyan-400' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
