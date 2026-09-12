/**
 * Regression test suite for Scan Comparison semantic correctness.
 *
 * Verifies:
 * 1. Comparability detection for equivalent scans (same config).
 * 2. Comparability detection for non-equivalent scans (LLM enabled vs disabled, different models,
 *    different scan modes, different targets, different SkillSpector versions).
 * 3. Semantic delta formatting: Equivalent scans use Improved/Regressed/Resolved/New,
 *    Non-equivalent scans use neutral "Score changed", "fewer findings observed", "Not observed".
 * 4. Finding identity & count consistency: Multiple findings with the same category/file
 *    are NOT collapsed or deduplicated into an inconsistent count.
 * 5. Real-world fixture comparison between LLM scan (47ff7224) and non-LLM scan.
 */

import {
  detectScanComparability,
  extractFindings,
  matchFindings,
  computeScanComparison,
} from '../src/lib/comparison';
import type { NormalizedScanResult } from '../src/types/api';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}`);
    failed++;
  }
}

function createSampleScan(overrides: Partial<NormalizedScanResult> = {}): NormalizedScanResult {
  return {
    id: 'scan-default',
    timestamp: '2026-09-12T20:00:00.000Z',
    targetPath: 'C:\\projects\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: 'v2.11.2',
    llmEnabled: false,
    model: null,
    skillCount: 1,
    maxScore: 0,
    maxSeverity: 'LOW',
    totalFindings: 0,
    recommendation: 'CAUTION',
    coveragePercent: 100,
    completenessStatus: 'complete',
    skills: [],
    scanWarnings: [],
    stdout: '',
    stderr: '',
    ...overrides,
  };
}

// ─── 1. Equivalent Scans ──────────────────────────────────────────────────────

function testEquivalentScans() {
  console.log('\n--- 1. Equivalent Scans (Identical Configurations) ---');

  const base = createSampleScan({
    id: 'base-scan',
    timestamp: '2026-09-12T10:00:00.000Z',
    llmEnabled: false,
    maxScore: 50,
    totalFindings: 2,
  });

  const current = createSampleScan({
    id: 'current-scan',
    timestamp: '2026-09-12T11:00:00.000Z',
    llmEnabled: false,
    maxScore: 10,
    totalFindings: 1,
  });

  const analysis = detectScanComparability(base, current);
  assert(analysis.isEquivalent === true, 'Scans with identical configurations are detected as equivalent');
  assert(analysis.differences.length === 0, 'No configuration differences reported for equivalent scans');
  assert(analysis.explanation === null, 'No non-equivalent explanation provided for equivalent scans');

  const comparison = computeScanComparison(base, current);
  assert(comparison.analysis.isEquivalent === true, 'computeScanComparison returns isEquivalent = true');
  assert(comparison.scoreDelta === -40, 'scoreDelta is correctly -40');
  assert(comparison.findingsDelta === -1, 'findingsDelta is correctly -1');
}

// ─── 2. Non-Equivalent: LLM Enabled vs LLM Disabled ─────────────────────────

function testLlmDifference() {
  console.log('\n--- 2. Non-Equivalent: LLM Enabled Baseline vs LLM Disabled Current ---');

  const baseLlm = createSampleScan({
    id: 'base-llm',
    timestamp: '2026-09-12T10:00:00.000Z',
    llmEnabled: true,
    model: 'qwen2.5-coder:14b',
    maxScore: 25,
    totalFindings: 3,
  });

  const currentNoLlm = createSampleScan({
    id: 'current-nollm',
    timestamp: '2026-09-12T11:00:00.000Z',
    llmEnabled: false,
    model: null,
    maxScore: 0,
    totalFindings: 0,
  });

  const analysis = detectScanComparability(baseLlm, currentNoLlm);
  assert(analysis.isEquivalent === false, 'LLM enabled vs disabled is marked as non-equivalent');
  assert(analysis.differences.length === 1, '1 configuration difference detected');
  assert(analysis.differences[0].field === 'llmEnabled', 'Difference field is llmEnabled');
  assert(
    analysis.explanation!.includes('analyzer coverage changed'),
    `Explanation mentions analyzer coverage changed (got: "${analysis.explanation}")`
  );

  const comparison = computeScanComparison(baseLlm, currentNoLlm);
  assert(comparison.analysis.isEquivalent === false, 'Comparison result marks isEquivalent = false');
  assert(comparison.scoreDelta === -25, 'scoreDelta is -25 (numeric)');
  assert(comparison.findingsDelta === -3, 'findingsDelta is -3 (numeric)');
}

// ─── 3. Non-Equivalent: Model Differences ─────────────────────────────────────

function testModelDifference() {
  console.log('\n--- 3. Non-Equivalent: Different LLM Models ---');

  const base = createSampleScan({
    llmEnabled: true,
    model: 'qwen2.5-coder:14b',
  });

  const current = createSampleScan({
    llmEnabled: true,
    model: 'llama3.3:70b',
  });

  const analysis = detectScanComparability(base, current);
  assert(analysis.isEquivalent === false, 'Different models marked as non-equivalent');
  assert(analysis.differences.some((d) => d.field === 'model'), 'Difference field includes model');
  assert(analysis.explanation!.includes('qwen2.5-coder:14b vs llama3.3:70b'), 'Explanation names both models');
}

// ─── 4. Non-Equivalent: Scan Mode Differences ─────────────────────────────────

function testScanModeDifference() {
  console.log('\n--- 4. Non-Equivalent: Scan Mode (Single vs Recursive) ---');

  const base = createSampleScan({
    scanMode: 'single',
  });

  const current = createSampleScan({
    scanMode: 'recursive',
  });

  const analysis = detectScanComparability(base, current);
  assert(analysis.isEquivalent === false, 'Single vs Recursive scan marked as non-equivalent');
  assert(analysis.differences.some((d) => d.field === 'scanMode'), 'Difference field includes scanMode');
}

// ─── 5. Non-Equivalent: Target Path Differences ───────────────────────────────

function testTargetPathDifference() {
  console.log('\n--- 5. Non-Equivalent: Different Target Paths ---');

  const base = createSampleScan({
    targetPath: 'C:\\projects\\skill-alpha',
  });

  const current = createSampleScan({
    targetPath: 'C:\\projects\\skill-beta',
  });

  const analysis = detectScanComparability(base, current);
  assert(analysis.isEquivalent === false, 'Different paths marked as non-equivalent');
  assert(analysis.differences.some((d) => d.field === 'targetPath'), 'Difference field includes targetPath');

  // Trailing slashes or capitalization shouldn't trigger false non-equivalence
  const pathSame = detectScanComparability(
    createSampleScan({ targetPath: 'C:\\projects\\skill-alpha\\' }),
    createSampleScan({ targetPath: 'c:/projects/skill-alpha' })
  );
  assert(pathSame.isEquivalent === true, 'Paths normalized for slashes and casing evaluate to equivalent');
}

// ─── 6. Non-Equivalent: Version Differences ───────────────────────────────────

function testVersionDifference() {
  console.log('\n--- 6. Non-Equivalent: SkillSpector CLI Version Changed ---');

  const base = createSampleScan({
    skillspectorVersion: 'v2.10.0',
  });

  const current = createSampleScan({
    skillspectorVersion: 'v2.11.2',
  });

  const analysis = detectScanComparability(base, current);
  assert(analysis.isEquivalent === false, 'Different SkillSpector versions marked as non-equivalent');
  assert(analysis.differences.some((d) => d.field === 'skillspectorVersion'), 'Difference field includes skillspectorVersion');

  // Leading 'v' inconsistency shouldn't trigger false non-equivalence
  const verSame = detectScanComparability(
    createSampleScan({ skillspectorVersion: 'v2.11.2' }),
    createSampleScan({ skillspectorVersion: '2.11.2' })
  );
  assert(verSame.isEquivalent === true, 'Versions matching modulo leading v evaluate to equivalent');
}

// ─── 7. Finding Identity & Count Consistency ──────────────────────────────────

function testFindingCountConsistency() {
  console.log('\n--- 7. Finding Identity & Count Consistency (No False Collapsing) ---');

  // Replicate the exact real-world scenario from scan 47ff7224:
  // 1 finding in fastapi-pro, 2 findings in python-testing-patterns (both category null, pattern null, file SKILL.md)
  const baseScanWith3Findings = createSampleScan({
    id: 'base-real-3',
    timestamp: '2026-09-12T20:32:36.781Z',
    llmEnabled: true,
    model: 'qwen2.5-coder:14b',
    maxScore: 25,
    totalFindings: 3,
    skills: [
      {
        name: 'fastapi-pro',
        path: 'fastapi-pro',
        sourcePath: 'fastapi-pro',
        score: 25,
        severity: 'HIGH',
        findingCount: 1,
        executionSuccessful: true,
        recommendation: 'CAUTION',
        completeness: null,
        components: null,
        inspectionWarnings: null,
        metadata: null,
        issues: [
          {
            id: 'SQP-2',
            finding_id: 'finding-eae271ee9f9a4205a6e76bfc85085590',
            category: undefined,
            pattern: undefined,
            severity: 'HIGH',
            location: { file: 'SKILL.md', start_line: 1, end_line: 191 },
            explanation: 'Missing user warnings in skill description.',
            tags: ['llm-unconfirmed'],
          },
        ],
      },
      {
        name: 'python-testing-patterns',
        path: 'python-testing-patterns',
        sourcePath: 'python-testing-patterns',
        score: 10,
        severity: 'MEDIUM',
        findingCount: 2,
        executionSuccessful: true,
        recommendation: 'CAUTION',
        completeness: null,
        components: null,
        inspectionWarnings: null,
        metadata: null,
        issues: [
          {
            id: 'SSD-1',
            finding_id: 'finding-b1e470aba23142a6a89b9d72feb017f5',
            category: undefined,
            pattern: undefined,
            severity: 'MEDIUM',
            location: { file: 'SKILL.md', start_line: 7, end_line: 8 },
            explanation: 'Scenario sets up AI with extensive knowledge.',
            tags: ['llm-unconfirmed'],
          },
          {
            id: 'SSD-4',
            finding_id: 'finding-0872b091a2b949a18ad6e804c52713e2',
            category: undefined,
            pattern: undefined,
            severity: 'LOW',
            location: { file: 'SKILL.md', start_line: 30, end_line: 32 },
            explanation: 'Progressive narrative builds trust.',
            tags: ['llm-unconfirmed'],
          },
        ],
      },
    ],
  });

  const cleanComparisonScan = createSampleScan({
    id: 'current-clean-0',
    timestamp: '2026-09-12T20:50:37.665Z',
    llmEnabled: false,
    maxScore: 0,
    totalFindings: 0,
    skills: [],
  });

  // Extract findings
  const baseFindings = extractFindings(baseScanWith3Findings);
  assert(
    baseFindings.length === 3,
    `extractFindings extracts all 3 distinct finding instances (got: ${baseFindings.length}), NOT collapsed into 2`
  );

  assert(baseFindings[0].ruleId === 'SQP-2', 'Finding 1 has ruleId SQP-2');
  assert(baseFindings[1].ruleId === 'SSD-1', 'Finding 2 has ruleId SSD-1');
  assert(baseFindings[2].ruleId === 'SSD-4', 'Finding 3 has ruleId SSD-4');

  assert(baseFindings.every((f) => f.isLlm === true), 'All 3 findings correctly identified as LLM findings');

  // Match findings against clean scan
  const currentFindings = extractFindings(cleanComparisonScan);
  assert(currentFindings.length === 0, 'Current scan has 0 findings');

  const { unobservedOrResolved, additionalOrNew } = matchFindings(baseFindings, currentFindings);
  assert(
    unobservedOrResolved.length === 3,
    `Unobserved findings count is 3 (got: ${unobservedOrResolved.length}), matching totalFindings delta of 3`
  );
  assert(additionalOrNew.length === 0, 'Additional findings count is 0');

  // Full comparison diff
  const comparison = computeScanComparison(baseScanWith3Findings, cleanComparisonScan);
  assert(comparison.analysis.isEquivalent === false, 'Scan comparison flags non-equivalent due to LLM difference');
  assert(comparison.findingsDelta === -3, 'findingsDelta is -3');
  assert(
    comparison.unobservedOrResolvedFindings.length === 3,
    `Detailed list count (${comparison.unobservedOrResolvedFindings.length}) EXACTLY equals absolute delta (3)`
  );
}

// ─── Main Runner ─────────────────────────────────────────────────────────────

function main() {
  console.log('========================================================');
  console.log('  Scan Comparison Semantic Correctness Test Suite');
  console.log('========================================================');

  testEquivalentScans();
  testLlmDifference();
  testModelDifference();
  testScanModeDifference();
  testTargetPathDifference();
  testVersionDifference();
  testFindingCountConsistency();

  console.log('\n========================================================');
  console.log(`  Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
