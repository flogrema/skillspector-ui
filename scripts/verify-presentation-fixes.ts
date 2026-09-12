/**
 * Targeted tests for:
 * 1. Completeness badge logic (isAnalysisComplete):
 *    - not_applicable analyzers do NOT cause "Partial Coverage"
 *    - coverage 100%, fully inspected > 0, partially inspected = 0, uninspected = 0, no applicable analyzer failed => Complete
 *    - failure when coverage < 100, partial > 0, uninspected > 0, or applicable analyzer failed
 *    - does not infer completion from analyzer count alone
 * 2. Warning grouping logic (groupWarnings, normalizeWarningMessage):
 *    - repeated warning messages grouped with correct count
 *    - normalized message stripping timestamps/whitespace
 *    - underlying raw lines preserved completely and unaltered
 */

import { isAnalysisComplete } from '../src/lib/completeness';
import { groupWarnings, normalizeWarningMessage } from '../src/lib/warnings';
import type { AnalysisCompleteness } from '../src/types/api';

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

// ────────────────────────────────────────────────────────────────────────────
// 1. Completeness Badge & Data Tests
// ────────────────────────────────────────────────────────────────────────────

function testCompletenessBadgeLogic() {
  console.log('\n--- 1. Completeness Badge & Data Logic ---');

  // Case A: Ideal SkillSpector report where is_complete was false in JSON,
  // but coverage is 100%, fully inspected = 1, partial = 0, uninspected = 0,
  // and non-applicable analyzers exist (e.g. behavioral_ast, taint tracking).
  // Must show "Complete"!
  const uldumLikeCompleteness: AnalysisCompleteness = {
    total_components: 1,
    scanned_components: 1,
    coverage_percent: 100.0,
    is_complete: false, // SkillSpector raw report had false here!
    status: 'partial',
    execution_successful: true,
    fully_inspected_files: 1,
    partially_inspected_files: 0,
    entirely_uninspected_files: 0,
    ledger_exceptions: [],
    scope_exclusions: [],
    analyzer_statuses: [
      {
        analyzer_id: 'artifact_integrity',
        status: 'completed',
        planned_work: 1,
        completed: 1,
        partial: 0,
        skipped: 0,
        failed: 0,
        unaccounted: 0,
      },
      {
        analyzer_id: 'behavioral_ast',
        status: 'not_applicable',
        planned_work: 0,
        completed: 0,
        partial: 0,
        skipped: 0,
        failed: 0,
        unaccounted: 0,
        reason_code: 'no_applicable_files',
        message: "No files matched this analyzer's applicability contract.",
      },
      {
        analyzer_id: 'behavioral_taint_tracking',
        status: 'not_applicable',
        planned_work: 0,
        completed: 0,
        partial: 0,
        skipped: 0,
        failed: 0,
        unaccounted: 0,
        reason_code: 'no_applicable_files',
      },
    ],
  };

  assert(
    isAnalysisComplete(uldumLikeCompleteness) === true,
    'not_applicable analyzers do not cause "Partial Coverage" when files are fully inspected'
  );

  // Case B: Applicable analyzer failed -> Must NOT be complete
  const failedAnalyzerCompleteness: AnalysisCompleteness = {
    ...uldumLikeCompleteness,
    analyzer_statuses: [
      {
        analyzer_id: 'artifact_integrity',
        status: 'failed',
        planned_work: 1,
        completed: 0,
        partial: 0,
        skipped: 0,
        failed: 1,
        unaccounted: 0,
        message: 'Syntax parse error',
      },
      {
        analyzer_id: 'behavioral_ast',
        status: 'not_applicable',
        planned_work: 0,
        completed: 0,
        partial: 0,
        skipped: 0,
        failed: 0,
        unaccounted: 0,
      },
    ],
  };

  assert(
    isAnalysisComplete(failedAnalyzerCompleteness) === false,
    'Failed applicable analyzer correctly causes Partial Coverage'
  );

  // Case C: Partially inspected files > 0 -> Must NOT be complete
  const partiallyInspectedCompleteness: AnalysisCompleteness = {
    ...uldumLikeCompleteness,
    fully_inspected_files: 1,
    partially_inspected_files: 1,
  };

  assert(
    isAnalysisComplete(partiallyInspectedCompleteness) === false,
    'partially_inspected_files > 0 causes Partial Coverage'
  );

  // Case D: Entirely uninspected files > 0 -> Must NOT be complete
  const uninspectedCompleteness: AnalysisCompleteness = {
    ...uldumLikeCompleteness,
    entirely_uninspected_files: 1,
  };

  assert(
    isAnalysisComplete(uninspectedCompleteness) === false,
    'entirely_uninspected_files > 0 causes Partial Coverage'
  );

  // Case E: Coverage < 100 -> Must NOT be complete
  const lowCoverageCompleteness: AnalysisCompleteness = {
    ...uldumLikeCompleteness,
    coverage_percent: 75.0,
  };

  assert(
    isAnalysisComplete(lowCoverageCompleteness) === false,
    'coverage_percent < 100 causes Partial Coverage'
  );

  // Case F: fully_inspected_files = 0 -> Must NOT be complete
  const zeroInspectedCompleteness: AnalysisCompleteness = {
    ...uldumLikeCompleteness,
    fully_inspected_files: 0,
  };

  assert(
    isAnalysisComplete(zeroInspectedCompleteness) === false,
    'fully_inspected_files = 0 causes Partial Coverage'
  );

  // Case G: Explicit is_complete: true in report -> Complete
  const explicitComplete: AnalysisCompleteness = {
    ...uldumLikeCompleteness,
    is_complete: true,
  };

  assert(
    isAnalysisComplete(explicitComplete) === true,
    'Explicit is_complete: true produces Complete'
  );

  // Case H: Null / undefined safety
  assert(isAnalysisComplete(null) === false, 'null completeness returns false');
  assert(isAnalysisComplete(undefined) === false, 'undefined completeness returns false');
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Warning Grouping & Normalization Tests
// ────────────────────────────────────────────────────────────────────────────

function testWarningGroupingLogic() {
  console.log('\n--- 2. Warning Grouping & Normalization Logic ---');

  // Test message normalization
  const withTimestamp = '2026-09-12 19:26:13,243 - WARNING [skillspector.constants] Model not found';
  const withoutTimestamp = 'WARNING [skillspector.constants] Model not found';
  assert(
    normalizeWarningMessage(withTimestamp) === withoutTimestamp,
    'normalizeWarningMessage strips leading timestamp'
  );

  // Test grouping repeated warnings
  const repeatedWarnings = [
    "WARNING [skillspector.constants] Model 'qwen2.5-coder:14b' not found in model_registry.yaml.",
    "WARNING [skillspector.constants] Model 'qwen2.5-coder:14b' not found in model_registry.yaml.",
    "WARNING [skillspector.constants] Model 'qwen2.5-coder:14b' not found in model_registry.yaml.",
    'WARNING [skillspector.runner] Context length fallback to 8192 tokens.',
    'WARNING [skillspector.runner] Context length fallback to 8192 tokens.',
    'WARNING [skillspector.config] Unknown configuration key: custom_foo',
  ];

  const grouped = groupWarnings(repeatedWarnings);

  assert(grouped.length === 3, `3 unique warning causes identified (found ${grouped.length})`);

  const modelWarningGroup = grouped.find((g) => g.key.includes('model_registry'));
  assert(
    modelWarningGroup !== undefined && modelWarningGroup.count === 3,
    'Repeated model registry warning has count === 3'
  );

  const contextWarningGroup = grouped.find((g) => g.key.includes('Context length fallback'));
  assert(
    contextWarningGroup !== undefined && contextWarningGroup.count === 2,
    'Repeated context length warning has count === 2'
  );

  const configWarningGroup = grouped.find((g) => g.key.includes('custom_foo'));
  assert(
    configWarningGroup !== undefined && configWarningGroup.count === 1,
    'Single config warning has count === 1'
  );

  // Verify that all original raw lines are completely preserved in rawLines
  assert(
    modelWarningGroup !== undefined && modelWarningGroup.rawLines.length === 3,
    'All raw lines preserved in rawLines array without suppression'
  );
  assert(
    modelWarningGroup !== undefined &&
      modelWarningGroup.rawLines[0] === repeatedWarnings[0] &&
      modelWarningGroup.rawLines[1] === repeatedWarnings[1],
    'Underlying raw warning content is unaltered'
  );

  // Test timestamp variation grouping
  const warningsWithDifferentTimestamps = [
    '2026-09-12 10:00:01 WARNING [skillspector] Same error',
    '2026-09-12 10:00:02 WARNING [skillspector] Same error',
  ];
  const timestampGrouped = groupWarnings(warningsWithDifferentTimestamps);
  assert(
    timestampGrouped.length === 1 && timestampGrouped[0].count === 2,
    'Warnings differing only by timestamp group together by normalized cause'
  );

  // Test null / empty lines are safely ignored
  const dirtyList = [null, '', '   ', 'WARNING test'];
  const cleanGrouped = groupWarnings(dirtyList);
  assert(cleanGrouped.length === 1, 'Empty and null entries safely ignored');
}

// ────────────────────────────────────────────────────────────────────────────
// Main Runner
// ────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('=== Presentation Fixes Verification ===');

  testCompletenessBadgeLogic();
  testWarningGroupingLogic();

  console.log(`\n========================================`);
  console.log(`Presentation Verification: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
