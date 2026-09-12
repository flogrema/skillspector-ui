// Re-export all types from api.ts and add UI-specific view types

export * from './api';

export type ViewType = 'scan' | 'history' | 'favorites' | 'settings';

export type FilterOption = 'all' | 'clean' | 'findings' | 'medium+' | 'high+' | 'failed';

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}
