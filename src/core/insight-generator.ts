import { z } from 'zod';
import { generateObject } from 'ai';
import type { Vulnerability } from '../types';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ErrorHandler, ValidationError, InsightGenerationError } from './errors';

interface Config {
  model: string;
  apiKey: string;
}

// Schema for structured insight generation
const InsightsSchema = z.object({
  insights: z.array(z.string()).describe('Array of security insights about the codebase'),
  recommendations: z.array(z.string()).describe('High-level recommendations for improving security'),
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
   * Generate AI insights about the codebase security posture using structured output
   * AI-only approach with proper error handling - no fallback insights
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
          schema: InsightsSchema as any,
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

    if (!Array.isArray(result.object.insights)) {
      throw new InsightGenerationError('AI response missing insights array');
    }

    if (!Array.isArray(result.object.recommendations)) {
      throw new InsightGenerationError('AI response missing recommendations array');
    }

    if (!result.object.riskAssessment) {
      throw new InsightGenerationError('AI response missing risk assessment');
    }

    // Combine insights and recommendations for backward compatibility
    const allInsights = [
      ...result.object.insights,
      ...result.object.recommendations.map((rec: string) => `Recommendation: ${rec}`),
    ];

    // Add risk assessment info
    if (result.object.riskAssessment.overallRisk === 'high') {
      allInsights.unshift(`⚠️ HIGH RISK: This codebase has significant security concerns that need immediate attention.`);
    }

    if (result.object.riskAssessment.priorityAreas && result.object.riskAssessment.priorityAreas.length > 0) {
      allInsights.push(`Priority areas: ${result.object.riskAssessment.priorityAreas.join(', ')}`);
    }

    if (allInsights.length === 0) {
      throw new InsightGenerationError('AI generated empty insights - this may indicate a problem with the analysis');
    }

    return allInsights;
  }

  /**
   * Build the prompt for AI insights with structured output
   */
  private buildInsightPrompt(vulnerabilities: Vulnerability[]): string {
    const vulnCount = vulnerabilities.length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

    const vulnSummary = vulnerabilities.slice(0, 10).map(v => 
      `- ${v.severity.toUpperCase()}: ${v.description} (${v.file}:${v.line})`
    ).join('\n');

    return `You are a senior security consultant analyzing a codebase security assessment.

Security Scan Results:
- Total vulnerabilities found: ${vulnCount}
- High severity: ${highCount}
- Medium severity: ${mediumCount}  
- Low severity: ${lowCount}

Sample vulnerabilities:
${vulnSummary}

Based on this security analysis, provide:

1. **Insights**: 3-5 key observations about the codebase's security posture
2. **Recommendations**: 3-5 high-level actionable recommendations for improving security
3. **Risk Assessment**: Overall risk level and priority areas that need immediate attention

Focus on patterns, trends, and strategic security improvements rather than individual vulnerabilities.
Consider the business impact and provide practical, prioritized guidance.`;
  }

  // Removed fallback insights - AI-only approach with proper error handling
}
