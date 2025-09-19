import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { VibeCheckConfig, ConfigValidationResult, DEFAULT_CONFIG } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.vibe-check');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private static instance: ConfigManager;
  private config: VibeCheckConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get the configuration directory path
   */
  getConfigDir(): string {
    return CONFIG_DIR;
  }

  /**
   * Get the configuration file path
   */
  getConfigFile(): string {
    return CONFIG_FILE;
  }

  /**
   * Ensure the configuration directory exists
   */
  async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(CONFIG_DIR);
    } catch {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<VibeCheckConfig | null> {
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(configData);

      // Validate required fields
      const validation = this.validateConfig(parsed);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      this.config = parsed;
      return this.config;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return null; // Config file doesn't exist
      }
      throw error;
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: VibeCheckConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    await this.ensureConfigDir();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    this.config = config;
  }

  /**
   * Get current configuration (loads if not already loaded)
   */
  async getConfig(): Promise<VibeCheckConfig | null> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config;
  }

  /**
   * Update specific configuration values
   */
  async updateConfig(updates: Partial<VibeCheckConfig>): Promise<VibeCheckConfig> {
    const current = await this.getConfig() || { ...DEFAULT_CONFIG } as VibeCheckConfig;
    const updated = { ...current, ...updates };

    const validation = this.validateConfig(updated);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    await this.saveConfig(updated);
    return updated;
  }

  /**
   * Check if configuration exists
   */
  async configExists(): Promise<boolean> {
    try {
      await fs.access(CONFIG_FILE);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete configuration file
   */
  async deleteConfig(): Promise<void> {
    try {
      await fs.unlink(CONFIG_FILE);
      this.config = null;
    } catch (error) {
      if (!(error as NodeJS.ErrnoException).code?.includes('ENOENT')) {
        throw error;
      }
    }
  }

  /**
   * Validate configuration object
   */
  validateConfig(config: any): ConfigValidationResult {
    const errors: string[] = [];

    if (!config) {
      errors.push('Configuration is null or undefined');
      return { isValid: false, errors };
    }

    if (!config.apiKey || typeof config.apiKey !== 'string') {
      errors.push('API key is required and must be a string');
    }

    if (!config.model || typeof config.model !== 'string') {
      errors.push('Model is required and must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default configuration with missing values filled in
   */
  getDefaultConfig(): VibeCheckConfig {
    const defaults = { ...DEFAULT_CONFIG };
    return defaults as VibeCheckConfig;
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
