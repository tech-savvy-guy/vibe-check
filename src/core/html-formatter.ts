import { FontEmbedder } from './font-embedder';
import type { Vulnerability, VulnerabilityReport } from '../types';

export class HtmlFormatter {
  /**
   * Format a security report as HTML for PDF generation
   */
  formatReportAsHtml(report: VulnerabilityReport, options?: { customFont?: string }): string {
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vibe-Check Security Analysis Report</title>
            <style>
                ${this.getStyles(options?.customFont)}
            </style>
        </head>
        <body>
            <div class="container">
                ${this.generateHeader()}
                ${this.generateSummarySection(report.summary)}
                ${this.generateInsightsSection(report.insights)}
                ${this.generateVulnerabilitiesSection(report.vulnerabilities)}
                ${this.generateFooter()}
            </div>
        </body>
        </html>`;

    return html;
  }

  /**
   * Generate CSS styles for the PDF
   */
  private getStyles(customFont?: string): string {
    const fontFamily = FontEmbedder.getPrimaryFontStack(customFont);
    const monoFontFamily = FontEmbedder.getMonospaceFontStack();

    return `
        ${FontEmbedder.generateFontFaces()}

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: ${fontFamily};
            font-size: 14px;
            line-height: 1.5;
            color: #2d3748;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 32px;
        }
        
        .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 2px;
            margin-bottom: 32px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 300;
            color: #1a202c;
            margin-bottom: 4px;
        }
        
        .header .subtitle {
            color: #718096;
            font-size: 14px;
            font-weight: 400;
        }
        
        .section {
            margin-bottom: 32px;
        }
        
        .section h2 {
            font-size: 18px;
            font-weight: 500;
            color: #2d3748;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        /* Summary Table - Clean and minimal */
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        
        .summary-table th {
            background: #f7fafc;
            color: #4a5568;
            font-weight: 500;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-table th:nth-child(2),
        .summary-table th:nth-child(3) {
            text-align: center;
        }
        
        .summary-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }
        
        .summary-table .count {
            font-weight: 600;
            text-align: center;
        }
        
        .summary-table .status {
            text-align: center;
            font-size: 13px;
        }
        
        .high-count { color: #e53e3e; }
        .medium-count { color: #d69e2e; }
        .low-count { color: #3182ce; }
        
        /* Risk Assessment */
        .risk-level {
            padding: 12px 16px;
            border-radius: 4px;
            font-weight: 500;
            text-align: center;
        }
        
        .risk-high { 
            background: #fed7d7; 
            border-left-color: #e53e3e; 
            color: #c53030; 
        }
        
        .risk-medium { 
            background: #faf089; 
            border-left-color: #d69e2e; 
            color: #b7791f; 
        }
        
        .risk-low { 
            background: #bee3f8; 
            border-left-color: #3182ce; 
            color: #2c5282; 
        }
        
        .risk-excellent { 
            background: #c6f6d5; 
            border-left-color: #38a169; 
            color: #2f855a; 
        }
        
        /* Insights Paragraph - Clean readable text */
        .insights-paragraph {
            line-height: 1.7;
            font-size: 15px;
            color: #2d3748;
            text-align: justify;
            margin-top: 8px;
        }

        .insights-paragraph p {
            margin-bottom: 16px;
            text-indent: 20px;
        }

        .insights-paragraph p:first-child {
            text-indent: 0;
        }
        
        /* Vulnerabilities List */
        .vulnerabilities-list {
            counter-reset: vuln-counter;
            list-style: none;
        }
        
        .vulnerabilities-list li {
            counter-increment: vuln-counter;
            padding: 16px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .vulnerabilities-list li:before {
            content: counter(vuln-counter) ".";
            font-weight: 600;
            color: #4a5568;
            margin-right: 8px;
            float: left;
        }
        
        .vuln-title {
            display: inline;
        }
        
        .vuln-severity {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 8px;
        }
        
        .severity-high { background: #fed7d7; color: #c53030; }
        .severity-medium { background: #faf089; color: #b7791f; }
        .severity-low { background: #bee3f8; color: #2c5282; }
        
        .vuln-detail {
            margin: 6px 0;
            font-size: 13px;
        }
        
        .vuln-detail strong {
            color: #4a5568;
            font-weight: 500;
        }
        
        .file-path {
            font-family: ${monoFontFamily};
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            color: #2d3748;
        }
        
        .footer {
            font-family: ${monoFontFamily};
            text-align: center;
            font-size: 12px;
            color: #718096;
        }
        
        .timestamp {
            color: #a0aec0;
            margin-top: 4px;
        }
        
        @media print {
            .vulnerabilities-list li { break-inside: avoid; }
        }
    `;
  }

  /**
   * Generate header section
   */
  private generateHeader(): string {
    return `
        <div class="header">
            <h1>Security Analysis Report</h1>
        </div>
    `;
  }

  /**
   * Generate summary section
   */
  private generateSummarySection(summary: { total: number; high: number; medium: number; low: number }): string {
    const riskLevel = this.getRiskLevel(summary);
    const riskClass = this.getRiskClass(summary);

    return `
        <div class="section">
            <h2>Summary</h2>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Finding</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Total Issues</td>
                        <td class="count">${summary.total}</td>
                    </tr>
                    <tr>
                        <td>High Severity</td>
                        <td class="count ${summary.high > 0 ? 'high-count' : ''}">${summary.high}</td>
                    </tr>
                    <tr>
                        <td>Medium Severity</td>
                        <td class="count ${summary.medium > 0 ? 'medium-count' : ''}">${summary.medium}</td>
                    </tr>
                    <tr>
                        <td>Low Severity</td>
                        <td class="count ${summary.low > 0 ? 'low-count' : ''}">${summary.low}</td>
                    </tr>
                </tbody>
            </table>
            <div class="risk-level ${riskClass}">
                Risk Assessment: ${riskLevel}
            </div>
        </div>
    `;
  }

  /**
   * Generate insights section
   */
  private generateInsightsSection(insights: string[]): string {
    if (insights.length === 0) {
      return '';
    }

    // Use the single cohesive insight directly
    const insight = insights[0] || '';

    return `
        <div class="section">
            <h2>AI Analysis & Insights</h2>
            <div class="insights-paragraph">
                <p>${this.escapeHtml(insight)}</p>
            </div>
        </div>
    `;
  }

  /**
   * Generate vulnerabilities section
   */
  private generateVulnerabilitiesSection(vulnerabilities: Vulnerability[]): string {
    if (vulnerabilities.length === 0) {
      return `
            <div class="section">
                <h2>Security Findings</h2>
                <p style="color: #718096;">No security vulnerabilities detected.</p>
            </div>
        `;
    }

    const items = vulnerabilities.map(vuln => this.generateVulnerabilityItem(vuln)).join('');

    return `
        <div class="section">
            <h2>Security Findings</h2>
            <ul class="vulnerabilities-list">
                ${items}
            </ul>
        </div>
    `;
  }

  /**
   * Generate individual vulnerability item
   */
  private generateVulnerabilityItem(vuln: Vulnerability): string {
    const severityClass = `severity-${vuln.severity.toLowerCase()}`;
    
    return `
        <li>
            <div class="vuln-title">
                <strong>${this.escapeHtml(vuln.description)}</strong>
            </div>
            <div class="vuln-detail">
                <strong>Location:</strong> <span class="file-path">${this.escapeHtml(vuln.file)}:${vuln.line}</span>
                <span class="vuln-severity ${severityClass}">${vuln.severity}</span>
            </div>
            <div class="vuln-detail">
                <strong>Recommendation:</strong> ${this.escapeHtml(vuln.recommendation)}
            </div>
        </li>
    `;
  }

  /**
   * Generate footer section
   */
  private generateFooter(): string {
    const timestamp = new Date().toLocaleString();
    
    return `
        <div class="footer">
            <div>Generated by vibe-check</div>
            <div class="timestamp">${timestamp}</div>
        </div>
    `;
  }

  /**
   * Get risk level description
   */
  private getRiskLevel(summary: { high: number; medium: number; low: number }): string {
    if (summary.high > 0) {
      return 'High - Immediate attention required';
    } else if (summary.medium > 2) {
      return 'Medium - Review recommended';
    } else if (summary.medium > 0 || summary.low > 0) {
      return 'Low - Monitor and improve';
    } else {
      return 'Excellent - No issues found';
    }
  }

  /**
   * Get CSS class for risk level
   */
  private getRiskClass(summary: { high: number; medium: number; low: number }): string {
    if (summary.high > 0) {
      return 'risk-high';
    } else if (summary.medium > 2) {
      return 'risk-medium';
    } else if (summary.medium > 0 || summary.low > 0) {
      return 'risk-low';
    } else {
      return 'risk-excellent';
    }
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const div = { innerHTML: '' } as any;
    div.textContent = text;
    return div.innerHTML || text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}