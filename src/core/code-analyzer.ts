import { z } from 'zod';
import { generateObject } from 'ai';
import type { Vulnerability } from '../types';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ContextManager, type CodebaseContext } from './context-manager';
import { 
  ErrorHandler,
  AIAnalysisError, 
  ValidationError, 
  FileProcessingError,
} from './errors';

interface Config {
  apiKey: string;
  model: string;
}

// Define schemas for structured output
const VulnerabilitySchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  file: z.string().describe('Relative path to the file'),
  line: z.number().describe('Line number where the issue occurs'),
  description: z.string().describe('Clear description of the vulnerability'),
  recommendation: z.string().describe('Specific actionable recommendation to fix it'),
});

const SecurityAnalysisSchema = z.object({
  vulnerabilities: z.array(VulnerabilitySchema),
  summary: z.object({
    totalIssues: z.number(),
    criticalFindings: z.array(z.string()).describe('Most critical security findings'),
    overallRisk: z.enum(['low', 'medium', 'high']).describe('Overall security risk level'),
  }),
});

export class CodeAnalyzer {
  private contextManager: ContextManager;
  private openrouter: any;

  constructor(private config: Config) {
    this.contextManager = new ContextManager();
    this.openrouter = createOpenRouter({
      apiKey: config.apiKey,
    });
  }

  /**
   * Analyze entire codebase using AI with structured output
   */
  async analyzeCodebase(rootDir: string): Promise<Vulnerability[]> {
    // Validate inputs
    if (!rootDir || typeof rootDir !== 'string') {
      throw new ValidationError('Root directory path is required and must be a string');
    }

    if (!this.config.apiKey) {
      throw new ValidationError('API key is required for AI analysis');
    }

    if (!this.config.model) {
      throw new ValidationError('Model configuration is required for AI analysis');
    }

    // Get condensed context for AI analysis
    const context = await ErrorHandler.tryAsync(
      () => this.contextManager.getCondensedContext(rootDir, 15),
      'Failed to build codebase context for AI analysis',
      AIAnalysisError
    );

    if (!context.files.length) {
      throw new AIAnalysisError('No supported files found in the specified directory');
    }

    // Use structured output for reliable parsing
    const result = await ErrorHandler.tryAsync(
      async () => {
        return await generateObject({
          model: this.openrouter.chat(this.config.model),
          schema: SecurityAnalysisSchema as any,
          prompt: this.buildStructuredAnalysisPrompt(context),
        });
      },
      'AI analysis request failed',
      AIAnalysisError
    );

    // Validate the AI response
    if (!result.object || !Array.isArray(result.object.vulnerabilities)) {
      throw new AIAnalysisError('Invalid response format from AI analysis');
    }

    return result.object.vulnerabilities;
  }

  /**
   * Analyze a single file (legacy method for compatibility)
   */
  async analyzeFile(filePath: string): Promise<Vulnerability[]> {
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('File path is required and must be a string');
    }

    try {
      return await this.basicFileAnalysis(filePath);
    } catch (error) {
      if (error instanceof Error) {
        throw new FileProcessingError(`Failed to analyze file: ${filePath}`, filePath);
      }
      throw new FileProcessingError(`Failed to analyze file: ${filePath}`, filePath);
    }
  }

  /**
   * Build structured analysis prompt for AI
   */
  private buildStructuredAnalysisPrompt(context: CodebaseContext): string {
    const contextPrompt = this.contextManager.formatForAI(context);
    
    return `You are a senior security engineer conducting a comprehensive security audit of a codebase.

${contextPrompt}

Analyze this codebase for security vulnerabilities and provide a structured response with:

1. **vulnerabilities**: Array of specific security issues found, each with:
   - severity: "high", "medium", or "low" 
   - file: relative path to the file
   - line: line number where issue occurs
   - description: clear explanation of the vulnerability
   - recommendation: specific fix for the issue

2. **summary**: Overall assessment with:
   - totalIssues: total number of vulnerabilities found
   - criticalFindings: array of most critical security findings
   - overallRisk: "low", "medium", or "high" risk level

Focus on these security areas:
- **Authentication & Authorization**: Weak auth, missing access controls, privilege escalation
- **Input Validation**: SQL injection, XSS, command injection, path traversal
- **Cryptography**: Weak encryption, hardcoded keys, insecure random generation
- **Configuration**: Exposed secrets, debug mode, insecure defaults
- **Dependencies**: Known vulnerable packages, outdated libraries
- **Business Logic**: Race conditions, improper error handling, information disclosure
- **Infrastructure**: Insecure network configs, missing security headers

Be thorough but practical. Only report real security issues, not style preferences. 
Provide specific line numbers where possible and actionable recommendations.`;
  }

  /**
   * Tool: Check for specific security patterns
   */
  private checkSpecificPattern(pattern: string, code: string): { findings: string[] } {
    const findings: string[] = [];
    const lines = code.split('\n');

    switch (pattern.toLowerCase()) {
      case 'sql_injection':
        lines.forEach((line, index) => {
          if (this.hasSQLInjectionRisk(line)) {
            findings.push(`Line ${index + 1}: Potential SQL injection risk - ${line.trim()}`);
          }
        });
        break;
      
      case 'xss':
        lines.forEach((line, index) => {
          if (line.includes('innerHTML') || line.includes('dangerouslySetInnerHTML')) {
            findings.push(`Line ${index + 1}: XSS risk with innerHTML - ${line.trim()}`);
          }
        });
        break;
      
      case 'hardcoded_secrets':
        lines.forEach((line, index) => {
          if (this.hasHardcodedSecret(line)) {
            findings.push(`Line ${index + 1}: Hardcoded secret detected - ${line.trim()}`);
          }
        });
        break;
      
      default:
        findings.push(`Pattern '${pattern}' not implemented`);
    }

    return { findings };
  }

  /**
   * Tool: Analyze package dependencies
   */
  private analyzeDependencies(packageJsonContent: string): { vulnerabilities: string[] } {
    const vulnerabilities: string[] = [];
    
    try {
      const packageJson = JSON.parse(packageJsonContent);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for known vulnerable packages (simplified)
      const knownVulnerable = [
        'lodash', 'moment', 'request', 'node-uuid', 'growl',
        'debug', 'ms', 'fresh', 'negotiator'
      ];
      
      Object.keys(dependencies).forEach(dep => {
        if (knownVulnerable.includes(dep)) {
          vulnerabilities.push(`Potentially vulnerable dependency: ${dep}@${dependencies[dep]}`);
        }
      });
      
    } catch (error) {
      vulnerabilities.push('Failed to parse package.json');
    }
    
    return { vulnerabilities };
  }

  // Removed fallback analysis - AI-only approach with proper error handling

  /**
   * Basic file analysis for single files (for legacy compatibility only)
   */
  private async basicFileAnalysis(filePath: string): Promise<Vulnerability[]> {
    const fs = await import('fs/promises');
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new FileProcessingError(`Failed to read file: ${filePath}`, filePath);
    }
    
    return this.basicContentAnalysis(content, filePath);
  }

  /**
   * Basic content analysis (fallback)
   */
  private basicContentAnalysis(content: string, filePath: string): Vulnerability[] {
    const issues: Vulnerability[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for hardcoded secrets
      if (this.hasHardcodedSecret(line)) {
        issues.push({
          severity: 'high',
          file: filePath,
          line: lineNum,
          description: 'Potential hardcoded secret detected',
          recommendation: 'Use environment variables or secure credential storage'
        });
      }

      // Check for eval usage
      if (line.includes('eval(')) {
        issues.push({
          severity: 'high',
          file: filePath,
          line: lineNum,
          description: 'Use of eval() function detected',
          recommendation: 'Avoid using eval() as it can execute malicious code'
        });
      }

      // Check for innerHTML usage
      if (line.includes('innerHTML')) {
        issues.push({
          severity: 'medium',
          file: filePath,
          line: lineNum,
          description: 'Use of innerHTML detected',
          recommendation: 'Use textContent or createElement for safer DOM manipulation'
        });
      }

      // Check for SQL injection patterns
      if (this.hasSQLInjectionRisk(line)) {
        issues.push({
          severity: 'high',
          file: filePath,
          line: lineNum,
          description: 'Potential SQL injection vulnerability',
          recommendation: 'Use parameterized queries or prepared statements'
        });
      }

      // Check for console.log in production code
      if (this.hasConsoleLog(line)) {
        issues.push({
          severity: 'low',
          file: filePath,
          line: lineNum,
          description: 'console.log statement found',
          recommendation: 'Remove or replace with proper logging'
        });
      }
    });

    return issues;
  }

  /**
   * Check if line contains hardcoded secret
   */
  private hasHardcodedSecret(line: string): boolean {
    const secretKeywords = ['password', 'secret', 'key', 'token', 'apikey', 'api_key'];
    const hasSecretKeyword = secretKeywords.some(keyword =>
      line.toLowerCase().includes(keyword)
    );

    if (!hasSecretKeyword) return false;

    // Check if it looks like an assignment with quotes
    return line.includes('=') && (line.includes('"') || line.includes("'"));
  }

  /**
   * Check for SQL injection risks
   */
  private hasSQLInjectionRisk(line: string): boolean {
    const sqlPatterns = [
      /query\s*\+/i,
      /execute\s*\(/i,
      /\$\{.*\}/,
      /`.*\$\{.*\}.*`/,
      /".*\+.*"/
    ];

    return sqlPatterns.some(pattern => pattern.test(line)) &&
           (line.toLowerCase().includes('select') || 
            line.toLowerCase().includes('insert') || 
            line.toLowerCase().includes('update') || 
            line.toLowerCase().includes('delete'));
  }

  /**
   * Check if line contains console.log (not in comments)
   */
  private hasConsoleLog(line: string): boolean {
    return line.includes('console.log') && !line.includes('//');
  }
}
