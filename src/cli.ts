#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Reporter } from './core/reporter';
import { CodeAnalyzer } from './core/code-analyzer';
import { InsightGenerator } from './core/insight-generator';
import { ConfigCLI, configManager } from './config/cli';
import type { ScanOptions, VulnerabilityReport } from './types';
import { 
  ConfigurationError, 
  AIAnalysisError, 
  InsightGenerationError, 
  ErrorHandler 
} from './core/errors';
import fs from 'fs/promises';

const program = new Command();

program
  .name('vibe-check')
  .description('AI-powered codebase vulnerability scanner')
  .version('0.0.0');

program
  .command('scan')
  .description('Scan a directory for vulnerabilities')
  .argument('[dir]', 'Directory to scan', '.')
  .option('-o, --output <file>', 'Output file for the report')
  .option('-v, --verbose', 'Show detailed scan information')
  .action(async (dir, options) => {
    const spinner = ora('Initializing AI-powered code analysis...').start();

    try {
      spinner.text = 'Scanning codebase for vulnerabilities...';
      const report = await scanDirectoryForVulnerabilities(dir, options);
      spinner.succeed('Scan completed!');

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(report, null, 2));
        console.log(chalk.blue(`\nReport saved to ${options.output}`));

        // Also display the formatted report in the terminal
        const reporter = new Reporter();
        console.log(reporter.formatReport(report));
      } else {
        const reporter = new Reporter();
        console.log(reporter.formatReport(report));
      }
    } catch (error) {
      spinner.fail('Scan failed!');
      
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
  .description('Manage vibe-check configuration');

configCommand
  .command('setup')
  .description('Set up initial configuration')
  .action(async () => {
    try {
      const config = await ConfigCLI.setupInitialConfig();
      await configManager.saveConfig(config);
      console.log(chalk.green('\n✓ Configuration saved successfully!'));
      console.log(`Config file location: ${configManager.getConfigFile()}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red('An unknown error occurred'));
      }
      process.exit(1);
    }
  });

configCommand
  .command('update')
  .description('Update configuration settings')
  .action(async () => {
    try {
      await ConfigCLI.updateConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red('An unknown error occurred'));
      }
      process.exit(1);
    }
  });

configCommand
  .command('show')
  .description('Display current configuration')
  .action(async () => {
    try {
      await ConfigCLI.showConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red('An unknown error occurred'));
      }
      process.exit(1);
    }
  });

configCommand
  .command('delete')
  .description('Delete configuration file')
  .action(async () => {
    try {
      await ConfigCLI.deleteConfig();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red('An unknown error occurred'));
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