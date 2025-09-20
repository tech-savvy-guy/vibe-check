import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module (compatible with both ESM and CJS)
let __dirname: string;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
} catch {
  // Fallback for CommonJS - try to get current directory
  __dirname = process.cwd();
}

export class FontEmbedder {
  private static fontCache = new Map<string, string>();

  /**
   * Get base64 encoded font data
   */
  private static getFontBase64(fontPath: string): string {
    if (this.fontCache.has(fontPath)) {
      return this.fontCache.get(fontPath)!;
    }

    try {
      // Try multiple possible paths for fonts
      const possiblePaths = [
        join(__dirname, '..', 'fonts', fontPath), // Development path
        join(__dirname, 'fonts', fontPath),       // Built distribution path
        join(__dirname, '..', '..', 'fonts', fontPath) // Alternative path
      ];

      let fullPath = '';
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          fullPath = path;
          break;
        }
      }

      if (!fullPath) {
        throw new Error(`Font file not found in any expected location: ${fontPath}`);
      }

      const fontBuffer = readFileSync(fullPath);
      const base64 = fontBuffer.toString('base64');
      this.fontCache.set(fontPath, base64);
      return base64;
    } catch (error) {
      console.warn(`Warning: Could not load font ${fontPath}:`, error);
      return '';
    }
  }

  /**
   * Generate CSS @font-face declarations for embedded fonts
   */
  static generateFontFaces(): string {
    const fonts = [
      {
        family: 'Geist',
        file: 'Geist.ttf',
        weight: '300 700',
        style: 'normal'
      },
      {
        family: 'GeistMono',
        file: 'GeistMono.ttf',
        weight: '400 600',
        style: 'normal'
      },
      {
        family: 'JetBrainsMono',
        file: 'JetBrainsMono.ttf',
        weight: '400 600',
        style: 'normal'
      }
    ];

    return fonts
      .map(font => {
        const base64 = this.getFontBase64(font.file);
        if (!base64) return '';

        return `
        @font-face {
          font-family: '${font.family}';
          font-style: ${font.style};
          font-weight: ${font.weight};
          font-display: swap;
          src: url(data:font/truetype;charset=utf-8;base64,${base64}) format('truetype');
        }`;
      })
      .filter(css => css.length > 0)
      .join('\n');
  }

  /**
   * Get the primary font stack with local fonts
   */
  static getPrimaryFontStack(customFont?: string): string {
    if (customFont) {
      return `'${customFont}', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
    }
    return "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  }

  /**
   * Get the monospace font stack with local fonts
   */
  static getMonospaceFontStack(): string {
    return "'JetBrainsMono', 'GeistMono', 'SF Mono', Consolas, 'Liberation Mono', monospace";
  }

  /**
   * Check if local fonts are available
   */
  static checkFontsAvailable(): boolean {
    try {
      const possiblePaths = [
        join(__dirname, '..', 'fonts', 'Geist.ttf'),
        join(__dirname, 'fonts', 'Geist.ttf'),
        join(__dirname, '..', '..', 'fonts', 'Geist.ttf')
      ];

      for (const path of possiblePaths) {
        if (existsSync(path)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}
