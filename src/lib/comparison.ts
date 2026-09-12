import type { NormalizedScanResult, NormalizedSkillResult, Issue } from '../types/api';

export type ComparabilityField =
  | 'llmEnabled'
  | 'model'
  | 'scanMode'
  | 'targetPath'
  | 'skillspectorVersion';

export interface ConfigurationDifference {
  field: ComparabilityField;
  label: string;
  baseValue: string;
  currentValue: string;
  explanation: string;
}

export interface ComparisonAnalysis {
  isEquivalent: boolean;
  differences: ConfigurationDifference[];
  explanation: string | null;
}

export interface ComparisonFinding {
  id: string;
  skillName: string;
  ruleId?: string;
  category: string;
  pattern?: string | null;
  severity: string;
  file?: string;
  startLine?: number;
  endLine?: number;
  explanation: string;
  isLlm: boolean;
}

export interface ScanComparisonResult {
  base: NormalizedScanResult;
  current: NormalizedScanResult;
  analysis: ComparisonAnalysis;
  scoreDelta: number;
  findingsDelta: number;
  baseFindings: ComparisonFinding[];
  currentFindings: ComparisonFinding[];
  unobservedOrResolvedFindings: ComparisonFinding[];
  additionalOrNewFindings: ComparisonFinding[];
}

/**
 * Detects whether two scans were performed under equivalent configurations.
 * Compares:
 * 1. LLM enabled/disabled
 * 2. Model (when LLM is enabled)
 * 3. Scan mode (single vs recursive)
 * 4. Target path
 * 5. SkillSpector CLI version
 */
export function detectScanComparability(
  base: NormalizedScanResult,
  current: NormalizedScanResult
): ComparisonAnalysis {
  const differences: ConfigurationDifference[] = [];

  // 1. LLM enabled/disabled
  const baseLlm = Boolean(base.llmEnabled);
  const currentLlm = Boolean(current.llmEnabled);
  if (baseLlm !== currentLlm) {
    const baseVal = baseLlm ? 'Enabled' : 'Disabled';
    const currentVal = currentLlm ? 'Enabled' : 'Disabled';
    const explanation = baseLlm
      ? 'LLM analysis was enabled in the baseline and disabled in the comparison scan. Findings may differ because analyzer coverage changed.'
      : 'LLM analysis was disabled in the baseline and enabled in the comparison scan. Additional findings may reflect expanded analyzer coverage rather than new risks.';

    differences.push({
      field: 'llmEnabled',
      label: 'LLM Analysis',
      baseValue: baseVal,
      currentValue: currentVal,
      explanation,
    });
  }

  // 2. Model when LLM is enabled in both
  if (baseLlm && currentLlm) {
    const baseModel = (base.model || '').trim();
    const currentModel = (current.model || '').trim();
    if (baseModel && currentModel && baseModel !== currentModel) {
      differences.push({
        field: 'model',
        label: 'LLM Model',
        baseValue: baseModel,
        currentValue: currentModel,
        explanation: `Different LLM models were used (${baseModel} vs ${currentModel}). Analysis depth, reasoning, and heuristic thresholds may differ.`,
      });
    }
  }

  // 3. Scan mode (single vs recursive)
  if (base.scanMode !== current.scanMode) {
    differences.push({
      field: 'scanMode',
      label: 'Scan Mode',
      baseValue: base.scanMode,
      currentValue: current.scanMode,
      explanation: `Scan mode changed from ${base.scanMode} to ${current.scanMode}. The scope of inspected skills and files is different.`,
    });
  }

  // 4. Target path (normalized for slashes, trailing separators, and casing)
  const normBaseTarget = (base.targetPath || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
  const normCurrentTarget = (current.targetPath || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (normBaseTarget !== normCurrentTarget) {
    differences.push({
      field: 'targetPath',
      label: 'Target Path',
      baseValue: base.targetPath,
      currentValue: current.targetPath,
      explanation: 'Scans evaluated different directories or skill target locations.',
    });
  }

  // 5. SkillSpector version (normalized of leading 'v')
  const normBaseVer = (base.skillspectorVersion || '').replace(/^v/i, '').trim();
  const normCurrentVer = (current.skillspectorVersion || '').replace(/^v/i, '').trim();
  if (normBaseVer && normCurrentVer && normBaseVer !== normCurrentVer) {
    differences.push({
      field: 'skillspectorVersion',
      label: 'SkillSpector Version',
      baseValue: base.skillspectorVersion,
      currentValue: current.skillspectorVersion,
      explanation: `SkillSpector version changed (${base.skillspectorVersion} vs ${current.skillspectorVersion}). Security rules and analyzer implementations may have been updated.`,
    });
  }

  const isEquivalent = differences.length === 0;

  let explanation: string | null = null;
  if (!isEquivalent) {
    const llmDiff = differences.find((d) => d.field === 'llmEnabled');
    if (llmDiff) {
      explanation = llmDiff.explanation;
    } else {
      explanation = differences.map((d) => d.explanation).join(' ');
    }
  }

  return {
    isEquivalent,
    differences,
    explanation,
  };
}

/**
 * Extracts all finding instances from a scan result into normalized ComparisonFinding objects.
 * Preserves individual finding identities without premature deduplication.
 */
export function extractFindings(scan: NormalizedScanResult): ComparisonFinding[] {
  const findings: ComparisonFinding[] = [];

  (scan.skills || []).forEach((skill: NormalizedSkillResult) => {
    (skill.issues || []).forEach((issue: Issue, idx: number) => {
      const ruleId = issue.id || issue.finding_id;
      const category = issue.category || issue.finding || 'Security Finding';
      const file = issue.location?.file;
      const startLine = issue.location?.start_line;
      const endLine = issue.location?.end_line;
      const isLlm = Boolean(
        issue.tags?.some((t) => t.toLowerCase().includes('llm')) ||
          issue.explanation?.toLowerCase().includes('llm') ||
          (issue.finding_id && issue.finding_id.startsWith('finding-'))
      );

      // Stable unique identifier per finding occurrence in this scan
      const id = [
        skill.name,
        ruleId || `rule-${idx}`,
        category,
        issue.pattern || '',
        file || '',
        startLine ?? `idx-${idx}`,
      ].join('::');

      findings.push({
        id,
        skillName: skill.name,
        ruleId,
        category,
        pattern: issue.pattern,
        severity: issue.severity || 'LOW',
        file,
        startLine,
        endLine,
        explanation: issue.explanation || issue.finding || category,
        isLlm,
      });
    });
  });

  return findings;
}

/**
 * Matches findings between base and comparison scans to determine which findings
 * are absent from the second scan (unobserved/resolved) and which are present only
 * in the second scan (additional/new).
 */
export function matchFindings(
  baseFindings: ComparisonFinding[],
  currentFindings: ComparisonFinding[]
): {
  unobservedOrResolved: ComparisonFinding[];
  additionalOrNew: ComparisonFinding[];
} {
  const matchedCurrentIndices = new Set<number>();
  const unobservedOrResolved: ComparisonFinding[] = [];

  for (const baseF of baseFindings) {
    let matchIdx = -1;

    // 1. Strict match: skill + ruleId + file
    if (baseF.ruleId) {
      for (let i = 0; i < currentFindings.length; i++) {
        if (matchedCurrentIndices.has(i)) continue;
        const currF = currentFindings[i];
        if (
          currF.skillName === baseF.skillName &&
          currF.ruleId === baseF.ruleId &&
          currF.file === baseF.file
        ) {
          matchIdx = i;
          break;
        }
      }
    }

    // 2. Secondary match: skill + category + pattern + file + line
    if (matchIdx === -1) {
      for (let i = 0; i < currentFindings.length; i++) {
        if (matchedCurrentIndices.has(i)) continue;
        const currF = currentFindings[i];
        if (
          currF.skillName === baseF.skillName &&
          currF.category === baseF.category &&
          currF.file === baseF.file &&
          currF.startLine === baseF.startLine
        ) {
          matchIdx = i;
          break;
        }
      }
    }

    // 3. Fallback match: skill + category + file
    if (matchIdx === -1) {
      for (let i = 0; i < currentFindings.length; i++) {
        if (matchedCurrentIndices.has(i)) continue;
        const currF = currentFindings[i];
        if (
          currF.skillName === baseF.skillName &&
          currF.category === baseF.category &&
          currF.file === baseF.file
        ) {
          matchIdx = i;
          break;
        }
      }
    }

    if (matchIdx !== -1) {
      matchedCurrentIndices.add(matchIdx);
    } else {
      unobservedOrResolved.push(baseF);
    }
  }

  const additionalOrNew: ComparisonFinding[] = [];
  for (let i = 0; i < currentFindings.length; i++) {
    if (!matchedCurrentIndices.has(i)) {
      additionalOrNew.push(currentFindings[i]);
    }
  }

  return {
    unobservedOrResolved,
    additionalOrNew,
  };
}

/**
 * Computes complete comparison diff between two scans, ordering them chronologically.
 */
export function computeScanComparison(
  scanA: NormalizedScanResult,
  scanB: NormalizedScanResult
): ScanComparisonResult {
  const dateA = new Date(scanA.timestamp).getTime();
  const dateB = new Date(scanB.timestamp).getTime();
  const [base, current] = dateA <= dateB ? [scanA, scanB] : [scanB, scanA];

  const analysis = detectScanComparability(base, current);
  const scoreDelta = current.maxScore - base.maxScore;
  const findingsDelta = current.totalFindings - base.totalFindings;

  const baseFindings = extractFindings(base);
  const currentFindings = extractFindings(current);

  const { unobservedOrResolved, additionalOrNew } = matchFindings(
    baseFindings,
    currentFindings
  );

  return {
    base,
    current,
    analysis,
    scoreDelta,
    findingsDelta,
    baseFindings,
    currentFindings,
    unobservedOrResolvedFindings: unobservedOrResolved,
    additionalOrNewFindings: additionalOrNew,
  };
}
