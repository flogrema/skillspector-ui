import { clipboard, ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export function registerShellHandlers(): void {
  ipcMain.handle(
    'shell:open-file',
    async (
      _event,
      scanTargetDir: string,
      relativeFilePath: string
    ): Promise<boolean> => {
      try {
        if (!scanTargetDir || !relativeFilePath) {
          return false;
        }

        // Resolve symlinks/junctions to prevent traversal via symlink targets
        let baseDir: string;
        let resolvedPath: string;
        try {
          baseDir = fs.realpathSync(path.resolve(scanTargetDir));
          resolvedPath = fs.realpathSync(path.resolve(scanTargetDir, relativeFilePath));
        } catch {
          // realpathSync fails if path doesn't exist
          return false;
        }

        const relative = path.relative(baseDir, resolvedPath);

        // Disallow path traversal outside scanTargetDir
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          return false;
        }

        const openError = await shell.openPath(resolvedPath);
        return openError === '';
      } catch {
        return false;
      }
    }
  );

  ipcMain.handle('shell:copy-text', async (_event, text: string): Promise<void> => {
    clipboard.writeText(text || '');
  });
}
