import type { Vulnerability, VulnerabilityReport } from '../types';
import chalk from 'chalk';
import boxes from 'cli-boxes';
import gradient from 'gradient-string';

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

    // Create beautiful summary box
    const summaryContent = this.createSummaryBox(report.summary);
    output += summaryContent + '\n';

    // Add insights section
    if (report.insights.length > 0) {
      output += this.createInsightsSection(report.insights) + '\n';
    }

    // Add detailed findings
    if (report.vulnerabilities.length > 0) {
      output += this.createVulnerabilitiesSection(report.vulnerabilities);
    } else {
      output += this.createNoVulnerabilitiesMessage();
    }

    return output;
  }

  private createSummaryBox(summary: { total: number; high: number; medium: number; low: number }): string {
    const round = boxes.round;
    
    let content = '';
    content += chalk.bold.white('📊 SECURITY SUMMARY') + '\n';
    content += chalk.dim('─'.repeat(50)) + '\n';
    content += '\n';
    
    // Total with icon
    content += `🔍 ${chalk.bold('Total Issues Found:')} ${chalk.bold.white(summary.total)}\n`;
    content += '\n';
    
    // Severity breakdown with cleaner format
    content += `🚨 ${chalk.bold('High Severity:')}    ${chalk.red.bold(summary.high.toString().padStart(3))}\n`;
    content += `⚠️  ${chalk.bold('Medium Severity:')}  ${chalk.yellow.bold(summary.medium.toString().padStart(3))}\n`;
    content += `ℹ️  ${chalk.bold('Low Severity:')}     ${chalk.green.bold(summary.low.toString().padStart(3))}\n`;
    content += '\n';
    
    // Risk assessment
    const riskLevel = this.getRiskLevel(summary);
    content += `🎯 ${chalk.bold('Risk Level:')} ${riskLevel}\n`;

    return this.wrapInBox(content, round);
  }

  private createSeverityLine(label: string, count: number, colorFn: any, total: number): string {
    const barWidth = 20;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const filledBars = Math.round((percentage / 100) * barWidth);
    
    const bar = colorFn('█'.repeat(filledBars)) + chalk.dim('░'.repeat(barWidth - filledBars));
    const percentText = total > 0 ? `${percentage.toFixed(1)}%` : '0%';
    
    return `${label.padEnd(15)} ${colorFn(count.toString().padStart(3))} ${bar} ${chalk.dim(percentText)}\n`;
  }

  private getRiskLevel(summary: { high: number; medium: number; low: number }): string {
    if (summary.high > 0) {
      return chalk.red.bold('🔴 HIGH - Immediate attention required!');
    } else if (summary.medium > 2) {
      return chalk.yellow.bold('🟡 MEDIUM - Review recommended');
    } else if (summary.medium > 0 || summary.low > 0) {
      return chalk.blue.bold('🟢 LOW - Monitor and improve');
    } else {
      return chalk.green.bold('✅ EXCELLENT - No issues found!');
    }
  }

  private createInsightsSection(insights: string[]): string {
    const round = boxes.round;

    let content = '';
    content += chalk.bold.cyan('💡 AI ANALYSIS & INSIGHTS') + '\n';
    content += chalk.dim('─'.repeat(45)) + '\n';
    content += '\n';

    // Handle single cohesive insight
    const insight = insights[0] || '';
    content += this.wrapText(insight, 65, '') + '\n';

    return this.wrapInBox(content, round);
  }

  private createVulnerabilitiesSection(vulnerabilities: Vulnerability[]): string {
    let output = '';
    
    output += chalk.bold.red('\n🚨 DETAILED SECURITY FINDINGS\n');
    output += chalk.dim('═'.repeat(60)) + '\n';

    vulnerabilities.forEach((vuln, index) => {
      output += this.createVulnerabilityCard(vuln, index + 1);
    });

    return output;
  }

  private createVulnerabilityCard(vuln: Vulnerability, index: number): string {
    const round = boxes.round;
    const severityConfig = this.getSeverityConfig(vuln.severity);
    
    // Create a cleaner, more readable format
    let content = '';
    content += `${severityConfig.icon} ${severityConfig.color.bold(`ISSUE #${index}`)} ${severityConfig.badge}\n`;
    content += chalk.dim('─'.repeat(60)) + '\n';
    content += `📁 ${chalk.bold('File:')} ${chalk.cyan(vuln.file)}${chalk.dim(`:${vuln.line}`)}\n`;
    content += '\n';
    content += `📝 ${chalk.bold('Description:')}\n`;
    content += this.wrapText(vuln.description, 55, '   ') + '\n';
    content += '\n';
    content += `💡 ${chalk.bold('Recommendation:')}\n`;
    content += this.wrapText(chalk.green(vuln.recommendation), 55, '   ') + '\n';
    
    return this.wrapInBox(content, round) + '\n';
  }

  private getSeverityConfig(severity: string) {
    switch (severity) {
      case 'high':
        return {
          icon: '🚨',
          color: chalk.red,
          badge: chalk.bgRed.white.bold(' CRITICAL ')
        };
      case 'medium':
        return {
          icon: '⚠️',
          color: chalk.yellow,
          badge: chalk.bgYellow.black.bold(' WARNING ')
        };
      case 'low':
        return {
          icon: 'ℹ️',
          color: chalk.blue,
          badge: chalk.bgBlue.white.bold(' INFO ')
        };
      default:
        return {
          icon: '❓',
          color: chalk.gray,
          badge: chalk.bgGray.white.bold(' UNKNOWN ')
        };
    }
  }

  private createNoVulnerabilitiesMessage(): string {
    const double = boxes.double;
    
    const celebration = [
      '🎉', '✨', '🛡️', '🔐', '💚', '🌟', '🏆', '👏'
    ].join(' ');
    
    let content = '';
    content += chalk.bold.green('🎉 CONGRATULATIONS! 🎉') + '\n';
    content += '─'.repeat(35) + '\n';
    content += chalk.green('No security vulnerabilities detected!') + '\n';
    content += chalk.dim('Your codebase appears to be secure.') + '\n';
    content += '\n';
    content += celebration + '\n';
    content += '\n';
    content += chalk.dim('💡 Keep up the good work and continue') + '\n';
    content += chalk.dim('   following security best practices!') + '\n';

    return this.wrapInBox(content, double, chalk.green);
  }

  private wrapInBox(content: string, boxStyle: any, borderColor = chalk.dim): string {
    const lines = content.split('\n');
    const maxWidth = Math.max(...lines.map(line => this.stripAnsi(line).length));
    const width = Math.max(Math.min(maxWidth + 4, 80), 60); // Limit max width to 80, min 60
    
    let output = '';
    output += borderColor(boxStyle.topLeft + boxStyle.top.repeat(width - 2) + boxStyle.topRight) + '\n';
    
    lines.forEach(line => {
      const cleanLine = this.stripAnsi(line);
      const padding = ' '.repeat(Math.max(0, width - 4 - cleanLine.length));
      output += borderColor(boxStyle.left) + ' ' + line + padding + ' ' + borderColor(boxStyle.right) + '\n';
    });
    
    output += borderColor(boxStyle.bottomLeft + boxStyle.bottom.repeat(width - 2) + boxStyle.bottomRight);
    
    return output;
  }

  private wrapText(text: string, maxWidth: number, indent: string = ''): string {
    // Strip ANSI codes for length calculation but preserve them in output
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testLineClean = this.stripAnsi(testLine);
      
      if (testLineClean.length <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(indent + currentLine);
          currentLine = word;
        } else {
          // Word is longer than maxWidth, just add it
          lines.push(indent + word);
        }
      }
    }
    
    if (currentLine) {
      lines.push(indent + currentLine);
    }
    
    return lines.join('\n');
  }

  private stripAnsi(str: string): string {
    // More comprehensive ANSI escape sequence removal
    return str.replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
  }
}
