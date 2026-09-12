import * as path from 'path';
import * as fs from 'fs';
import { detectSkillSpector, validateSkillSpector, detectPython } from '../electron/services/detector';
import { checkOllamaStatus, getOllamaModels } from '../electron/services/ollama';
import { normalizeScanResult } from '../electron/services/runner';

async function runVerification() {
  console.log('=== SkillSpector UI Verification Test ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. SkillSpector Detection
  console.log('\n--- 1. Testing SkillSpector & Python Detection ---');
  const detection = await detectSkillSpector();
  assert(detection.found === true, `SkillSpector found: ${detection.path}`);
  assert(detection.version !== null && detection.version.includes('2.11.2'), `Version validated: ${detection.version}`);
  assert(detection.pythonVersion !== null && detection.pythonVersion.includes('3.12'), `Python detected: ${detection.pythonVersion}`);

  // 2. Ollama Connectivity
  console.log('\n--- 2. Testing Ollama Connectivity ---');
  const ollamaStatus = await checkOllamaStatus('http://localhost:11434');
  assert(ollamaStatus.online === true, `Ollama online at ${ollamaStatus.url}`);

  const models = await getOllamaModels('http://localhost:11434');
  assert(models.length > 0, `Discovered ${models.length} Ollama models`);
  const hasQwen = models.some(m => m.name.includes('qwen2.5-coder:14b'));
  assert(hasQwen, `Preferred model qwen2.5-coder:14b found in Ollama`);

  // 3. Normalization & Three-Tier Warning Separation
  console.log('\n--- 3. Testing Report Normalization & Warning Separation ---');
  const sampleRecursiveReport = {
    multi_skill: true,
    skill_count: 2,
    max_risk_score: 0,
    execution_successful: true,
    risk_recommendation: 'CAUTION',
    analysis_completeness: {
      coverage_percent: 100,
    },
    skills: [
      {
        name: 'apple-design',
        path: 'apple-design',
        risk_score: 0,
        risk_severity: 'LOW',
        finding_count: 0,
        execution_successful: true,
        skill: { name: 'apple-design', source: '/path/apple-design', scanned_at: '2026-09-12T00:00:00Z' },
        issues: [],
        analysis_completeness: {
          total_components: 1,
          scanned_components: 1,
          coverage_percent: 100,
          ledger_exceptions: [
            {
              outcome: 'partial',
              phase: 'reference_resolution',
              reason_code: 'reference_unresolved',
              message: 'A local path-like reference could not be resolved.',
              path: 'SKILL.md',
              start_line: 4,
              end_line: 4,
              fatal: false,
            },
          ],
          analyzer_statuses: [
            { analyzer_id: 'mcp_rug_pull', status: 'completed', planned_work: 1, completed: 1, partial: 0, skipped: 0, failed: 0, unaccounted: 0 },
          ],
        },
      },
    ],
  };

  const normalized = normalizeScanResult({
    id: 'test-scan-123',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\path\\to\\skills',
    scanMode: 'recursive',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: true,
    model: 'qwen2.5-coder:14b',
    rawReport: sampleRecursiveReport,
    scanWarnings: ["WARNING [skillspector.constants] Model 'qwen2.5-coder:14b' not found in model_registry.yaml."],
    stdout: 'Scanning apple-design...',
    stderr: "WARNING [skillspector.constants] Model 'qwen2.5-coder:14b' not found in model_registry.yaml.",
  });

  assert(normalized.skillCount === 1, `Normalized skill count matches (1)`);
  assert(normalized.totalFindings === 0, `Security findings count is 0`);
  assert(normalized.skills[0].inspectionWarnings?.length === 1, `Ledger exception separated as Inspection Warning (count: 1)`);
  assert(normalized.skills[0].inspectionWarnings?.[0].reason_code === 'reference_unresolved', `Ledger exception reason_code is reference_unresolved`);
  assert(normalized.scanWarnings.length === 1, `Runtime warning captured as Scan Warning (count: 1)`);
  assert(normalized.scanWarnings[0].includes('model_registry.yaml'), `Scan warning text preserved`);

  // 4. Verification of Security Findings with issues
  console.log('\n--- 4. Testing True Security Finding Parsing ---');
  const sampleWithFinding = {
    skill: { name: 'test-skill', source: '/path/test-skill', scanned_at: '2026-09-12T00:00:00Z' },
    risk_assessment: { score: 75, severity: 'HIGH', recommendation: 'BLOCK', max_issue_severity: 'HIGH' },
    components: [],
    issues: [
      {
        id: 'SEC-1',
        finding_id: 'finding-123',
        category: 'Prompt Injection',
        pattern: 'jailbreak',
        severity: 'HIGH',
        confidence: 0.9,
        location: { file: 'SKILL.md', start_line: 12, end_line: 14 },
        finding: 'Instruction override detected',
        explanation: 'The prompt instructs the agent to ignore user rules.',
        remediation: 'Remove jailbreak preamble.',
        code_snippet: 'Ignore previous instructions',
        intent: 'malicious',
        tags: [],
        evidence: {},
        match_fingerprint: 'abc123',
      },
    ],
    execution_successful: true,
    analysis_completeness: {
      coverage_percent: 100,
      ledger_exceptions: [],
      analyzer_statuses: [],
    },
  };

  const normalizedSingle = normalizeScanResult({
    id: 'test-scan-single',
    timestamp: new Date().toISOString(),
    targetPath: 'C:\\path\\to\\test-skill',
    scanMode: 'single',
    executionStatus: 'completed',
    skillspectorVersion: '2.11.2',
    llmEnabled: false,
    model: null,
    rawReport: sampleWithFinding,
    scanWarnings: [],
    stdout: '',
    stderr: '',
  });

  assert(normalizedSingle.maxScore === 75, `Risk score matches (75)`);
  assert(normalizedSingle.maxSeverity === 'HIGH', `Risk severity matches (HIGH)`);
  assert(normalizedSingle.totalFindings === 1, `Total findings count is 1`);
  assert(normalizedSingle.skills[0].issues?.length === 1, `Issue parsed in skill details`);
  assert(normalizedSingle.skills[0].issues?.[0].category === 'Prompt Injection', `Finding category is Prompt Injection`);

  console.log(`\n========================================`);
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
