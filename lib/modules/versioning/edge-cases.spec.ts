import { describe, expect, it, vi, beforeEach } from 'vitest';
import { registry } from '../../util/registry';
import { getNewValue } from './index';
import type { ReleaseResult } from '../datasource/types';

describe('modules/versioning/edge-cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty version lists', () => {
    it('should handle empty releases array gracefully', async () => {
      const mockReleases: ReleaseResult = {
        releases: [],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '1.0.0',
        rangeStrategy: 'auto',
        currentVersion: '1.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
          },
        },
      });

      expect(result).toBe('1.0.0');
    });

    it('should handle null releases gracefully', async () => {
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(null);

      const result = await getNewValue({
        currentValue: '1.0.0',
        rangeStrategy: 'auto',
        currentVersion: '1.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
          },
        },
      });

      expect(result).toBe('1.0.0');
    });

    it('should handle undefined releases gracefully', async () => {
      const mockReleases: ReleaseResult = {
        releases: undefined as any,
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '1.0.0',
        rangeStrategy: 'auto',
        currentVersion: '1.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
          },
        },
      });

      expect(result).toBe('1.0.0');
    });
  });

  describe('malformed version lists', () => {
    it('should filter out invalid versions', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: 'invalid-version' },
          { version: '2.0.0' },
          { version: '' },
          { version: null as any },
          { version: undefined as any },
          { version: '3.0.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '1.0.0',
        rangeStrategy: 'auto',
        currentVersion: '1.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
          },
        },
      });

      expect(result).toBe('2.0.0'); // Should get the second-latest valid version
    });

    it('should handle all invalid versions gracefully', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: 'not-a-version' },
          { version: 'also-invalid' },
          { version: '' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '1.0.0',
        rangeStrategy: 'auto',
        currentVersion: '1.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
          },
        },
      });

      expect(result).toBe('1.0.0'); // Should return current value when no valid versions
    });
  });

  describe('version gaps', () => {
    it('should handle version sequences with gaps correctly', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.0.2' }, // gap: missing 1.0.1
          { version: '1.0.5' }, // gap: missing 1.0.3, 1.0.4
          { version: '2.0.0' },
          { version: '2.0.3' }, // gap: missing 2.0.1, 2.0.2
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      // Test offset -1 (should get 2.0.0)
      let result = await getNewValue({
        currentValue: '2.0.3',
        rangeStrategy: 'auto',
        currentVersion: '2.0.3',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
          },
        },
      });
      expect(result).toBe('2.0.0');

      // Test offset -2 (should get 1.0.5)
      result = await getNewValue({
        currentValue: '2.0.3',
        rangeStrategy: 'auto',
        currentVersion: '2.0.3',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -2,
          },
        },
      });
      expect(result).toBe('1.0.5');
    });

    it('should handle version gaps with offsetLevel correctly', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.1.0' },
          { version: '1.3.0' }, // gap: missing 1.2.0
          { version: '2.0.0' },
          { version: '2.2.0' }, // gap: missing 2.1.0
          { version: '2.5.0' }, // gap: missing 2.3.0, 2.4.0
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      // Test minor offset -1 within major version 2
      const result = await getNewValue({
        currentValue: '2.5.0',
        rangeStrategy: 'auto',
        currentVersion: '2.5.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
            offsetLevel: 'minor',
          },
        },
      });
      expect(result).toBe('2.2.0'); // Should get the previous minor version
    });
  });

  describe('non-semver versioning schemes', () => {
    it('should handle PEP440 versions', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.0.1' },
          { version: '1.1.0rc1' }, // Release candidate
          { version: '1.1.0' },
          { version: '1.2.0a1' }, // Alpha
          { version: '1.2.0b1' }, // Beta
          { version: '1.2.0' },
          { version: '2.0.0.dev1' }, // Development release
          { version: '2.0.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '2.0.0',
        rangeStrategy: 'auto',
        currentVersion: '2.0.0',
        config: {
          datasource: 'pypi',
          packageName: 'test-package',
          versioning: 'pep440',
          constraints: {
            offset: -1,
            ignorePrerelease: true, // Should filter out pre-releases
          },
        },
      });

      expect(result).toBe('1.2.0'); // Should skip pre-releases and get stable version
    });

    it('should handle loose versioning', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: 'v1.0' },
          { version: '1.1' },
          { version: 'release-1.2.0' },
          { version: '2.0-SNAPSHOT' },
          { version: '2.0' },
          { version: 'v2.1.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: 'v2.1.0',
        rangeStrategy: 'auto',
        currentVersion: 'v2.1.0',
        config: {
          datasource: 'github-releases',
          packageName: 'test-package',
          versioning: 'loose',
          constraints: {
            offset: -1,
          },
        },
      });

      expect(result).toBe('2.0'); // Should handle loose versioning
    });

    it('should handle docker versioning', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0' },
          { version: '1.0-alpine' },
          { version: '1.1' },
          { version: '1.1-alpine' },
          { version: '2.0' },
          { version: '2.0-alpine' },
          { version: 'latest' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '2.0-alpine',
        rangeStrategy: 'auto',
        currentVersion: '2.0-alpine',
        config: {
          datasource: 'docker',
          packageName: 'test-image',
          versioning: 'docker',
          constraints: {
            offset: -2, // Changed to -2 to test actual offset behavior
          },
        },
      });

      expect(result).toBe('1.1'); // Docker versioning sorts base versions before suffixed versions
    });
  });

  describe('offsetLevel and offset interaction validation', () => {
    it('should ignore offsetLevel when offset is not specified', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.1.0' },
          { version: '2.0.0' },
          { version: '2.1.0' },
          { version: '3.0.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '2.0.0',
        rangeStrategy: 'auto',
        currentVersion: '2.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offsetLevel: 'major', // No offset specified
          },
        },
      });

      expect(result).toBe('3.0.0'); // Should return latest, ignoring offsetLevel
    });

    it('should ignore offsetLevel when offset is 0', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.1.0' },
          { version: '2.0.0' },
          { version: '2.1.0' },
          { version: '3.0.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '2.0.0',
        rangeStrategy: 'auto',
        currentVersion: '2.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: 0,
            offsetLevel: 'major', // Should be ignored when offset is 0
          },
        },
      });

      expect(result).toBe('3.0.0'); // Should return latest, ignoring offsetLevel
    });

    it('should work correctly when both offset and offsetLevel are specified', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.1.0' },
          { version: '2.0.0' },
          { version: '2.1.0' },
          { version: '3.0.0' },
          { version: '3.1.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '3.1.0',
        rangeStrategy: 'auto',
        currentVersion: '3.1.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
            offsetLevel: 'major', // Should work correctly
          },
        },
      });

      expect(result).toBe('2.1.0'); // Should return latest of n-1 major
    });

    it('should handle invalid offsetLevel with valid offset', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '2.0.0' },
          { version: '3.0.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '3.0.0',
        rangeStrategy: 'auto',
        currentVersion: '3.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
            offsetLevel: 'invalid' as any, // Invalid offsetLevel
          },
        },
      });

      expect(result).toBe('3.0.0'); // Should return current value due to validation error
    });

    it('should handle positive offset (invalid) with offsetLevel', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '2.0.0' },
          { version: '3.0.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '2.0.0',
        rangeStrategy: 'auto',
        currentVersion: '2.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: 1, // Positive offset is invalid
            offsetLevel: 'major',
          },
        },
      });

      expect(result).toBe('2.0.0'); // Should return current value due to validation error
    });
  });

  describe('edge cases with offsetLevel', () => {
    it('should handle empty groups at specific levels', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.0.1' },
          { version: '2.0.0' }, // Only one version in major 2
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '2.0.0',
        rangeStrategy: 'auto',
        currentVersion: '2.0.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
            offsetLevel: 'minor', // No other minor versions in major 2
          },
        },
      });

      expect(result).toBe('2.0.0'); // Should return current when no other versions at level
    });

    it('should handle patch level with no patches', async () => {
      const mockReleases: ReleaseResult = {
        releases: [
          { version: '1.0.0' },
          { version: '1.1.0' },
          { version: '1.2.0' },
          { version: '2.0.0' },
        ],
      };
      vi.spyOn(registry, 'getPkgReleases').mockResolvedValue(mockReleases);

      const result = await getNewValue({
        currentValue: '1.2.0',
        rangeStrategy: 'auto',
        currentVersion: '1.2.0',
        config: {
          datasource: 'npm',
          packageName: 'test-package',
          versioning: 'semver',
          constraints: {
            offset: -1,
            offsetLevel: 'patch', // No patches for 1.2.x
          },
        },
      });

      expect(result).toBe('1.2.0'); // Should return current when no patches available
    });
  });
});
