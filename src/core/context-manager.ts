import path from 'path';
import fs from 'fs/promises';
import { ContextBuildError } from './errors';

export interface FileContext {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface CodebaseContext {
  files: FileContext[];
  summary: {
    totalFiles: number;
    totalLines: number;
    languages: Record<string, number>;
    largestFile: string;
    averageFileSize: number;
  };
}

export class ContextManager {
  private static readonly SUPPORTED_EXTENSIONS = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.md': 'markdown'
  };

  private static readonly IGNORED_DIRS = [
    'node_modules', '.git', '.vscode', '.idea', 
    'dist', 'build', 'target', '__pycache__',
    '.next', '.nuxt', 'coverage', '.nyc_output'
  ];

  private static readonly MAX_FILE_SIZE = 100 * 1024; // 100KB max per file

  /**
   * Build context for the entire codebase
   */
  async buildContext(rootDir: string): Promise<CodebaseContext> {
    if (!rootDir || typeof rootDir !== 'string') {
      throw new ContextBuildError('Root directory path is required and must be a string');
    }

    let files: string[];
    try {
      files = await this.scanDirectory(rootDir);
    } catch (error) {
      throw new ContextBuildError(`Failed to scan directory: ${rootDir}`, rootDir);
    }

    if (files.length === 0) {
      throw new ContextBuildError(`No supported files found in directory: ${rootDir}`);
    }

    const fileContexts: FileContext[] = [];

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const language = this.getLanguage(filePath);
        
        // Skip files that are too large
        if (content.length > ContextManager.MAX_FILE_SIZE) {
          continue;
        }

        fileContexts.push({
          path: path.relative(rootDir, filePath),
          content,
          language,
          size: content.length
        });
      } catch (error) {
        // Skip files that can't be read but log the issue
        if (error instanceof Error) {
          console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
        }
        continue;
      }
    }

    if (fileContexts.length === 0) {
      throw new ContextBuildError('No readable files found or all files exceed maximum size limit');
    }

    return {
      files: fileContexts,
      summary: this.generateSummary(fileContexts)
    };
  }

  /**
   * Get a condensed context for AI analysis (most important files only)
   */
  async getCondensedContext(rootDir: string, maxFiles: number = 20): Promise<CodebaseContext> {
    const fullContext = await this.buildContext(rootDir);
    
    // Sort by importance: TypeScript/JavaScript files first, then by size
    const sortedFiles = fullContext.files.sort((a, b) => {
      // Prioritize TS/JS files
      const aIsMainLang = ['typescript', 'javascript'].includes(a.language);
      const bIsMainLang = ['typescript', 'javascript'].includes(b.language);
      
      if (aIsMainLang && !bIsMainLang) return -1;
      if (!aIsMainLang && bIsMainLang) return 1;
      
      // Then by size (larger files first)
      return b.size - a.size;
    });

    const condensedFiles = sortedFiles.slice(0, maxFiles);

    return {
      files: condensedFiles,
      summary: this.generateSummary(condensedFiles)
    };
  }

  /**
   * Format context for AI prompt
   */
  formatForAI(context: CodebaseContext): string {
    let formatted = `# Codebase Analysis Context\n\n`;
    
    // Add summary
    formatted += `## Summary\n`;
    formatted += `- Total files: ${context.summary.totalFiles}\n`;
    formatted += `- Total lines: ${context.summary.totalLines}\n`;
    formatted += `- Languages: ${Object.entries(context.summary.languages)
      .map(([lang, count]) => `${lang} (${count})`)
      .join(', ')}\n\n`;

    // Add file contents
    formatted += `## File Contents\n\n`;
    
    for (const file of context.files) {
      formatted += `### ${file.path} (${file.language})\n`;
      formatted += `\`\`\`${file.language}\n`;
      formatted += file.content;
      formatted += `\n\`\`\`\n\n`;
    }

    return formatted;
  }

  /**
   * Scan directory for supported files
   */
  private async scanDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && !ContextManager.IGNORED_DIRS.includes(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile() && ContextManager.isSupportedFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    await scan(dir);
    return files;
  }

  /**
   * Check if file is supported
   */
  private static isSupportedFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ext in ContextManager.SUPPORTED_EXTENSIONS;
  }

  /**
   * Get language from file path
   */
  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return ContextManager.SUPPORTED_EXTENSIONS[ext as keyof typeof ContextManager.SUPPORTED_EXTENSIONS] || 'text';
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(files: FileContext[]) {
    const languages: Record<string, number> = {};
    let totalLines = 0;
    let largestFile = '';
    let largestSize = 0;

    for (const file of files) {
      // Count languages
      languages[file.language] = (languages[file.language] || 0) + 1;
      
      // Count lines
      const lines = file.content.split('\n').length;
      totalLines += lines;
      
      // Track largest file
      if (file.size > largestSize) {
        largestSize = file.size;
        largestFile = file.path;
      }
    }

    return {
      totalFiles: files.length,
      totalLines,
      languages,
      largestFile,
      averageFileSize: files.length > 0 ? Math.round(files.reduce((sum, f) => sum + f.size, 0) / files.length) : 0
    };
  }
}
