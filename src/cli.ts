#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import gradient from 'gradient-string';
import cliBoxes from 'cli-boxes';
import { Reporter } from './core/reporter';
import { CodeAnalyzer } from './core/code-analyzer';
import { InsightGenerator } from './core/insight-generator';
import { PDFGenerator } from './core/pdf-generator';
import { ConfigCLI, configManager } from './config/cli';
import type { ScanOptions, VulnerabilityReport } from './types';
import { 
  ConfigurationError, 
  PDFGenerationError,
  ErrorHandler 
} from './core/errors';
import fs from 'fs/promises';

// Display beautiful banner
function displayBanner() {
  console.log();
  const banner = figlet.textSync('VIBE CHECK', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
    width: 80,
    whitespaceBreak: true
  });
  
  console.log(gradient.retro.multiline(banner));
}

const program = new Command();

// Show banner when no arguments are provided or when help is shown
if (process.argv.length === 2 || process.argv.includes('--help') || process.argv.includes('-h')) {
  displayBanner();
}

program
  .name('vibe-check')
  .description(chalk.cyan('🔍 AI-powered codebase vulnerability scanner that finds security issues with intelligent analysis'))
  .version('0.0.0', '-v, --version', 'display version number')
  .helpOption('-h, --help', 'display help for command');

program
  .command('scan')
  .description(chalk.green('🔍 Scan a directory for security vulnerabilities using AI analysis'))
  .argument('[dir]', chalk.dim('Directory to scan (default: current directory)'), '.')
  .option('-o, --output <file>', chalk.dim('Save detailed report to JSON file'))
  .option('-p, --pdf <file>', chalk.dim('Export report as PDF file'))
  .option('--pdf-markdown', chalk.dim('Render PDF via Markdown (minimal, AI-friendly)'))
  .option('--pdf-font <font>', chalk.dim('Custom font for PDF (e.g., "Arial", "Helvetica")'))
  .option('--pdf-open', chalk.dim('Automatically open the PDF after generation'))
  .option('-v, --verbose', chalk.dim('Show detailed progress information'))
  .action(async (dir, options) => {
    console.log(chalk.bold.cyan('\n🚀 Starting security scan...\n'));
    
    const spinner = ora({
      text: chalk.blue('🔧 Initializing AI-powered analysis engine...'),
      spinner: 'dots12'
    }).start();

    try {
      spinner.text = chalk.blue('🔍 Deep-scanning codebase for vulnerabilities...');
      const report = await scanDirectoryForVulnerabilities(dir, options);
      
      spinner.succeed(chalk.green('✨ Security scan completed successfully!'));
      
      console.log(chalk.bold.magenta('\n📊 SECURITY ANALYSIS REPORT'));
      console.log(chalk.dim('═'.repeat(50)));

      // Display the formatted report in the terminal
      const reporter = new Reporter();
      console.log(reporter.formatReport(report));

      // Handle JSON output
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(report, null, 2));
        console.log(chalk.blue(`\n💾 JSON report saved to: ${chalk.underline(options.output)}`));
      }

      // Handle PDF export
      if (options.pdf) {
        const pdfSpinner = ora({
          text: chalk.blue('📄 Generating PDF report...'),
          spinner: 'dots'
        }).start();

        try {
          const pdfGenerator = new PDFGenerator();
          await pdfGenerator.generatePDF(report, options.pdf, {
            customFont: options.pdfFont,
            autoOpen: options.pdfOpen,
            markdown: options.pdfMarkdown
          });
          pdfSpinner.succeed(chalk.green('📄 PDF report generated successfully!'));
          console.log(chalk.blue(`📋 PDF report saved to: ${chalk.underline(options.pdf)}`));
          
          if (options.pdfOpen) {
            console.log(chalk.cyan('🔗 PDF opened in default application'));
          }
        } catch (error) {
          pdfSpinner.fail(chalk.red('❌ Failed to generate PDF report'));
          
          if (error instanceof PDFGenerationError) {
            ErrorHandler.handle(error, 'PDF Export');
          } else {
            ErrorHandler.handle(new PDFGenerationError('PDF generation failed'), 'PDF Export');
          }
        }
      }

      // Add completion message
      console.log(chalk.green('\n🎉 Analysis complete! Stay secure! 🔐'));
    } catch (error) {
      spinner.fail(chalk.red('❌ Security scan failed!'));
      
      console.log(chalk.red('\n💥 Something went wrong during the scan:'));
      
      // Use centralized error handling
      if (error instanceof Error) {
        ErrorHandler.handle(error, 'Scan');
      } else {
        ErrorHandler.handle(new Error('An unknown error occurred'), 'Scan');
      }
    }
  });

// Config commands
const configCommand = program
  .command('config')
  .description(chalk.yellow('⚙️  Manage vibe-check configuration settings'));

configCommand
  .command('setup')
  .description(chalk.green('🔧 Set up initial configuration (API key, model selection)'))
  .action(async () => {
    try {
      console.log(chalk.bold.yellow('\n⚙️  Configuration Setup\n'));
      const config = await ConfigCLI.setupInitialConfig();
      await configManager.saveConfig(config);
      console.log(chalk.green('\n✨ Configuration saved successfully!'));
      console.log(chalk.dim(`📁 Config file: ${configManager.getConfigFile()}`));
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Setup failed: ${error.message}`));
      } else {
        console.error(chalk.red('\n❌ An unknown error occurred during setup'));
      }
      process.exit(1);
    }
  });

configCommand
  .command('update')
  .description(chalk.blue('📝 Update existing configuration settings'))
  .action(async () => {
    try {
      console.log(chalk.bold.blue('\n📝 Update Configuration\n'));
      await ConfigCLI.updateConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Update failed: ${error.message}`));
      } else {
        console.error(chalk.red('\n❌ An unknown error occurred during update'));
      }
      process.exit(1);
    }
  });

configCommand
  .command('show')
  .description(chalk.cyan('👀 Display current configuration'))
  .action(async () => {
    try {
      await ConfigCLI.showConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Failed to show config: ${error.message}`));
      } else {
        console.error(chalk.red('\n❌ An unknown error occurred'));
      }
      process.exit(1);
    }
  });

configCommand
  .command('delete')
  .description(chalk.red('🗑️  Delete configuration file'))
  .action(async () => {
    try {
      console.log(chalk.bold.red('\n🗑️  Delete Configuration\n'));
      await ConfigCLI.deleteConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Delete failed: ${error.message}`));
      } else {
        console.error(chalk.red('\n❌ An unknown error occurred during deletion'));
      }
      process.exit(1);
    }
  });

async function scanDirectoryForVulnerabilities(
  dir: string,
  options: ScanOptions = {}
): Promise<VulnerabilityReport> {
  // Load configuration
  const config = await configManager.getConfig();
  if (!config) {
    throw new ConfigurationError('No configuration found. Please run "vibe-check config setup" first.');
  }

  // Initialize components
  const codeAnalyzer = new CodeAnalyzer(config);
  const insightGenerator = new InsightGenerator(config);
  const reporter = new Reporter();

  // Use AI to analyze entire codebase
  if (options.verbose) {
    console.log('Analyzing codebase with AI...');
  }
  
  const vulnerabilities = await codeAnalyzer.analyzeCodebase(dir);

  // Generate AI insights
  if (options.verbose) {
    console.log('Generating AI insights...');
  }
  const insights = await insightGenerator.generateInsights(vulnerabilities);

  // Generate and return report
  return reporter.generateReport(vulnerabilities, insights);
}

program.parse();