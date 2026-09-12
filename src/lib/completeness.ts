import type {
  AnalysisCompleteness,
  CompletenessStatus,
  NormalizedScanResult,
} from '../types/api';

export type SkillInspectionState =
  | 'fully_inspected'
  | 'partially_inspected'
  | 'uninspected'
  | 'unknown';

/**
 * Evaluates whether an analysis is complete according to SkillSpector's completeness data.
 *
 * Rules:
 * 1. If SkillSpector explicitly reports is_complete === true or status === 'complete', it is complete.
 * 2. not_applicable analyzers (e.g. no_applicable_files) MUST NOT cause "Partial Coverage".
 * 3. If coverage is 100%, fully inspected > 0, partially inspected = 0, uninspected = 0,
 *    and no applicable analyzer failed, show "Complete" rather than "Partial Coverage".
 * 4. Completion is not inferred from analyzer count alone; the report's completeness fields
 *    and analyzer statuses are used.
 */
export function isAnalysisComplete(completeness: AnalysisCompleteness | null | undefined): boolean {
  if (!completeness) return false;

  // 1. Explicit true from SkillSpector
  if (completeness.is_complete === true || completeness.status?.toLowerCase() === 'complete') {
    return true;
  }

  // 2. Completeness fields
  const coverage = completeness.coverage_percent ?? 0;
  const fullyInspected = completeness.fully_inspected_files ?? 0;
  const partiallyInspected = completeness.partially_inspected_files ?? 0;
  const uninspected = completeness.entirely_uninspected_files ?? 0;

  // Criteria: coverage 100%, fully inspected > 0, partially inspected = 0, uninspected = 0
  if (coverage >= 100 && fullyInspected > 0 && partiallyInspected === 0 && uninspected === 0) {
    const statuses = completeness.analyzer_statuses || [];

    // Verify no applicable analyzer failed
    const hasFailedApplicableAnalyzer = statuses.some((analyzer) => {
      const status = (analyzer.status || '').toLowerCase();
      // not_applicable analyzers must NOT cause "Partial Coverage"
      if (status === 'not_applicable' || analyzer.reason_code === 'no_applicable_files') {
        return false;
      }
      return status === 'failed' || (typeof analyzer.failed === 'number' && analyzer.failed > 0);
    });

    if (!hasFailedApplicableAnalyzer) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether an individual skill is complete.
 */
export function isSkillComplete(
  executionSuccessful: boolean,
  completeness: AnalysisCompleteness | null | undefined
): boolean {
  if (!executionSuccessful) return false;
  if (!completeness) return false;
  return isAnalysisComplete(completeness);
}

/**
 * Classifies an individual skill's inspection state.
 */
export function getSkillInspectionState(
  executionSuccessful: boolean,
  completeness: AnalysisCompleteness | null | undefined
): SkillInspectionState {
  if (!executionSuccessful) {
    return 'uninspected';
  }
  if (!completeness) {
    return 'unknown';
  }
  if (isAnalysisComplete(completeness)) {
    return 'fully_inspected';
  }

  const cov = completeness.coverage_percent;
  const fully = completeness.fully_inspected_files ?? 0;
  const partial = completeness.partially_inspected_files ?? 0;

  if ((cov !== undefined && cov > 0) || fully > 0 || partial > 0) {
    return 'partially_inspected';
  }

  return 'uninspected';
}

/**
 * Derives completeness metrics and status for a single-skill scan.
 */
export function deriveSingleSkillCompleteness(
  executionSuccessful: boolean,
  completeness: AnalysisCompleteness | null | undefined
): { coveragePercent: number | null; completenessStatus: CompletenessStatus } {
  if (!executionSuccessful) {
    return { coveragePercent: 0, completenessStatus: 'incomplete' };
  }
  if (!completeness) {
    return { coveragePercent: null, completenessStatus: 'unknown' };
  }
  if (isSkillComplete(executionSuccessful, completeness)) {
    return { coveragePercent: 100, completenessStatus: 'complete' };
  }

  if (typeof completeness.coverage_percent === 'number') {
    const cov = Math.round(completeness.coverage_percent);
    if (cov === 0) {
      return { coveragePercent: 0, completenessStatus: 'incomplete' };
    }
    return { coveragePercent: cov, completenessStatus: cov >= 100 ? 'complete' : 'partial' };
  }

  return { coveragePercent: null, completenessStatus: 'unknown' };
}

/**
 * Derives accurate completeness percentage and status for a recursive scan.
 * Authoritative data is aggregated from child skills.
 * If completeness data is missing across all skills and top-level, returns Unknown (null).
 */
export function deriveRecursiveCompleteness(params: {
  reportCompleteness?: {
    is_complete?: boolean;
    coverage_percent?: number;
    execution_successful?: boolean;
    entirely_uninspected_files?: number;
    limitations?: unknown[];
    status?: string;
  } | null;
  skills: Array<{
    executionSuccessful: boolean;
    completeness?: AnalysisCompleteness | null;
  }>;
  totalSkillsExpected?: number;
  skillsOmitted?: number;
}): { coveragePercent: number | null; completenessStatus: CompletenessStatus } {
  const { reportCompleteness, skills, totalSkillsExpected, skillsOmitted = 0 } = params;

  if (skills.length === 0) {
    if (
      !reportCompleteness ||
      reportCompleteness.coverage_percent === undefined ||
      reportCompleteness.coverage_percent === null
    ) {
      return { coveragePercent: null, completenessStatus: 'unknown' };
    }
    const cov = Math.round(reportCompleteness.coverage_percent);
    return {
      coveragePercent: cov,
      completenessStatus:
        reportCompleteness.is_complete || cov >= 100
          ? 'complete'
          : cov === 0
            ? 'incomplete'
            : 'partial',
    };
  }

  let totalSkillCoverage = 0;
  let fullyCount = 0;
  let partialCount = 0;
  let uninspectedCount = skillsOmitted;
  let unknownCount = 0;

  for (const s of skills) {
    const state = getSkillInspectionState(s.executionSuccessful, s.completeness);
    if (state === 'fully_inspected') {
      totalSkillCoverage += 100;
      fullyCount++;
    } else if (state === 'partially_inspected') {
      const pct =
        s.completeness && typeof s.completeness.coverage_percent === 'number'
          ? s.completeness.coverage_percent
          : 50;
      totalSkillCoverage += pct;
      partialCount++;
    } else if (state === 'uninspected') {
      totalSkillCoverage += 0;
      uninspectedCount++;
    } else {
      unknownCount++;
    }
  }

  // If ALL skills have unknown completeness and no omitted skills
  if (unknownCount === skills.length && skillsOmitted === 0) {
    if (
      reportCompleteness &&
      typeof reportCompleteness.coverage_percent === 'number' &&
      reportCompleteness.coverage_percent > 0
    ) {
      const cov = Math.round(reportCompleteness.coverage_percent);
      return {
        coveragePercent: cov,
        completenessStatus:
          reportCompleteness.is_complete || cov >= 100 ? 'complete' : 'partial',
      };
    }
    return { coveragePercent: null, completenessStatus: 'unknown' };
  }

  const totalExpected = Math.max(
    totalSkillsExpected ?? skills.length + skillsOmitted,
    skills.length + skillsOmitted,
    1
  );

  const coveragePercent = Math.min(
    100,
    Math.max(0, Math.round(totalSkillCoverage / totalExpected))
  );

  let completenessStatus: CompletenessStatus;
  if (
    fullyCount === totalExpected &&
    skillsOmitted === 0 &&
    uninspectedCount === 0 &&
    partialCount === 0 &&
    unknownCount === 0 &&
    coveragePercent >= 100
  ) {
    completenessStatus = 'complete';
  } else if (coveragePercent === 0) {
    completenessStatus = 'incomplete';
  } else {
    completenessStatus = 'partial';
  }

  return { coveragePercent, completenessStatus };
}

/**
 * Backwards-compatible helper returning a single coverage percentage.
 */
export function deriveRecursiveCoveragePercent(params: {
  reportCompleteness?: {
    is_complete?: boolean;
    coverage_percent?: number;
    execution_successful?: boolean;
    entirely_uninspected_files?: number;
    limitations?: unknown[];
  } | null;
  skills: Array<{
    executionSuccessful: boolean;
    completeness?: AnalysisCompleteness | null;
  }>;
  totalSkillsExpected?: number;
  skillsOmitted?: number;
}): number {
  const result = deriveRecursiveCompleteness(params);
  return result.coveragePercent ?? 0;
}

/**
 * Authoritative summary derivation for UI components.
 * Re-derives accurate completeness from skills if result has missing or legacy 0% status.
 */
export function getScanCompleteness(result: NormalizedScanResult | null | undefined): {
  coveragePercent: number | null;
  completenessStatus: CompletenessStatus;
  label: string;
} {
  if (!result) {
    return { coveragePercent: null, completenessStatus: 'unknown', label: 'Unknown completeness' };
  }

  let coveragePercent = result.coveragePercent;
  let status = result.completenessStatus;

  // Re-derive if status is missing or if coveragePercent is 0 on a recursive scan with skills
  if (
    !status ||
    (result.scanMode === 'recursive' &&
      result.skills.length > 0 &&
      (coveragePercent === 0 || coveragePercent === null))
  ) {
    if (result.scanMode === 'recursive') {
      const derived = deriveRecursiveCompleteness({
        skills: result.skills,
        totalSkillsExpected: result.skillCount,
      });
      if (derived.completenessStatus !== 'unknown' || status === undefined) {
        coveragePercent = derived.coveragePercent;
        status = derived.completenessStatus;
      }
    } else if (result.scanMode === 'single' && result.skills.length > 0) {
      const derived = deriveSingleSkillCompleteness(
        result.skills[0].executionSuccessful,
        result.skills[0].completeness
      );
      if (derived.completenessStatus !== 'unknown' || status === undefined) {
        coveragePercent = derived.coveragePercent;
        status = derived.completenessStatus;
      }
    }
  }

  status =
    status ||
    (coveragePercent === null
      ? 'unknown'
      : coveragePercent >= 100
        ? 'complete'
        : coveragePercent === 0
          ? 'incomplete'
          : 'partial');

  let label: string;
  if (status === 'complete') {
    label = 'Complete analysis';
  } else if (status === 'partial') {
    label =
      coveragePercent !== null
        ? `Partial coverage (${Math.round(coveragePercent)}%)`
        : 'Partial coverage';
  } else if (status === 'incomplete') {
    label =
      coveragePercent !== null
        ? `Incomplete (${Math.round(coveragePercent)}%)`
        : 'Incomplete analysis';
  } else {
    label = 'Unknown completeness';
  }

  return { coveragePercent, completenessStatus: status, label };
}
