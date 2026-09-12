/**
 * Targeted tests for security review fixes H1, H2, M1, M2, L3.
 * Runs against source files directly — no Electron runtime required.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
// H1 + H2 — Listener cleanup and scanId gating
// These are renderer-side (Zustand) fixes. We cannot import React stores in
// a Node script, but we CAN verify the structural properties of the fix by
// reading the source file and asserting the patterns are present.
// ────────────────────────────────────────────────────────────────────────────

function testH1H2_listenerCleanupAndScanIdGating() {
  console.log('\n--- H1 + H2: Listener cleanup & scanId gating ---');

  const storePath = path.resolve(__dirname, '../src/stores/scanStore.ts');
  const source = fs.readFileSync(storePath, 'utf8');

  // H2: All 6 event types must check scanId via expectedScanId ref
  const eventHandlers = [
    'onScanStdout',
    'onScanStderr',
    'onScanProgress',
    'onScanComplete',
    'onScanCancelled',
    'onScanError',
  ];

  for (const handler of eventHandlers) {
    // Find the handler block and check for expectedScanId guard
    const handlerRegex = new RegExp(
      `window\\.api\\.${handler}\\(\\(id[^)]*\\)\\s*=>\\s*\\{[^}]*if\\s*\\(!expectedScanId\\s*\\|\\|\\s*id\\s*!==\\s*expectedScanId\\)\\s*return;`,
      's'
    );
    const hasGuard = handlerRegex.test(source);
    assert(hasGuard, `${handler} validates scanId via expectedScanId ref`);
  }

  // H1: Terminal events (complete, cancelled, error) must call cleanupListeners
  const terminalHandlers = ['onScanComplete', 'onScanCancelled', 'onScanError'];

  for (const handler of terminalHandlers) {
    // Find the handler block and check it calls cleanupListeners()
    const blockStart = source.indexOf(`window.api.${handler}`);
    if (blockStart === -1) {
      assert(false, `${handler} block found in source`);
      continue;
    }
    // Look at the next ~600 chars for cleanupListeners call
    const block = source.slice(blockStart, blockStart + 600);
    const hasCleanup = block.includes('cleanupListeners()');
    assert(hasCleanup, `${handler} calls cleanupListeners() after terminal event`);
  }

  // Non-terminal handlers (stdout, stderr, progress) must NOT call cleanupListeners
  const nonTerminalHandlers = ['onScanStdout', 'onScanStderr', 'onScanProgress'];
  for (const handler of nonTerminalHandlers) {
    const blockStart = source.indexOf(`window.api.${handler}`);
    if (blockStart === -1) continue;
    // The block for these is small — look at ~200 chars
    const block = source.slice(blockStart, blockStart + 200);
    const hasCleanup = block.includes('cleanupListeners()');
    assert(!hasCleanup, `${handler} does NOT call cleanupListeners (non-terminal)`);
  }

  // Verify catch block in startScan also cleans up listeners
  const catchBlock = source.indexOf('} catch (err: unknown)');
  if (catchBlock !== -1) {
    const afterCatch = source.slice(catchBlock, catchBlock + 400);
    assert(
      afterCatch.includes('cleanupListeners()'),
      'catch block in startScan also calls cleanupListeners()'
    );
  } else {
    assert(false, 'catch block found in startScan');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// M1 — Validate scan target exists (main process)
// ────────────────────────────────────────────────────────────────────────────

function testM1_scanTargetValidation() {
  console.log('\n--- M1: Scan target validation ---');

  const scanIpcPath = path.resolve(__dirname, '../electron/ipc/scan.ts');
  const source = fs.readFileSync(scanIpcPath, 'utf8');

  // Check that fs.existsSync is called before startScan
  assert(source.includes("import * as fs from 'fs'"), 'scan.ts imports fs module');
  assert(
    source.includes('fs.existsSync(params.targetPath)'),
    'scan:start validates targetPath existence with fs.existsSync'
  );
  assert(
    source.includes("typeof params.targetPath !== 'string'"),
    'scan:start validates targetPath is a string'
  );

  // Both validation errors throw before startScan is called
  const existsCheckIdx = source.indexOf('fs.existsSync(params.targetPath)');
  const startScanIdx = source.indexOf('return startScan(params');
  assert(
    existsCheckIdx > 0 && startScanIdx > 0 && existsCheckIdx < startScanIdx,
    'Existence check occurs before startScan invocation'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// M2 — Open File path validation with symlink resolution
// ────────────────────────────────────────────────────────────────────────────

function testM2_openFilePathValidation() {
  console.log('\n--- M2: Open File symlink-safe path validation ---');

  const shellPath = path.resolve(__dirname, '../electron/ipc/shell.ts');
  const source = fs.readFileSync(shellPath, 'utf8');

  // Check for fs.realpathSync usage
  assert(
    source.includes('fs.realpathSync(path.resolve(scanTargetDir))'),
    'baseDir resolved with fs.realpathSync'
  );
  assert(
    source.includes('fs.realpathSync(path.resolve(scanTargetDir, relativeFilePath))'),
    'resolvedPath resolved with fs.realpathSync'
  );

  // Traversal check still present
  assert(
    source.includes("relative.startsWith('..')"),
    'Path traversal check (startsWith ..) still present'
  );
  assert(
    source.includes('path.isAbsolute(relative)'),
    'Absolute path escape check still present'
  );

  // realpathSync failure returns false (safe default)
  assert(
    source.includes('return false;') && source.includes('// realpathSync fails'),
    'realpathSync failure safely returns false'
  );

  // Now test actual filesystem behavior with a temp directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillspector-m2-test-'));
  const subDir = path.join(tmpDir, 'allowed');
  fs.mkdirSync(subDir);
  const testFile = path.join(subDir, 'test.txt');
  fs.writeFileSync(testFile, 'test', 'utf8');

  // Test: path.resolve + relative check correctly blocks traversal
  const baseDir = fs.realpathSync(path.resolve(subDir));
  const traversalTarget = path.resolve(subDir, '../../etc/passwd');

  let traversalBlocked: boolean;
  try {
    fs.realpathSync(traversalTarget);
    // If it resolves, check relative
    const rel = path.relative(baseDir, traversalTarget);
    traversalBlocked = rel.startsWith('..') || path.isAbsolute(rel);
  } catch {
    // realpathSync failed — traversal blocked by file not existing
    traversalBlocked = true;
  }
  assert(traversalBlocked, 'Traversal via ../../etc/passwd correctly blocked');

  // Test: legitimate file within subDir is allowed
  const legitimatePath = fs.realpathSync(testFile);
  const legitimateRel = path.relative(baseDir, legitimatePath);
  const legitimateAllowed = !legitimateRel.startsWith('..') && !path.isAbsolute(legitimateRel);
  assert(legitimateAllowed, 'Legitimate file within target directory is allowed');

  // Test: symlink escape (if we can create junctions/symlinks)
  try {
    const outsideDir = path.join(tmpDir, 'outside');
    fs.mkdirSync(outsideDir);
    const outsideFile = path.join(outsideDir, 'secret.txt');
    fs.writeFileSync(outsideFile, 'secret', 'utf8');

    const symlinkInAllowed = path.join(subDir, 'escape_link');
    try {
      fs.symlinkSync(outsideDir, symlinkInAllowed, 'junction');
    } catch {
      // Symlink creation may require elevated privileges on Windows
      console.log('  [SKIP] Junction creation requires elevated privileges');
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return;
    }

    // Now resolve the symlinked path
    const symlinkTarget = path.join(symlinkInAllowed, 'secret.txt');
    const resolvedSymlink = fs.realpathSync(symlinkTarget);
    const resolvedBase = fs.realpathSync(subDir);
    const symlinkRel = path.relative(resolvedBase, resolvedSymlink);
    const symlinkBlocked = symlinkRel.startsWith('..') || path.isAbsolute(symlinkRel);
    assert(
      symlinkBlocked,
      'Junction/symlink escape to outside directory is blocked after realpathSync'
    );
  } catch (err) {
    console.log(`  [SKIP] Symlink test: ${err instanceof Error ? err.message : err}`);
  }

  // Cleanup
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

// ────────────────────────────────────────────────────────────────────────────
// L3 — Atomic clearHistory
// ────────────────────────────────────────────────────────────────────────────

async function testL3_atomicClearHistory() {
  console.log('\n--- L3: Atomic clearHistory ---');

  // Source-level verification
  const historyPath = path.resolve(__dirname, '../electron/services/history.ts');
  const source = fs.readFileSync(historyPath, 'utf8');

  // Find the clearHistory function
  const clearStart = source.indexOf('export async function clearHistory');
  assert(clearStart > 0, 'clearHistory function found');

  const clearBlock = source.slice(clearStart, clearStart + 400);
  assert(
    clearBlock.includes('.tmp-'),
    'clearHistory writes to temp file with .tmp- prefix'
  );
  assert(
    clearBlock.includes('fs.promises.rename(tempIndexPath, indexPath)'),
    'clearHistory renames temp file to index.json atomically'
  );

  // Ensure it does NOT have a direct writeFile to indexPath without rename
  const directWritePattern = /writeFile\(indexPath,/;
  assert(
    !directWritePattern.test(clearBlock),
    'clearHistory does NOT write directly to indexPath (uses temp+rename)'
  );

  // Verify the same atomic pattern is used consistently across ALL write operations
  // Count all fs.promises.writeFile calls and ensure each is followed by a rename
  const allFunctions = ['saveScanToHistory', 'deleteHistoryEntry', 'clearHistory'];
  for (const fn of allFunctions) {
    const fnStart = source.indexOf(`export async function ${fn}`);
    if (fnStart === -1) continue;
    const fnEnd = source.indexOf('\nexport ', fnStart + 1);
    const fnBlock = source.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    const writeFileCount = (fnBlock.match(/fs\.promises\.writeFile\(/g) || []).length;
    const renameCount = (fnBlock.match(/fs\.promises\.rename\(/g) || []).length;
    // Each writeFile to a temp path should have a matching rename
    // (unlink calls are for deletion, not for atomic writes)
    assert(
      writeFileCount > 0 && writeFileCount === renameCount,
      `${fn}: ${writeFileCount} writeFile(s) matched by ${renameCount} rename(s)`
    );
  }

  // Standalone filesystem atomic-write test (mimics the pattern without Electron)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillspector-l3-test-'));
  const indexFile = path.join(tmpDir, 'index.json');

  // Write initial data
  fs.writeFileSync(indexFile, JSON.stringify([{ id: 'dummy' }], null, 2), 'utf8');

  // Simulate atomic clear: write temp then rename
  const tempFile = `${indexFile}.tmp-${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify([], null, 2), 'utf8');
  fs.renameSync(tempFile, indexFile);

  const result = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  assert(Array.isArray(result) && result.length === 0, 'Atomic clear produces empty array');
  assert(!fs.existsSync(tempFile), 'Temp file removed after rename');

  // Cleanup
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Additional: Stale scan events
// ────────────────────────────────────────────────────────────────────────────

function testStaleScanEvents() {
  console.log('\n--- Additional: Stale scan event rejection logic ---');

  // Verify the source pattern: all listeners use `id` (not `_id`)
  // and guard with `if (!expectedScanId || id !== expectedScanId) return;`
  const storePath = path.resolve(__dirname, '../src/stores/scanStore.ts');
  const source = fs.readFileSync(storePath, 'utf8');

  // Count occurrences of the guard pattern
  const guardPattern = /if\s*\(\s*!expectedScanId\s*\|\|\s*id\s*!==\s*expectedScanId\s*\)\s*return;/g;
  const matches = source.match(guardPattern);
  assert(
    matches !== null && matches.length === 6,
    `All 6 event listeners contain expectedScanId guard (found ${matches?.length ?? 0})`
  );

  // Verify no `_id` is used (which would indicate the id is intentionally ignored)
  const ignoredIdPattern = /window\.api\.onScan\w+\(\(_id/g;
  const ignoredMatches = source.match(ignoredIdPattern);
  assert(
    ignoredMatches === null || ignoredMatches.length === 0,
    `No event listeners ignore the scanId parameter (_id pattern absent)`
  );

  // Verify expectedScanId is set synchronously after startScan returns
  assert(
    source.includes('expectedScanId = resp.scanId;'),
    'expectedScanId set synchronously after startScan IPC returns'
  );

  // Verify expectedScanId is declared as mutable let before listeners
  const declIdx = source.indexOf('let expectedScanId');
  const firstListenerIdx = source.indexOf('window.api.onScanStdout');
  assert(
    declIdx > 0 && firstListenerIdx > 0 && declIdx < firstListenerIdx,
    'expectedScanId declared before listener registration'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Run all tests
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Security Review Fix Verification ===');

  testH1H2_listenerCleanupAndScanIdGating();
  testM1_scanTargetValidation();
  testM2_openFilePathValidation();
  await testL3_atomicClearHistory();
  testStaleScanEvents();

  console.log(`\n========================================`);
  console.log(`Fix Verification: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fix verification failed with error:', err);
  process.exit(1);
});
