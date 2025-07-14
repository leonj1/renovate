import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../logger';
import { getPkgReleases } from '../modules/datasource';
import type {
  GetPkgReleasesConfig,
  ReleaseResult,
} from '../modules/datasource/types';
import { registry } from './registry';

vi.mock('../modules/datasource');
vi.mock('../logger');

describe.sequential('util/registry', () => {
  const mockConfig: GetPkgReleasesConfig = {
    datasource: 'npm',
    packageName: 'test-package',
    versioning: 'semver',
  };

  const mockResult: ReleaseResult = {
    releases: [{ version: '1.0.0' }, { version: '2.0.0' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('getPkgReleases', () => {
    it('should return result on successful request', async () => {
      vi.mocked(getPkgReleases).mockResolvedValueOnce(mockResult);

      const result = await registry.getPkgReleases(mockConfig);

      expect(result).toEqual(mockResult);
      expect(getPkgReleases).toHaveBeenCalledTimes(1);
      expect(getPkgReleases).toHaveBeenCalledWith(mockConfig);
    });

    it('should retry on network timeout error', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';

      vi.mocked(getPkgReleases)
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(mockResult);

      const promise = registry.getPkgReleases(mockConfig);

      // Fast-forward through retries
      await vi.advanceTimersByTimeAsync(1000); // First retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // Second retry after 2s

      const result = await promise;

      expect(result).toEqual(mockResult);
      expect(getPkgReleases).toHaveBeenCalledTimes(3);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 1,
          maxAttempts: 3,
          delay: 1000,
          errorCode: 'ETIMEDOUT',
        }),
        expect.stringContaining('Retrying registry fetch'),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 2,
          maxAttempts: 3,
          delay: 2000,
          errorCode: 'ETIMEDOUT',
        }),
        expect.stringContaining('Retrying registry fetch'),
      );
    });

    it('should retry on 503 Service Unavailable', async () => {
      const serviceError = new Error('Service Unavailable');
      (serviceError as any).statusCode = 503;

      vi.mocked(getPkgReleases)
        .mockRejectedValueOnce(serviceError)
        .mockResolvedValueOnce(mockResult);

      const promise = registry.getPkgReleases(mockConfig);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual(mockResult);
      expect(getPkgReleases).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).statusCode = 401;

      vi.mocked(getPkgReleases).mockRejectedValueOnce(authError);

      await expect(registry.getPkgReleases(mockConfig)).rejects.toThrow(
        'Unauthorized',
      );

      expect(getPkgReleases).toHaveBeenCalledTimes(1);
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should respect max attempts', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNRESET';

      vi.mocked(getPkgReleases).mockRejectedValue(networkError);

      const promise = registry.getPkgReleases(mockConfig);

      // Create a separate promise to handle timer advancement
      const timerPromise = (async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third attempt (no more retries)
      })();

      try {
        // Wait for both the main promise and timer advancement
        await Promise.all([
          expect(promise).rejects.toThrow('Network error'),
          timerPromise,
        ]);
      } finally {
        // Ensure timers are cleared even if test fails
        vi.clearAllTimers();
      }

      expect(getPkgReleases).toHaveBeenCalledTimes(3);
    });

    it('should use custom retry config', async () => {
      const error = new Error('Timeout');
      (error as any).name = 'TimeoutError';

      vi.mocked(getPkgReleases)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResult);

      const customRetryConfig = {
        maxAttempts: 2,
        initialDelay: 500,
        backoffMultiplier: 3,
      };

      const promise = registry.getPkgReleases(mockConfig, customRetryConfig);

      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result).toEqual(mockResult);
      expect(getPkgReleases).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 1,
          maxAttempts: 2,
          delay: 500,
        }),
        expect.stringContaining('Retrying registry fetch'),
      );
    });

    it('should handle exponential backoff with max delay', async () => {
      const error = new Error('Connection reset');
      (error as any).code = 'ECONNRESET';

      vi.mocked(getPkgReleases)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResult);

      const customConfig = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 4,
      };

      const promise = registry.getPkgReleases(mockConfig, customConfig);

      try {
        // First retry: 1000ms
        await vi.advanceTimersByTimeAsync(1000);

        // Second retry: 4000ms
        await vi.advanceTimersByTimeAsync(4000);

        // Third retry: should be capped at maxDelay (5000ms) instead of 16000ms
        await vi.advanceTimersByTimeAsync(5000);

        // Fourth retry: should still be capped at maxDelay (5000ms)
        await vi.advanceTimersByTimeAsync(5000);

        const result = await promise;
        expect(result).toEqual(mockResult);
      } finally {
        vi.clearAllTimers();
      }

      expect(getPkgReleases).toHaveBeenCalledTimes(5);

      // Check that delay was capped at maxDelay
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 3,
          delay: 5000, // Should be capped at maxDelay
        }),
        expect.stringContaining('Retrying registry fetch'),
      );
    });

    it('should handle various network error codes', async () => {
      const errorCodes = [
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'EADDRINUSE',
        'ECONNABORTED',
        'EPIPE',
      ];

      for (const code of errorCodes) {
        vi.clearAllMocks();

        const error = new Error(`Error with code ${code}`);
        (error as any).code = code;

        vi.mocked(getPkgReleases)
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(mockResult);

        const promise = registry.getPkgReleases(mockConfig);
        await vi.advanceTimersByTimeAsync(1000);

        const result = await promise;

        expect(result).toEqual(mockResult);
        expect(getPkgReleases).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle various HTTP status codes', async () => {
      const statusCodes = [408, 429, 500, 502, 504];

      for (const statusCode of statusCodes) {
        vi.clearAllMocks();

        const error = new Error(`HTTP ${statusCode}`);
        (error as any).statusCode = statusCode;

        vi.mocked(getPkgReleases)
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(mockResult);

        const promise = registry.getPkgReleases(mockConfig);
        await vi.advanceTimersByTimeAsync(1000);

        const result = await promise;

        expect(result).toEqual(mockResult);
        expect(getPkgReleases).toHaveBeenCalledTimes(2);
      }
    });

    it('should identify timeout errors by message', async () => {
      const error = new Error('Request timeout: Resource not responding');

      vi.mocked(getPkgReleases)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResult);

      const promise = registry.getPkgReleases(mockConfig);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual(mockResult);
      expect(getPkgReleases).toHaveBeenCalledTimes(2);
    });

    it('should identify NetworkError by name', async () => {
      const error = new Error('Network failure');
      (error as any).name = 'NetworkError';

      vi.mocked(getPkgReleases)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResult);

      const promise = registry.getPkgReleases(mockConfig);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual(mockResult);
      expect(getPkgReleases).toHaveBeenCalledTimes(2);
    });

    it('should identify network errors by type', async () => {
      const error = new Error('Network failure');
      (error as any).type = 'network';

      vi.mocked(getPkgReleases)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResult);

      const promise = registry.getPkgReleases(mockConfig);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual(mockResult);
      expect(getPkgReleases).toHaveBeenCalledTimes(2);
    });
  });
});
