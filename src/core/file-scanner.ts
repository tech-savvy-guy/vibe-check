import path from 'path';
import fs from 'fs/promises';

export class FileScanner {
  private static readonly SUPPORTED_EXTENSIONS = ['.js', '.ts', '.py'];
  private static readonly IGNORED_DIRS = ['node_modules', '.git', '.vscode', 'dist', 'build'];

  /**
   * Scan directory recursively for supported files
   */
  async scanDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && !FileScanner.IGNORED_DIRS.includes(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile() && FileScanner.isSupportedFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    await scan(dir);
    return files;
  }

  /**
   * Check if file extension is supported
   */
  private static isSupportedFile(filename: string): boolean {
    return FileScanner.SUPPORTED_EXTENSIONS.some(ext => filename.endsWith(ext));
  }
}
