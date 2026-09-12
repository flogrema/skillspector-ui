import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { getHistoryReport } from './history';
import { detectSkillSpector } from './detector';
import { getSettings } from './storage';

/**
 * Exports a stored scan report directly as JSON.
 * Re-scanning is NEVER performed for JSON exports.
 */
export async function exportStoredReport(
  scanId: string,
  outputPath: string
): Promise<boolean> {
  const report = await getHistoryReport(scanId);
  if (!report) {
    throw new Error(`Report not found for scanId: ${scanId}`);
  }

  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }

  await fs.promises.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
  return true;
}

/**
 * Runs a new SkillSpector scan explicitly targeting Markdown or SARIF export.
 * ONLY triggered after explicit user confirmation via the UI confirmation dialog.
 */
export async function runScanAndExport(params: {
  targetPath: string;
  format: 'markdown' | 'sarif';
  outputPath: string;
  recursive: boolean;
  llmEnabled: boolean;
  model?: string;
  ollamaUrl?: string;
}): Promise<boolean> {
  const { targetPath, format, outputPath, recursive, llmEnabled, model, ollamaUrl } = params;

  const settings = await getSettings();
  const detection = await detectSkillSpector(settings.skillspectorPath ?? undefined);
  if (!detection.found || !detection.path) {
    throw new Error('SkillSpector executable not found. Please configure path in Settings.');
  }

  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }

  const args: string[] = ['scan', targetPath, '--format', format, '--output', outputPath];
  if (recursive) {
    args.push('--recursive');
  }
  if (!llmEnabled) {
    args.push('--no-llm');
  }

  const processEnv: Record<string, string | undefined> = { ...process.env };
  if (llmEnabled) {
    processEnv.SKILLSPECTOR_PROVIDER = 'ollama';
    if (model) {
      processEnv.SKILLSPECTOR_MODEL = model;
    }
    const resolvedOllamaUrl = (ollamaUrl ?? settings.ollamaUrl ?? 'http://localhost:11434').replace(/\/+$/, '');
    if (resolvedOllamaUrl !== 'http://localhost:11434') {
      processEnv.OLLAMA_BASE_URL = `${resolvedOllamaUrl}/v1`;
    }
  }

  return new Promise<boolean>((resolve, reject) => {
    const child = spawn(detection.path!, args, {
      shell: false,
      env: processEnv as NodeJS.ProcessEnv,
      windowsHide: true,
    });

    let stderrOutput = '';
    child.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString('utf8');
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start SkillSpector process: ${err.message}`));
    });

    child.on('close', (code) => {
      if (fs.existsSync(outputPath)) {
        resolve(true);
      } else {
        reject(
          new Error(
            `Export failed (exit code ${code}): ${stderrOutput.slice(-300) || 'File was not created.'}`
          )
        );
      }
    });
  });
}
