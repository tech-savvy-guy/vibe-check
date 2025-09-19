import type { Vulnerability, VulnerabilityReport } from '../types';
import chalk from 'chalk';

export class Reporter {
  generateReport(vulnerabilities: Vulnerability[], insights: string[]): VulnerabilityReport {
    // Calculate summary
    const summary = {
      total: vulnerabilities.length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length
    };

    return {
      vulnerabilities,
      summary,
      insights
    };
  }

  formatReport(report: VulnerabilityReport): string {
    let output = '\n';

    // Add summary
    output += chalk.bold('Summary:\n');
    output += `Total vulnerabilities: ${chalk.bold(report.summary.total)}\n`;
    output += `High severity: ${chalk.red(report.summary.high)}\n`;
    output += `Medium severity: ${chalk.yellow(report.summary.medium)}\n`;
    output += `Low severity: ${chalk.green(report.summary.low)}\n\n`;

    // Add insights
    if (report.insights.length > 0) {
      output += chalk.bold('Key Insights:\n');
      report.insights.forEach((insight, index) => {
        output += `${index + 1}. ${insight}\n`;
      });
      output += '\n';
    }

    // Add detailed findings
    if (report.vulnerabilities.length > 0) {
      output += chalk.bold('Detailed Findings:\n');

      report.vulnerabilities.forEach((vuln, index) => {
        const severityColor =
          vuln.severity === 'high' ? chalk.red :
          vuln.severity === 'medium' ? chalk.yellow :
          chalk.green;

        output += `\n${index + 1}. ${severityColor(vuln.severity.toUpperCase())}\n`;
        output += `   File: ${vuln.file}:${vuln.line}\n`;
        output += `   Description: ${vuln.description}\n`;
        output += `   Recommendation: ${vuln.recommendation}\n`;
      });
    } else {
      output += chalk.green('No vulnerabilities found!\n');
    }

    return output;
  }
}
