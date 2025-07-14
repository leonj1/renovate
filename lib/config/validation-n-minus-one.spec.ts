import { describe, expect, it } from 'vitest';
import { validateConfig } from './validation';

describe('config/validation-n-minus-one', () => {
  describe('packageRules with constraints', () => {
    it('should validate valid constraints in packageRules', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: -1,
            },
          },
          {
            matchDepNames: ['lodash'],
            constraints: {
              offset: -2,
              offsetLevel: 'major',
              ignorePrerelease: true,
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject positive offset values', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: 1,
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain(
        'Offset must be 0 or a negative integer',
      );
    });

    it('should reject offsetLevel without offset', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offsetLevel: 'major',
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain(
        'offsetLevel requires a non-zero offset value',
      );
    });

    it('should reject offsetLevel with zero offset', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: 0,
              offsetLevel: 'minor',
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain(
        'offsetLevel requires a non-zero offset value',
      );
    });

    it('should reject invalid offsetLevel values', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: -1,
              offsetLevel: 'invalid',
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid enum value');
    });

    it('should reject unknown properties in constraints', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: -1,
              unknownProperty: 'value',
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unrecognized key');
    });

    it('should validate non-string offset values', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: '-1', // string instead of number
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected number');
    });

    it('should validate non-integer offset values', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: -1.5,
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected integer');
    });

    it('should show the correct path in error messages', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react'],
            constraints: {
              offset: -1, // valid
            },
          },
          {
            matchPackageNames: ['vue'],
            constraints: {
              offset: 2, // invalid
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain(
        'packageRules[1].constraints.offset',
      );
    });

    it('should allow constraints with other packageRule options', async () => {
      const config = {
        packageRules: [
          {
            matchPackageNames: ['react', 'react-dom'],
            matchUpdateTypes: ['major'] as any,
            enabled: false,
            groupName: 'React packages',
            constraints: {
              offset: -1,
              offsetLevel: 'major',
              ignorePrerelease: true,
              allowedVersions: '< 18.0.0',
            },
          },
        ],
      };

      const result = await validateConfig('repo', config);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
