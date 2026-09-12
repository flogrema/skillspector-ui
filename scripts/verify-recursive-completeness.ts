/**
 * Comprehensive regression test suite for SkillSpector completeness derivation.
 *
 * Verifies all 5 required cases:
 * 1. 7/7 fully inspected → 100% + Complete analysis
 * 2. Mixture of fully/partially inspected → correct aggregate % + Partial coverage
 * 3. Uninspected skills (failed/omitted) → correct aggregate % / incomplete state
 * 4. not_applicable analyzers must not reduce completeness
 * 5. Missing completeness data → Unknown, not 0%
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeScanResult } from '../electron/services/runner';
import {
  deriveRecursiveCompleteness,
  deriveSingleSkillCompleteness,
  getScanCompleteness,
  isAnalysisComplete,
} from '../src/lib/completeness';

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

// ─── Case 1: 7/7 Fully Inspected → 100% + Complete Analysis ──────────────────

function testCase1_SevenSkillsComplete() {
  console.log('\n--- Case 1: 7/7 fully inspected -> 100% + Complete analysis ---');

  // Representative uldum_scan.json structure
  const rawReport = {
    multi_skill: true,
    skill_count: 7,
    max_risk_score: 0,
    execution_successful: true,
    risk_recommendation: 'CAUTION',
    // Raw SkillSpector CLI outputs 0.0 at top level due to ledger exceptions in children
    analysis_completeness: {
      is_complete: false,
      execution_successful: true,
      status: 'partial',
      coverage_percent: 0.0,
      fully_inspected_files: 0,
      partially_inspected_files: 7,
      entirely_uninspected_files: 0,
      total_files: 7,
      limitations: [],
      scope: 'recursive_skills',
    },
    skills_scanned: 7,
    skills_omitted: 0,
    public_finding_records: 0,
    skills: Array.from({ length: 7 }, (_, i) => ({
      name: `skill-${i + 1}`,
      path: `skill-${i + 1}`,
      risk_score: 0,
      risk_severity: 'LOW',
      finding_count: 0,
      execution_successful: true,
      analysis_completeness: {
        total_components: 1,
        scanned_components: 1,
        coverage_percent: 100.0,
        is_complete: false, // CLI flags false due to markdown ref ledger exceptions
        status: 'partial',
        execution_successful: true,
        fully_inspected_files: 1,
        partially_inspected_files: 0,
        entirely_uninspected_files: 0,
        ledger_exceptions: [
          {
            outcome: 'partial',
            phase: 'reference_resolution',
            reason_code: 'reference_unresolved',
            message: 'A local path-like reference could not be resolved.',
            path: 'SKILL.md',
            start_line: 10,
            end_line: 10,
            fatal: false,
          },
        ],
        analyzer_statuses: [
          { analyzer_id: 'artifact_integrity', status: 'completed', planned_work: 1, completed: 1, failed: 0 },
          { analyzer_id: 'behavioral_ast', status: 'not_applicable', reason_code: 'no_applicable_files', planned_work: 0, completed: 0, failed: 0 },
        ],
      },
    })),
  };

  const normalized = normalizeScanResult({
    id: 'test-case-1',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\uldum\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalized.coveragePercent === 100, `Normalized coveragePercent is 100 (got: ${normalized.coveragePercent})`);
  assert(normalized.completenessStatus === 'complete', `Normalized completenessStatus is 'complete' (got: ${normalized.completenessStatus})`);

  const summary = getScanCompleteness(normalized);
  assert(summary.coveragePercent === 100, `UI summary coveragePercent is 100 (got: ${summary.coveragePercent})`);
  assert(summary.completenessStatus === 'complete', `UI summary status is 'complete' (got: ${summary.completenessStatus})`);
  assert(summary.label === 'Complete analysis', `UI summary label is 'Complete analysis' (got: '${summary.label}')`);
}

// ─── Case 2: Mixture of Fully & Partially Inspected ──────────────────────────

function testCase2_MixtureFullyAndPartiallyInspected() {
  console.log('\n--- Case 2: Mixture of fully/partially inspected -> correct aggregate % + Partial coverage ---');

  // 4 skills: 2 complete (100%), 2 partial (50%) -> aggregate = (100 + 100 + 50 + 50) / 4 = 75%
  const rawReport = {
    multi_skill: true,
    skill_count: 4,
    max_risk_score: 10,
    execution_successful: true,
    risk_recommendation: 'CAUTION',
    analysis_completeness: {
      is_complete: false,
      execution_successful: true,
      status: 'partial',
      coverage_percent: 0.0,
      fully_inspected_files: 0,
      partially_inspected_files: 4,
      entirely_uninspected_files: 0,
      total_files: 4,
      limitations: [],
      scope: 'recursive_skills',
    },
    skills_scanned: 4,
    skills_omitted: 0,
    public_finding_records: 0,
    skills: [
      {
        name: 'skill-1',
        path: 'skill-1',
        execution_successful: true,
        analysis_completeness: { coverage_percent: 100.0, fully_inspected_files: 1, partially_inspected_files: 0, entirely_uninspected_files: 0 },
      },
      {
        name: 'skill-2',
        path: 'skill-2',
        execution_successful: true,
        analysis_completeness: { coverage_percent: 100.0, fully_inspected_files: 1, partially_inspected_files: 0, entirely_uninspected_files: 0 },
      },
      {
        name: 'skill-3',
        path: 'skill-3',
        execution_successful: true,
        analysis_completeness: { coverage_percent: 50.0, fully_inspected_files: 1, partially_inspected_files: 1, entirely_uninspected_files: 0 },
      },
      {
        name: 'skill-4',
        path: 'skill-4',
        execution_successful: true,
        analysis_completeness: { coverage_percent: 50.0, fully_inspected_files: 1, partially_inspected_files: 1, entirely_uninspected_files: 0 },
      },
    ],
  };

  const normalized = normalizeScanResult({
    id: 'test-case-2',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalized.coveragePercent === 75, `Normalized coveragePercent is 75 (got: ${normalized.coveragePercent})`);
  assert(normalized.completenessStatus === 'partial', `Normalized completenessStatus is 'partial' (got: ${normalized.completenessStatus})`);

  const summary = getScanCompleteness(normalized);
  assert(summary.coveragePercent === 75, `UI summary coveragePercent is 75`);
  assert(summary.completenessStatus === 'partial', `UI summary status is 'partial'`);
  assert(summary.label === 'Partial coverage (75%)', `UI summary label is 'Partial coverage (75%)' (got: '${summary.label}')`);
}

// ─── Case 3: Uninspected Skills (Failed or Omitted) ──────────────────────────

function testCase3_UninspectedSkills() {
  console.log('\n--- Case 3: Uninspected skills -> correct aggregate % / incomplete state ---');

  // Subcase A: 2 complete, 1 failed, 1 omitted out of 4 total -> (100 + 100 + 0 + 0) / 4 = 50%
  const rawReportWithFailedAndOmitted = {
    multi_skill: true,
    skill_count: 4,
    skills_scanned: 3,
    skills_omitted: 1,
    execution_successful: false,
    risk_recommendation: 'DO_NOT_INSTALL',
    analysis_completeness: {
      is_complete: false,
      execution_successful: false,
      status: 'partial',
      coverage_percent: 0.0,
      fully_inspected_files: 0,
      partially_inspected_files: 2,
      entirely_uninspected_files: 2,
      total_files: 4,
      limitations: ['recursive skill count budget reached'],
      scope: 'recursive_skills',
    },
    skills: [
      {
        name: 'skill-1',
        path: 'skill-1',
        execution_successful: true,
        analysis_completeness: { coverage_percent: 100.0, fully_inspected_files: 1, partially_inspected_files: 0, entirely_uninspected_files: 0 },
      },
      {
        name: 'skill-2',
        path: 'skill-2',
        execution_successful: true,
        analysis_completeness: { coverage_percent: 100.0, fully_inspected_files: 1, partially_inspected_files: 0, entirely_uninspected_files: 0 },
      },
      {
        name: 'skill-3',
        path: 'skill-3',
        execution_successful: false, // Execution failed!
        analysis_completeness: { coverage_percent: 0.0, fully_inspected_files: 0, partially_inspected_files: 0, entirely_uninspected_files: 1 },
      },
    ],
  };

  const normalizedA = normalizeScanResult({
    id: 'test-case-3a',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport: rawReportWithFailedAndOmitted,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalizedA.coveragePercent === 50, `Subcase 3A: coveragePercent is 50% (got: ${normalizedA.coveragePercent}%)`);
  assert(normalizedA.completenessStatus === 'partial', `Subcase 3A: completenessStatus is 'partial'`);

  const summaryA = getScanCompleteness(normalizedA);
  assert(summaryA.label === 'Partial coverage (50%)', `Subcase 3A UI label is 'Partial coverage (50%)' (got: '${summaryA.label}')`);

  // Subcase B: Entirely uninspected scan (all failed) -> 0% coverage, status 'incomplete'
  const rawReportAllFailed = {
    multi_skill: true,
    skill_count: 2,
    skills_scanned: 2,
    skills_omitted: 0,
    execution_successful: false,
    risk_recommendation: 'DO_NOT_INSTALL',
    analysis_completeness: {
      is_complete: false,
      execution_successful: false,
      status: 'incomplete',
      coverage_percent: 0.0,
      fully_inspected_files: 0,
      partially_inspected_files: 0,
      entirely_uninspected_files: 2,
      total_files: 2,
      limitations: [],
      scope: 'recursive_skills',
    },
    skills: [
      { name: 'skill-1', path: 'skill-1', execution_successful: false },
      { name: 'skill-2', path: 'skill-2', execution_successful: false },
    ],
  };

  const normalizedB = normalizeScanResult({
    id: 'test-case-3b',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport: rawReportAllFailed,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalizedB.coveragePercent === 0, `Subcase 3B: coveragePercent is 0% (got: ${normalizedB.coveragePercent}%)`);
  assert(normalizedB.completenessStatus === 'incomplete', `Subcase 3B: completenessStatus is 'incomplete'`);

  const summaryB = getScanCompleteness(normalizedB);
  assert(summaryB.coveragePercent === 0, `Subcase 3B UI coverage is 0%`);
  assert(summaryB.completenessStatus === 'incomplete', `Subcase 3B UI status is 'incomplete'`);
  assert(summaryB.label === 'Incomplete (0%)', `Subcase 3B UI label is 'Incomplete (0%)' (got: '${summaryB.label}')`);
}

// ─── Case 4: not_applicable Analyzers Must Not Reduce Completeness ───────────

function testCase4_NotApplicableAnalyzers() {
  console.log('\n--- Case 4: not_applicable analyzers must not reduce completeness ---');

  const singleSkillReport = {
    skill: { name: 'safe-skill', source: 'C:\\test\\safe-skill', scanned_at: '2026-09-12' },
    execution_successful: true,
    analysis_completeness: {
      total_components: 1,
      scanned_components: 1,
      coverage_percent: 100.0,
      is_complete: false, // In CLI this is false when some analyzers are not applicable!
      status: 'partial',
      execution_successful: true,
      fully_inspected_files: 1,
      partially_inspected_files: 0,
      entirely_uninspected_files: 0,
      analyzer_statuses: [
        { analyzer_id: 'artifact_integrity', status: 'completed', planned_work: 1, completed: 1, failed: 0 },
        { analyzer_id: 'behavioral_ast', status: 'not_applicable', reason_code: 'no_applicable_files', planned_work: 0, completed: 0, failed: 0 },
        { analyzer_id: 'network_surface', status: 'not_applicable', reason_code: 'no_applicable_files', planned_work: 0, completed: 0, failed: 0 },
        { analyzer_id: 'sandbox_execution', status: 'not_applicable', reason_code: 'no_applicable_files', planned_work: 0, completed: 0, failed: 0 },
      ],
      ledger_exceptions: [],
    },
    issues: [],
  };

  // Check low-level validator
  const isComplete = isAnalysisComplete(singleSkillReport.analysis_completeness as any);
  assert(isComplete === true, `isAnalysisComplete is true despite not_applicable analyzers`);

  // Check normalized single scan
  const normalized = normalizeScanResult({
    id: 'test-case-4',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\safe-skill',
    scanMode: 'single',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport: singleSkillReport,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalized.coveragePercent === 100, `Single scan coveragePercent is 100 (got: ${normalized.coveragePercent})`);
  assert(normalized.completenessStatus === 'complete', `Single scan completenessStatus is 'complete' (got: ${normalized.completenessStatus})`);

  const summary = getScanCompleteness(normalized);
  assert(summary.label === 'Complete analysis', `UI label is 'Complete analysis' (got: '${summary.label}')`);
}

// ─── Case 5: Missing Completeness Data → Unknown, Not 0% ──────────────────────

function testCase5_MissingCompletenessData() {
  console.log('\n--- Case 5: Missing completeness data -> Unknown, not 0% ---');

  // Case 5A: Single scan without analysis_completeness
  const singleReportNoCompleteness = {
    skill: { name: 'legacy-skill', source: 'C:\\test\\legacy-skill', scanned_at: '2026-09-12' },
    execution_successful: true,
    issues: [],
  };

  const normalizedSingle = normalizeScanResult({
    id: 'test-case-5a',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\legacy-skill',
    scanMode: 'single',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport: singleReportNoCompleteness,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalizedSingle.coveragePercent === null, `Single scan with missing completeness has coveragePercent = null (got: ${normalizedSingle.coveragePercent})`);
  assert(normalizedSingle.completenessStatus === 'unknown', `Single scan with missing completeness has status = 'unknown'`);

  const summarySingle = getScanCompleteness(normalizedSingle);
  assert(summarySingle.coveragePercent === null, `UI summary coveragePercent is null`);
  assert(summarySingle.completenessStatus === 'unknown', `UI summary status is 'unknown'`);
  assert(summarySingle.label === 'Unknown completeness', `UI summary label is 'Unknown completeness' (got: '${summarySingle.label}'), never '0%' or 'Partial coverage (0%)'`);

  // Case 5B: Recursive scan where neither top-level nor child skills contain completeness data
  const recursiveReportNoCompleteness = {
    multi_skill: true,
    skill_count: 3,
    skills_scanned: 3,
    skills_omitted: 0,
    execution_successful: true,
    skills: [
      { name: 'skill-1', path: 'skill-1', execution_successful: true },
      { name: 'skill-2', path: 'skill-2', execution_successful: true },
      { name: 'skill-3', path: 'skill-3', execution_successful: true },
    ],
  };

  const normalizedRecursive = normalizeScanResult({
    id: 'test-case-5b',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport: recursiveReportNoCompleteness,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalizedRecursive.coveragePercent === null, `Recursive scan with missing completeness has coveragePercent = null`);
  assert(normalizedRecursive.completenessStatus === 'unknown', `Recursive scan with missing completeness has status = 'unknown'`);

  const summaryRecursive = getScanCompleteness(normalizedRecursive);
  assert(summaryRecursive.coveragePercent === null, `Recursive UI summary coveragePercent is null`);
  assert(summaryRecursive.completenessStatus === 'unknown', `Recursive UI summary status is 'unknown'`);
  assert(summaryRecursive.label === 'Unknown completeness', `Recursive UI summary label is 'Unknown completeness' (got: '${summaryRecursive.label}')`);
}

// ─── Case 6: Real-World Uldum Fixture Re-Verification ─────────────────────────

function testRealWorldUldumFixture() {
  console.log('\n--- Real-World Uldum Fixture Normalization ---');

  const candidates = [
    'C:\\Users\\fgm79\\.gemini\\antigravity\\brain\\7eac157b-a3c4-4195-932b-9dad85c958cf\\scratch\\uldum_scan.json',
    path.resolve(process.env.USERPROFILE || 'C:\\Users\\fgm79', '.gemini/antigravity/brain/7eac157b-a3c4-4195-932b-9dad85c958cf/scratch/uldum_scan.json'),
  ];

  let uldumPath = candidates.find((p) => fs.existsSync(p));

  if (!uldumPath) {
    console.log('  [SKIP] uldum_scan.json file not found at expected path');
    return;
  }

  const rawReport = JSON.parse(fs.readFileSync(uldumPath, 'utf8'));

  // Verify that raw SkillSpector report has 0.0 coverage_percent
  assert(rawReport.analysis_completeness.coverage_percent === 0.0, 'Raw fixture has coverage_percent = 0.0');

  const normalized = normalizeScanResult({
    id: 'test-uldum-real',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\test\\uldum\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalized.coveragePercent === 100, `Real-world fixture normalizes to 100% (got: ${normalized.coveragePercent}%)`);
  assert(normalized.completenessStatus === 'complete', `Real-world fixture normalizes to 'complete'`);

  const summary = getScanCompleteness(normalized);
  assert(summary.label === 'Complete analysis', `Real-world fixture summary label is 'Complete analysis'`);
}

// ─── Main Runner ─────────────────────────────────────────────────────────────

function main() {
  console.log('========================================================');
  console.log('  SkillSpector Completeness Regression Test Suite');
  console.log('========================================================');

  testCase1_SevenSkillsComplete();
  testCase2_MixtureFullyAndPartiallyInspected();
  testCase3_UninspectedSkills();
  testCase4_NotApplicableAnalyzers();
  testCase5_MissingCompletenessData();
  testRealWorldUldumFixture();

  console.log('\n========================================================');
  console.log(`  Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
