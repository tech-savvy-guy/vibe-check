import { z } from 'zod';
import { generateObject } from 'ai';
import type { Vulnerability } from '../types';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ErrorHandler, ValidationError, InsightGenerationError } from './errors';

interface Config {
  model: string;
  apiKey: string;
}

// Schema for cohesive paragraph generation
const CohesiveInsightsSchema = z.object({
  analysis: z.string().describe('A cohesive, well-formatted paragraph containing the complete security analysis and insights'),
  riskAssessment: z.object({
    overallRisk: z.enum(['low', 'medium', 'high']).describe('Overall security risk level'),
    priorityAreas: z.array(z.string()).describe('Areas that need immediate attention'),
  }),
});

export class InsightGenerator {
  private openrouter: any;

  constructor(private config: Config) {
    this.openrouter = createOpenRouter({
      apiKey: config.apiKey,
    });
  }

  /**
   * Generate AI insights as a cohesive paragraph using structured output
   * AI-only approach with proper error handling - generates professional paragraph format
   */
  async generateInsights(vulnerabilities: Vulnerability[]): Promise<string[]> {
    // Validate inputs
    if (!Array.isArray(vulnerabilities)) {
      throw new ValidationError('Vulnerabilities must be provided as an array');
    }

    if (!this.config.apiKey) {
      throw new ValidationError('API key is required for insight generation');
    }

    if (!this.config.model) {
      throw new ValidationError('Model configuration is required for insight generation');
    }

    const prompt = this.buildInsightPrompt(vulnerabilities);

    const result = await ErrorHandler.tryAsync(
      async () => {
        return await generateObject({
          model: this.openrouter.chat(this.config.model),
          schema: CohesiveInsightsSchema as any,
          prompt,
        });
      },
      'Failed to generate AI insights',
      InsightGenerationError
    );

    // Validate the AI response
    if (!result.object) {
      throw new InsightGenerationError('Invalid response format from AI insight generation');
    }

    if (!result.object.analysis) {
      throw new InsightGenerationError('AI response missing analysis paragraph');
    }

    if (!result.object.riskAssessment) {
      throw new InsightGenerationError('AI response missing risk assessment');
    }

    // Return the cohesive paragraph as a single-item array for backward compatibility
    return [result.object.analysis];
  }


  /**
   * Build the prompt for AI insights as a cohesive paragraph
   */
  private buildInsightPrompt(vulnerabilities: Vulnerability[]): string {
    const vulnCount = vulnerabilities.length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

    const vulnSummary = vulnerabilities.slice(0, 10).map(v =>
      `- ${v.severity.toUpperCase()}: ${v.description} (${v.file}:${v.line})`
    ).join('\n');

    return `You are a senior security consultant writing a professional security analysis report.

Security Scan Results:
- Total vulnerabilities found: ${vulnCount}
- High severity: ${highCount}
- Medium severity: ${mediumCount}
- Low severity: ${lowCount}

Sample vulnerabilities:
${vulnSummary}

Based on this security analysis, write a cohesive, professional paragraph that provides:

1. **Overall Assessment**: A comprehensive evaluation of the codebase's security posture
2. **Key Insights**: Main observations about security patterns and trends
3. **Strategic Recommendations**: High-level actionable guidance for improvement
4. **Business Context**: Consider the impact on security and maintainability

Write this as a single, well-structured paragraph suitable for inclusion in a professional security report. Use formal language, proper transitions, and focus on the big picture rather than individual vulnerabilities.

The paragraph should be comprehensive but concise, reading naturally as expert analysis.`;
  }

}
