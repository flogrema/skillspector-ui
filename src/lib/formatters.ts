import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  CheckCircle,
  XCircle,
  Ban,
  LucideIcon,
} from 'lucide-react';
import { ExecutionStatus } from '../types/api';

export interface SeverityBadgeInfo {
  label: string;
  badgeClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  icon: LucideIcon;
}

/**
 * Returns complete styling, label, and icon for a given severity string.
 * CRITICAL RULE: Severity must NEVER be communicated by color alone — always with text label and icon.
 */
export function getSeverityBadge(severity: string | null | undefined): SeverityBadgeInfo {
  const norm = (severity || '').toUpperCase().trim();

  switch (norm) {
    case 'CRITICAL':
      return {
        label: 'CRITICAL',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/25',
        textClass: 'text-red-400',
        bgClass: 'bg-red-500/10',
        borderClass: 'border-red-500/25',
        icon: AlertOctagon,
      };
    case 'HIGH':
      return {
        label: 'HIGH',
        badgeClass: 'bg-orange-500/10 text-orange-400 border border-orange-500/25',
        textClass: 'text-orange-400',
        bgClass: 'bg-orange-500/10',
        borderClass: 'border-orange-500/25',
        icon: AlertTriangle,
      };
    case 'MEDIUM':
      return {
        label: 'MEDIUM',
        badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
        textClass: 'text-amber-400',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/25',
        icon: AlertCircle,
      };
    case 'LOW':
      return {
        label: 'LOW',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
        textClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/25',
        icon: ShieldCheck,
      };
    case 'CLEAN':
    case 'NONE':
    case 'PASS':
    case 'SAFE':
      return {
        label: 'CLEAN',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
        textClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/25',
        icon: CheckCircle2,
      };
    default:
      return {
        label: norm || 'UNKNOWN',
        badgeClass: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/25',
        textClass: 'text-zinc-400',
        bgClass: 'bg-zinc-500/10',
        borderClass: 'border-zinc-500/25',
        icon: HelpCircle,
      };
  }
}

/**
 * Formats a score from 0-100 with appropriate text color.
 */
export function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score)) return '0 / 100';
  return `${Math.round(score)} / 100`;
}

export function getScoreTextColor(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score) || score === 0) {
    return 'text-emerald-400';
  }
  if (score < 40) return 'text-amber-400';
  if (score < 75) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Formats an ISO date string into a readable format.
 */
export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return 'Unknown date';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    
    // Check if within last 24 hours
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Formats duration in seconds into human-readable string.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Returns badge info for execution status.
 */
export function getExecutionStatusBadge(status: ExecutionStatus | string | undefined): {
  label: string;
  badgeClass: string;
  icon: LucideIcon;
} {
  switch (status?.toLowerCase()) {
    case 'completed':
      return {
        label: 'Completed',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        icon: CheckCircle,
      };
    case 'failed':
      return {
        label: 'Failed',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
        icon: XCircle,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
        icon: Ban,
      };
    default:
      return {
        label: status || 'Pending',
        badgeClass: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
        icon: HelpCircle,
      };
  }
}

/**
 * Shortens a file or directory path for compact display.
 */
export function formatPath(path: string | null | undefined, maxChars = 40): string {
  if (!path) return '';
  if (path.length <= maxChars) return path;
  
  const parts = path.split(/[/\\]/);
  if (parts.length <= 2) return path;
  
  const first = parts[0];
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  
  const shortened = `${first}/.../${secondLast}/${last}`;
  if (shortened.length <= maxChars) return shortened;
  return `.../${secondLast}/${last}`;
}
