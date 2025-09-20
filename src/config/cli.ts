import chalk from 'chalk';
import { configManager } from './config';
import { input, select, confirm } from '@inquirer/prompts';
import { VibeCheckConfig, OPENROUTER_MODELS } from './types';
import boxes from 'cli-boxes';
import gradient from 'gradient-string';

// Export the config manager instance for CLI use
export { configManager };

export class ConfigCLI {
  /**
   * Interactive setup for initial configuration
   */
  static async setupInitialConfig(): Promise<VibeCheckConfig> {
    this.displayConfigBanner();
    console.log(chalk.cyan('🤖 Using OpenRouter for AI-powered code analysis'));
    console.log(chalk.dim('   Get your API key at: https://openrouter.ai/keys\n'));

    const apiKey = await input({
      message: 'Enter your OpenRouter API key:',
      validate: (value) => {
        if (!value.trim()) {
          return 'API key is required';
        }
        if (!value.startsWith('sk-or-v1-')) {
          return 'Please enter a valid OpenRouter API key (should start with sk-or-v1-)';
        }
        return true;
      },
    });

    const modelChoices = Object.entries(OPENROUTER_MODELS).map(([value, name]) => ({
      name,
      value,
    }));

    const model = await select({
      message: 'Select your preferred AI model:',
      choices: modelChoices,
    });

    const config: VibeCheckConfig = {
      apiKey,
      model,
    };

    return config;
  }

  /**
   * Update specific configuration values interactively
   */
  static async updateConfig(): Promise<void> {
    const currentConfig = await configManager.getConfig();

    if (!currentConfig) {
      console.log(chalk.yellow('⚠️  No configuration found. Running initial setup...\n'));
      const config = await this.setupInitialConfig();
      await configManager.saveConfig(config);
      console.log(chalk.green('\n✨ Configuration saved successfully!'));
      return;
    }

    console.log(this.createUpdateBanner());
    console.log(this.createConfigDisplayBox(currentConfig));
    console.log('');

    const field = await select({
      message: 'What would you like to update?',
      choices: [
        { name: 'API Key', value: 'apiKey' },
        { name: 'Model', value: 'model' },
        { name: 'Reset all settings', value: 'reset' },
      ],
    });

    let updates: Partial<VibeCheckConfig> = {};

    switch (field) {
      case 'apiKey':
        updates.apiKey = await input({
          message: 'Enter new OpenRouter API key:',
          validate: (value) => {
            if (!value.trim()) return 'API key is required';
            if (!value.startsWith('sk-or-v1-')) return 'Please enter a valid OpenRouter API key';
            return true;
          },
        });
        break;

      case 'model':
        const modelChoices = Object.entries(OPENROUTER_MODELS).map(([value, name]) => ({
          name,
          value,
        }));

        updates.model = await select({
          message: 'Select new model:',
          choices: modelChoices,
        });
        break;

      case 'reset':
        const confirmReset = await confirm({
          message: 'Are you sure you want to reset all settings?',
          default: false,
        });
        if (confirmReset) {
          const newConfig = await this.setupInitialConfig();
          await configManager.saveConfig(newConfig);
          console.log(this.createSuccessMessage('Configuration reset and saved! 🔄'));
          return;
        }
        return;
    }

    if (Object.keys(updates).length > 0) {
      await configManager.updateConfig(updates);
      console.log(this.createSuccessMessage('Configuration updated successfully! 🎉'));
    }
  }

  /**
   * Display current configuration
   */
  static async showConfig(): Promise<void> {
    const config = await configManager.getConfig();

    if (!config) {
      console.log(this.createNoConfigBox());
      return;
    }

    console.log(this.createConfigDisplayBox(config));
  }

  private static displayConfigBanner(): void {
    const round = boxes.round;
    const title = gradient(['#ff6b6b', '#4ecdc4'])('⚙️  CONFIGURATION SETUP');
    
    let content = '';
    content += title + '\n';
    content += chalk.dim('─'.repeat(40)) + '\n';
    content += chalk.white('Welcome to Vibe-Check setup!') + '\n';
    content += chalk.dim('Let\'s get you configured for security scanning.') + '\n';

    console.log(this.wrapInBox(content, round, chalk.cyan));
  }

  private static createUpdateBanner(): string {
    const round = boxes.round;
    const title = gradient(['#4ecdc4', '#45b7d1'])('📝 UPDATE CONFIGURATION');
    
    let content = '';
    content += title + '\n';
    content += chalk.dim('─'.repeat(40)) + '\n';
    content += chalk.white('Modify your current settings below.') + '\n';

    return this.wrapInBox(content, round, chalk.blue);
  }

  private static createConfigDisplayBox(config: VibeCheckConfig): string {
    const round = boxes.round;
    
    let content = '';
    content += chalk.bold.cyan('⚙️  CURRENT CONFIGURATION') + '\n';
    content += chalk.dim('─'.repeat(35)) + '\n';
    content += `🤖 ${chalk.bold('Model:')} ${chalk.green(OPENROUTER_MODELS[config.model as keyof typeof OPENROUTER_MODELS] || config.model)}\n`;
    content += `🔑 ${chalk.bold('API Key:')} ${chalk.yellow('****' + config.apiKey.slice(-4))}\n`;
    content += '\n';
    content += `📁 ${chalk.dim('Config file:')} ${chalk.dim(configManager.getConfigFile())}\n`;

    return this.wrapInBox(content, round, chalk.cyan);
  }

  private static createNoConfigBox(): string {
    const round = boxes.round;
    
    let content = '';
    content += chalk.bold.yellow('⚠️  NO CONFIGURATION FOUND') + '\n';
    content += chalk.dim('─'.repeat(35)) + '\n';
    content += chalk.white('You need to set up Vibe-Check first!') + '\n';
    content += '\n';
    content += chalk.cyan('💡 Run this command to get started:') + '\n';
    content += chalk.bold.green('   vibe-check config setup') + '\n';

    return this.wrapInBox(content, round, chalk.yellow);
  }

  private static wrapInBox(content: string, boxStyle: any, borderColor = chalk.dim): string {
    const lines = content.split('\n');
    const maxWidth = Math.max(...lines.map(line => this.stripAnsi(line).length));
    const width = Math.max(maxWidth + 4, 40);
    
    let output = '';
    output += borderColor(boxStyle.topLeft + boxStyle.top.repeat(width - 2) + boxStyle.topRight) + '\n';
    
    lines.forEach(line => {
      const padding = ' '.repeat(Math.max(0, width - 4 - this.stripAnsi(line).length));
      output += borderColor(boxStyle.left) + ' ' + line + padding + ' ' + borderColor(boxStyle.right) + '\n';
    });
    
    output += borderColor(boxStyle.bottomLeft + boxStyle.bottom.repeat(width - 2) + boxStyle.bottomRight);
    
    return output;
  }

  private static stripAnsi(str: string): string {
    // Simple ANSI escape sequence removal
    return str.replace(/\u001b\[[0-9;]*m/g, '');
  }

  /**
   * Delete configuration
   */
  static async deleteConfig(): Promise<void> {
    const config = await configManager.getConfig();

    if (!config) {
      console.log(this.createNoConfigBox());
      return;
    }

    console.log(this.createDeleteWarningBox());

    const confirmDelete = await confirm({
      message: 'Are you sure you want to delete the configuration?',
      default: false,
    });

    if (confirmDelete) {
      await configManager.deleteConfig();
      console.log(this.createSuccessMessage('Configuration deleted successfully! 🗑️'));
    } else {
      console.log(chalk.dim('\n✨ Configuration preserved. No changes made.'));
    }
  }

  private static createDeleteWarningBox(): string {
    const round = boxes.round;
    
    let content = '';
    content += chalk.bold.red('🗑️  DELETE CONFIGURATION') + '\n';
    content += chalk.dim('─'.repeat(35)) + '\n';
    content += chalk.yellow('⚠️  This will permanently remove your') + '\n';
    content += chalk.yellow('   API key and model preferences.') + '\n';
    content += '\n';
    content += chalk.dim('You\'ll need to run setup again to') + '\n';
    content += chalk.dim('use Vibe-Check after deletion.') + '\n';

    return this.wrapInBox(content, round, chalk.red);
  }

  private static createSuccessMessage(message: string): string {
    const round = boxes.round;
    
    let content = '';
    content += chalk.bold.green('✅ SUCCESS') + '\n';
    content += chalk.dim('─'.repeat(25)) + '\n';
    content += chalk.white(message) + '\n';

    return this.wrapInBox(content, round, chalk.green);
  }
}
