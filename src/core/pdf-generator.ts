import { promisify } from 'util';
import { exec } from 'child_process';
import { HtmlFormatter } from './html-formatter';
import { MarkdownFormatter } from './markdown-formatter';
import { FontEmbedder } from './font-embedder';
import type { VulnerabilityReport } from '../types';
import puppeteer, { Browser, Page } from 'puppeteer';
import { ErrorHandler, PDFGenerationError } from './errors';


const execAsync = promisify(exec);

export class PDFGenerator {
  private htmlFormatter: HtmlFormatter;

  constructor() {
    this.htmlFormatter = new HtmlFormatter();
  }

  /**
   * Generate PDF report from vulnerability report
   */
  async generatePDF(report: VulnerabilityReport, outputPath: string, options?: {
    customFont?: string;
    autoOpen?: boolean;
    markdown?: boolean;
  }): Promise<void> {
    // Validate inputs
    if (!report) {
      throw new PDFGenerationError('Vulnerability report is required');
    }

    if (!outputPath || typeof outputPath !== 'string') {
      throw new PDFGenerationError('Output path is required and must be a string');
    }

    // Ensure the output path has .pdf extension
    if (!outputPath.toLowerCase().endsWith('.pdf')) {
      outputPath += '.pdf';
    }

    let browser: Browser | null = null;

    try {
      // Generate content
      let htmlContent: string;
      if (options?.markdown) {
        const md = new MarkdownFormatter().toMarkdown(report);
        const markdownIt = (await import('markdown-it')).default;
        const mdRenderer = markdownIt({ html: false, linkify: true, breaks: false });
        const body = mdRenderer.render(md);

        // Use Geist font for markdown mode by default
        const customFont = options?.customFont || 'Geist';
        const fontFamily = FontEmbedder.getPrimaryFontStack(customFont);

        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vibe-Check Security Analysis Report</title>
    <style>
        ${FontEmbedder.generateFontFaces()}

        * { box-sizing: border-box; }
        body {
            font-family: ${fontFamily};
            font-size: 14px;
            line-height: 1.6;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 20px;
            max-width: 100%;
        }

        /* Markdown-specific styles */
        h1, h2, h3, h4, h5, h6 {
            font-family: ${fontFamily};
            font-weight: 600;
            line-height: 1.3;
            margin-top: 24px;
            margin-bottom: 16px;
            color: #111;
        }

        h1 { font-size: 28px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
        h2 { font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
        h3 { font-size: 20px; }
        h4 { font-size: 18px; }

        p {
            margin: 0 0 16px 0;
            font-family: ${fontFamily};
        }

        code {
            font-family: ${FontEmbedder.getMonospaceFontStack()};
            background-color: #f6f8fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 13px;
            color: #d73a49;
        }

        pre {
            background-color: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 16px 0;
        }

        pre code {
            background: none;
            padding: 0;
            color: #24292e;
        }

        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #666;
            font-style: italic;
        }

        ul, ol {
            margin: 0 0 16px 0;
            padding-left: 24px;
        }

        li {
            margin-bottom: 4px;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }

        th {
            background-color: #f6f8fa;
            font-weight: 600;
        }

        hr {
            border: none;
            border-top: 1px solid #eee;
            margin: 24px 0;
        }

        a {
            color: #0366d6;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
${body}
</body>
</html>`;
      } else {
        htmlContent = this.htmlFormatter.formatReportAsHtml(report, { customFont: options?.customFont });
      }

      // Launch browser
      browser = await ErrorHandler.tryAsync(
        () => puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }),
        'Failed to launch browser for PDF generation',
        PDFGenerationError
      );

      // Create new page
      const page = await ErrorHandler.tryAsync(
        () => browser!.newPage(),
        'Failed to create browser page',
        PDFGenerationError
      ) as Page;

      // Set content
      await ErrorHandler.tryAsync(
        () => page.setContent(htmlContent, { waitUntil: 'networkidle0' }),
        'Failed to set HTML content in browser',
        PDFGenerationError
      );

      // Generate PDF
      await ErrorHandler.tryAsync(
        () => page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          },
          displayHeaderFooter: false,
          preferCSSPageSize: true
        }),
        `Failed to generate PDF at path: ${outputPath}`,
        PDFGenerationError
      );

      // Auto-open PDF if requested
      if (options?.autoOpen) {
        await this.openPDF(outputPath);
      }

    } finally {
      // Always close the browser
      if (browser) {
        try {
          await browser.close();
        } catch (error) {
          console.warn('Warning: Failed to close browser properly');
        }
      }
    }
  }

  /**
   * Generate PDF with custom options
   */
  async generatePDFWithOptions(
    report: VulnerabilityReport, 
    outputPath: string, 
    options: {
      format?: 'A4' | 'A3' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
      landscape?: boolean;
      includeBackground?: boolean;
      margins?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
      customFont?: string;
      autoOpen?: boolean;
    } = {}
  ): Promise<void> {
    // Validate inputs
    if (!report) {
      throw new PDFGenerationError('Vulnerability report is required');
    }

    if (!outputPath || typeof outputPath !== 'string') {
      throw new PDFGenerationError('Output path is required and must be a string');
    }

    // Ensure the output path has .pdf extension
    if (!outputPath.toLowerCase().endsWith('.pdf')) {
      outputPath += '.pdf';
    }

    let browser: Browser | null = null;

    try {
      // Generate HTML content
      const htmlContent = this.htmlFormatter.formatReportAsHtml(report, { customFont: options?.customFont });

      // Launch browser
      browser = await ErrorHandler.tryAsync(
        () => puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }),
        'Failed to launch browser for PDF generation',
        PDFGenerationError
      );

      // Create new page
      const page = await ErrorHandler.tryAsync(
        () => browser!.newPage(),
        'Failed to create browser page',
        PDFGenerationError
      ) as Page;

      // Set content
      await ErrorHandler.tryAsync(
        () => page.setContent(htmlContent, { waitUntil: 'networkidle0' }),
        'Failed to set HTML content in browser',
        PDFGenerationError
      );

      // Generate PDF with custom options
      await ErrorHandler.tryAsync(
        () => page.pdf({
          path: outputPath,
          format: options.format || 'A4',
          landscape: options.landscape || false,
          printBackground: options.includeBackground !== false,
          margin: {
            top: options.margins?.top || '20mm',
            right: options.margins?.right || '15mm',
            bottom: options.margins?.bottom || '20mm',
            left: options.margins?.left || '15mm'
          },
          displayHeaderFooter: false,
          preferCSSPageSize: true
        }),
        `Failed to generate PDF at path: ${outputPath}`,
        PDFGenerationError
      );

      // Auto-open PDF if requested
      if (options?.autoOpen) {
        await this.openPDF(outputPath);
      }

    } finally {
      // Always close the browser
      if (browser) {
        try {
          await browser.close();
        } catch (error) {
          console.warn('Warning: Failed to close browser properly');
        }
      }
    }
  }

  /**
   * Open PDF file using system default application
   */
  private async openPDF(filePath: string): Promise<void> {
    try {
      const platform = process.platform;
      let command: string;

      switch (platform) {
        case 'darwin': // macOS
          command = `open "${filePath}"`;
          break;
        case 'win32': // Windows
          command = `start "" "${filePath}"`;
          break;
        default: // Linux and others
          command = `xdg-open "${filePath}"`;
          break;
      }

      await execAsync(command);
    } catch (error) {
      console.warn('Warning: Could not auto-open PDF file:', error);
    }
  }

  /**
   * Check if Puppeteer is available and working
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      await browser.close();
      return true;
    } catch (error) {
      return false;
    }
  }
}
