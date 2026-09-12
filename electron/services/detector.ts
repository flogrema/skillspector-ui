import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { SkillSpectorStatus } from '../types';

/**
 * Execute a process safely with spawn (shell: false) and collect stdout/stderr.
 */
function runProcess(
  exePath: string,
  args: string[],
  timeoutMs = 10000
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    try {
      const child = spawn(exePath, args, {
        shell: false,
        windowsHide: true,
      });

      timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            child.kill();
          } catch {
            // ignore
          }
          resolve({ stdout, stderr, exitCode: null });
        }
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', () => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          resolve({ stdout, stderr, exitCode: null });
        }
      });

      child.on('close', (code) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          resolve({ stdout, stderr, exitCode: code });
        }
      });
    } catch {
      if (!settled) {
        settled = true;
        if (timer) clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: null });
      }
    }
  });
}

/**
 * Check PATH using where.exe for skillspector
 */
async function findInPath(): Promise<string | null> {
  const candidates = ['skillspector.exe', 'skillspector'];
  for (const candidate of candidates) {
    const res = await runProcess('where.exe', [candidate]);
    if (res.exitCode === 0 && res.stdout) {
      const lines = res.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (fs.existsSync(line)) {
          return line;
        }
      }
    }
  }
  return null;
}

/**
 * Validate skillspector executable by running `--version`.
 * Parses output such as "SkillSpector v2.11.2".
 */
export async function validateSkillSpector(exePath: string): Promise<{ valid: boolean; version: string | null }> {
  if (!exePath || !fs.existsSync(exePath)) {
    return { valid: false, version: null };
  }

  const res = await runProcess(exePath, ['--version']);
  const combined = `${res.stdout}\n${res.stderr}`;
  const match = combined.match(/SkillSpector\s+(v?[\d.]+)/i);
  if (match) {
    const version = match[1].startsWith('v') ? match[1] : `v${match[1]}`;
    return { valid: true, version };
  }

  return { valid: false, version: null };
}

/**
 * Detect Python in the same directory as skillspector.exe.
 * Runs `python.exe --version` and parses "Python 3.12.13".
 * Returns version string or null if unavailable.
 */
export async function detectPython(exePath: string): Promise<string | null> {
  if (!exePath) return null;
  const dir = path.dirname(exePath);
  const pythonPath = path.join(dir, 'python.exe');
  if (!fs.existsSync(pythonPath)) {
    return null;
  }

  const res = await runProcess(pythonPath, ['--version']);
  const combined = `${res.stdout}\n${res.stderr}`;
  const match = combined.match(/Python\s+([\d.]+)/i);
  return match ? match[1] : null;
}

/**
 * Detect SkillSpector installation:
 * 1. Checks customPath if provided
 * 2. Checks PATH via where.exe
 * 3. Checks known installation path
 * 4. Checks nearby .venv\Scripts\skillspector.exe
 */
export async function detectSkillSpector(customPath?: string): Promise<SkillSpectorStatus> {
  const candidatePaths: string[] = [];

  if (customPath && customPath.trim().length > 0) {
    candidatePaths.push(customPath.trim());
  }

  // Known path
  candidatePaths.push(
    'C:\\Users\\fgm79\\Meine Dokumente\\Coding\\Projekte\\0xFloCode\\apps\\skillspector\\.venv\\Scripts\\skillspector.exe'
  );

  // Nearby candidate paths
  candidatePaths.push(
    path.resolve(process.cwd(), '../skillspector/.venv/Scripts/skillspector.exe'),
    path.resolve(process.cwd(), '.venv/Scripts/skillspector.exe'),
    path.resolve(__dirname, '../../skillspector/.venv/Scripts/skillspector.exe'),
    path.resolve(__dirname, '../../../skillspector/.venv/Scripts/skillspector.exe')
  );

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      const validation = await validateSkillSpector(candidate);
      if (validation.valid) {
        const pythonVersion = await detectPython(candidate);
        return {
          found: true,
          path: candidate,
          version: validation.version,
          pythonVersion,
        };
      }
    }
  }

  // Check PATH
  const fromPath = await findInPath();
  if (fromPath) {
    const validation = await validateSkillSpector(fromPath);
    if (validation.valid) {
      const pythonVersion = await detectPython(fromPath);
      return {
        found: true,
        path: fromPath,
        version: validation.version,
        pythonVersion,
      };
    }
  }

  return {
    found: false,
    path: null,
    version: null,
    pythonVersion: null,
  };
}

/**
 * Validate a user-specified SkillSpector path.
 */
export async function testSkillSpectorPath(exePath: string): Promise<SkillSpectorStatus> {
  if (!exePath || !fs.existsSync(exePath)) {
    return {
      found: false,
      path: exePath || null,
      version: null,
      pythonVersion: null,
    };
  }

  const validation = await validateSkillSpector(exePath);
  if (validation.valid) {
    const pythonVersion = await detectPython(exePath);
    return {
      found: true,
      path: exePath,
      version: validation.version,
      pythonVersion,
    };
  }

  return {
    found: false,
    path: exePath,
    version: null,
    pythonVersion: null,
  };
}
