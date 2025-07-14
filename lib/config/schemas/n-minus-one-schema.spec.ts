import { describe, expect, it } from 'vitest';
import {
  PackageRuleSchema,
  validateConstraintsInRule,
  validatePackageRules,
} from './n-minus-one-schema';

describe('config/schemas/n-minus-one-schema', () => {
  describe('PackageRuleSchema', () => {
    it('should accept valid package rules with constraints', () => {
      const validRules = [
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
        {
          matchPackagePatterns: ['^@angular/'],
          constraints: {
            offset: -1,
            offsetLevel: 'minor',
          },
        },
        {
          matchDatasources: ['npm'],
          matchPackageNames: ['vue'],
          constraints: {
            allowedVersions: '< 3.0.0',
            offset: -1,
          },
        },
      ];

      for (const rule of validRules) {
        const result = PackageRuleSchema.safeParse(rule);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid constraints in package rules', () => {
      const invalidRules = [
        {
          matchPackageNames: ['react'],
          constraints: {
            offset: 1, // positive offset not allowed
          },
        },
        {
          matchPackageNames: ['lodash'],
          constraints: {
            offsetLevel: 'major', // offsetLevel without offset
          },
        },
        {
          matchPackageNames: ['vue'],
          constraints: {
            offset: 0,
            offsetLevel: 'minor', // offsetLevel with zero offset
          },
        },
        {
          matchPackageNames: ['angular'],
          constraints: {
            offset: -1,
            unknownProp: 'value', // unknown property
          },
        },
      ];

      for (const rule of invalidRules) {
        const result = PackageRuleSchema.safeParse(rule);
        expect(result.success).toBe(false);
      }
    });

    it('should allow package rules without constraints', () => {
      const rule = {
        matchPackageNames: ['react'],
        enabled: false,
      };

      const result = PackageRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it('should validate all match criteria', () => {
      const rule = {
        matchPackageNames: ['react', 'react-dom'],
        matchDepNames: 'vue', // allow string
        matchPackagePatterns: ['^@angular/'],
        matchCurrentVersion: '^1.0.0',
        matchDatasources: ['npm'],
        matchDepTypes: ['dependencies'],
        matchFiles: ['package.json'],
        matchUpdateTypes: ['major', 'minor'],
        matchManagers: ['npm'],
        constraints: {
          offset: -1,
        },
      };

      const result = PackageRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });
  });

  describe('validatePackageRules', () => {
    it('should validate array of package rules', () => {
      const packageRules = [
        {
          matchPackageNames: ['react'],
          constraints: { offset: -1 },
        },
        {
          matchDepNames: ['lodash'],
          constraints: { offset: -2, offsetLevel: 'major' },
        },
      ];

      const result = validatePackageRules(packageRules);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should report errors for invalid rules', () => {
      const packageRules = [
        {
          matchPackageNames: ['react'],
          constraints: { offset: -1 }, // valid
        },
        {
          matchPackageNames: ['lodash'],
          constraints: { offset: 1 }, // invalid: positive offset
        },
        {
          matchPackageNames: ['vue'],
          constraints: { offsetLevel: 'major' }, // invalid: offsetLevel without offset
        },
      ];

      const result = validatePackageRules(packageRules);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors![0].rule).toBe(1);
      expect(result.errors![1].rule).toBe(2);
    });

    it('should reject non-array input', () => {
      const invalidInputs = [
        null,
        undefined,
        'string',
        123,
        { matchPackageNames: ['react'] },
      ];

      for (const input of invalidInputs) {
        const result = validatePackageRules(input);
        expect(result.success).toBe(false);
        expect(result.errors![0].rule).toBe(-1);
      }
    });
  });

  describe('validateConstraintsInRule', () => {
    it('should validate valid constraints', () => {
      const validConstraints = [
        { offset: -1 },
        { offset: -2, offsetLevel: 'major' },
        { offset: -1, offsetLevel: 'minor', ignorePrerelease: true },
        { allowedVersions: '< 2.0.0', offset: -1 },
      ];

      for (const constraints of validConstraints) {
        const result = validateConstraintsInRule(constraints);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(constraints);
      }
    });

    it('should reject invalid constraints', () => {
      const invalidConstraints = [
        { offset: 1 }, // positive offset
        { offsetLevel: 'major' }, // offsetLevel without offset
        { offset: 0, offsetLevel: 'minor' }, // offsetLevel with zero offset
        { offset: -1, unknownProp: 'value' }, // unknown property
        { offset: '-1' }, // wrong type
      ];

      for (const constraints of invalidConstraints) {
        const result = validateConstraintsInRule(constraints);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should provide detailed error messages', () => {
      const result = validateConstraintsInRule({
        offset: 1,
        offsetLevel: 'invalid',
        unknownProp: 'value',
      });

      expect(result.success).toBe(false);
      expect(result.error?.errors).toHaveLength(3);

      const messages = result.error!.errors.map((e) => e.message);
      expect(messages).toContain('Offset must be 0 or a negative integer');
      expect(messages.some((m) => m.includes('Invalid enum value'))).toBe(true);
      expect(messages.some((m) => m.includes('Unrecognized key'))).toBe(true);
    });
  });
});
