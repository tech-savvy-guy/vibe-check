/**
 * Custom error classes for graceful error handling
 * Following TypeScript best practices for error handling
 */

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class AIAnalysisError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AIAnalysisError';
  }
}

export class FileProcessingError extends Error {
  constructor(message: string, public readonly filePath?: string) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

export class ContextBuildError extends Error {
  constructor(message: string, public readonly directory?: string) {
    super(message);
    this.name = 'ContextBuildError';
  }
}

export class InsightGenerationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'InsightGenerationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Centralized error handler for consistent error reporting
 */
export class ErrorHandler {
  static handle(error: Error, context?: string): never {
    const contextPrefix = context ? `[${context}] ` : '';
    
    if (error instanceof ConfigurationError) {
      console.error(`${contextPrefix}Configuration Error: ${error.message}`);
      console.error('Please run "vibe-check config setup" to configure the CLI.');
    } else if (error instanceof AIAnalysisError) {
      console.error(`${contextPrefix}AI Analysis Failed: ${error.message}`);
      if (error.cause) {
        console.error('Underlying cause:', error.cause.message);
      }
      console.error('Please check your API key and model configuration.');
    } else if (error instanceof FileProcessingError) {
      console.error(`${contextPrefix}File Processing Error: ${error.message}`);
      if (error.filePath) {
        console.error(`File: ${error.filePath}`);
      }
    } else if (error instanceof ContextBuildError) {
      console.error(`${contextPrefix}Context Build Error: ${error.message}`);
      if (error.directory) {
        console.error(`Directory: ${error.directory}`);
      }
    } else if (error instanceof InsightGenerationError) {
      console.error(`${contextPrefix}Insight Generation Failed: ${error.message}`);
      if (error.cause) {
        console.error('Underlying cause:', error.cause.message);
      }
    } else if (error instanceof ValidationError) {
      console.error(`${contextPrefix}Validation Error: ${error.message}`);
    } else {
      console.error(`${contextPrefix}Unexpected Error: ${error.message}`);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }

    process.exit(1);
  }

  static async tryAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    ErrorClass: new (message: string, cause?: Error) => Error = Error
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error) {
        throw new ErrorClass(errorMessage, error);
      }
      throw new ErrorClass(`${errorMessage}: ${String(error)}`);
    }
  }

  static try<T>(
    operation: () => T,
    errorMessage: string,
    ErrorClass: new (message: string) => Error = Error
  ): T {
    try {
      return operation();
    } catch (error) {
      if (error instanceof Error) {
        throw new ErrorClass(`${errorMessage}: ${error.message}`);
      }
      throw new ErrorClass(`${errorMessage}: ${String(error)}`);
    }
  }
}
