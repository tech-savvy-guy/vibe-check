import chalk from 'chalk';
import { configManager } from './config';
import { input, select, confirm } from '@inquirer/prompts';
import { VibeCheckConfig, OPENROUTER_MODELS } from './types';

// Export the config manager instance for CLI use
export { configManager };

export class ConfigCLI {
  /**
   * Interactive setup for initial configuration
   */
  static async setupInitialConfig(): Promise<VibeCheckConfig> {
    console.log(chalk.bold('\n🔧 Vibe-Check Configuration Setup\n'));
    console.log('Using OpenRouter for AI-powered code analysis\n');

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
      console.log(chalk.yellow('No configuration found. Running initial setup...'));
      const config = await this.setupInitialConfig();
      await configManager.saveConfig(config);
      console.log(chalk.green('✓ Configuration saved!'));
      return;
    }

    console.log(chalk.bold('\n🔧 Update Configuration\n'));
    console.log('Current configuration:');
    console.log(`  Model: ${OPENROUTER_MODELS[currentConfig.model as keyof typeof OPENROUTER_MODELS] || currentConfig.model}`);
    console.log(`  API Key: ****${currentConfig.apiKey.slice(-4)}\n`);

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
          console.log(chalk.green('✓ Configuration reset and saved!'));
          return;
        }
        return;
    }

    if (Object.keys(updates).length > 0) {
      await configManager.updateConfig(updates);
      console.log(chalk.green('✓ Configuration updated!'));
    }
  }

  /**
   * Display current configuration
   */
  static async showConfig(): Promise<void> {
    const config = await configManager.getConfig();

    if (!config) {
      console.log(chalk.yellow('No configuration found. Run "vibe-check config setup" to get started.'));
      return;
    }

    console.log(chalk.bold('\n🔧 Current Configuration\n'));
    console.log(`Model: ${OPENROUTER_MODELS[config.model as keyof typeof OPENROUTER_MODELS] || config.model}`);
    console.log(`API Key: ****${config.apiKey.slice(-4)}`);
    console.log(`\nConfig file: ${configManager.getConfigFile()}`);
  }

  /**
   * Delete configuration
   */
  static async deleteConfig(): Promise<void> {
    const config = await configManager.getConfig();

    if (!config) {
      console.log(chalk.yellow('No configuration found.'));
      return;
    }

    const confirmDelete = await confirm({
      message: 'Are you sure you want to delete the configuration?',
      default: false,
    });

    if (confirmDelete) {
      await configManager.deleteConfig();
      console.log(chalk.green('✓ Configuration deleted.'));
    }
  }
}
