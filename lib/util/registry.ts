import { logger } from '../logger';

import { getPkgReleases } from '../modules/datasource';
import type {
  GetPkgReleasesConfig,
  ReleaseResult,
} from '../modules/datasource/types';

// Default configuration for retry logic
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// Network error codes that should trigger a retry
const RETRYABLE_ERROR_CODES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EADDRINUSE',
  'ECONNABORTED',
  'EPIPE',
];

// HTTP status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

function isRetryableError(error: any): boolean {
  // Check for network error codes
  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
    return true;
  }

  // Check for HTTP status codes
  if (error.statusCode && RETRYABLE_STATUS_CODES.includes(error.statusCode)) {
    return true;
  }

  // Check for timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  // Check for specific error types that indicate transient failures
  if (error.name === 'NetworkError' || error.type === 'network') {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  context: { datasource?: string; packageName?: string } = {},
): Promise<T> {
  const {
    maxAttempts = DEFAULT_RETRY_CONFIG.maxAttempts,
    initialDelay = DEFAULT_RETRY_CONFIG.initialDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    backoffMultiplier = DEFAULT_RETRY_CONFIG.backoffMultiplier,
  } = config;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If it's not a retryable error or this was the last attempt, throw immediately
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay,
      );

      logger.debug(
        {
          datasource: context.datasource,
          packageName: context.packageName,
          attempt,
          maxAttempts,
          delay,
          error: error.message ?? error,
          errorCode: error.code,
          statusCode: error.statusCode,
        },
        `Retrying registry fetch after transient failure (attempt ${attempt}/${maxAttempts})`,
      );

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

export const registry = {
  getPkgReleases(
    config: GetPkgReleasesConfig,
    retryConfig?: RetryConfig,
  ): Promise<ReleaseResult | null> {
    return retryWithExponentialBackoff(
      () => getPkgReleases(config),
      retryConfig,
      {
        datasource: config.datasource,
        packageName: config.packageName,
      },
    );
  },
};
