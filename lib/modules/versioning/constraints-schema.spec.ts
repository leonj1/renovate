import { describe, expect, it } from 'vitest';
import { ConstraintsSchema, validateConstraints } from './constraints-schema';

describe('modules/versioning/constraints-schema', () => {
  describe('ConstraintsSchema', () => {
    it('should accept valid constraints object', () => {
      const validConstraints = [
        {},
        { allowedVersions: '>= 1.0.0' },
        { offset: -1 },
        { offset: 0 },
        { offset: -5, offsetLevel: 'major' },
        { offset: -1, offsetLevel: 'minor' },
        { offset: -2, offsetLevel: 'patch' },
        { ignorePrerelease: true },
        { ignorePrerelease: false },
        {
          allowedVersions: '< 2.0.0',
          offset: -1,
          offsetLevel: 'major',
          ignorePrerelease: true,
        },
      ];

      for (const constraints of validConstraints) {
        const result = ConstraintsSchema.safeParse(constraints);
        expect(result.success).toBe(true);
      }
    });

    it('should reject positive offset values', () => {
      const result = ConstraintsSchema.safeParse({ offset: 1 });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe(
        'Offset must be 0 or a negative integer',
      );
    });

    it('should reject non-integer offset values', () => {
      const result = ConstraintsSchema.safeParse({ offset: -1.5 });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toContain('Expected integer');
    });

    it('should reject invalid offsetLevel values', () => {
      const invalidLevels = ['micro', 'build', 'Major', 'MINOR', 'invalid'];

      for (const level of invalidLevels) {
        const result = ConstraintsSchema.safeParse({
          offset: -1,
          offsetLevel: level,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject offsetLevel without offset', () => {
      const result = ConstraintsSchema.safeParse({ offsetLevel: 'major' });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe(
        'offsetLevel requires a non-zero offset value',
      );
    });

    it('should reject offsetLevel with zero offset', () => {
      const result = ConstraintsSchema.safeParse({
        offset: 0,
        offsetLevel: 'minor',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe(
        'offsetLevel requires a non-zero offset value',
      );
    });

    it('should reject non-boolean ignorePrerelease values', () => {
      const invalidValues = ['true', 'false', 1, 0, null];

      for (const value of invalidValues) {
        const result = ConstraintsSchema.safeParse({
          ignorePrerelease: value,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject unknown properties', () => {
      const result = ConstraintsSchema.safeParse({
        offset: -1,
        unknownProperty: 'value',
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toContain('Unrecognized key');
    });

    it('should reject invalid property types', () => {
      const invalidConstraints = [
        { offset: '1' }, // string instead of number
        { offset: null }, // null
        { offsetLevel: 1 }, // number instead of string
        { allowedVersions: 123 }, // number instead of string
      ];

      for (const constraints of invalidConstraints) {
        const result = ConstraintsSchema.safeParse(constraints);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('validateConstraints', () => {
    it('should return success for valid constraints', () => {
      const result = validateConstraints({
        offset: -1,
        offsetLevel: 'major',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        offset: -1,
        offsetLevel: 'major',
      });
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid constraints', () => {
      const result = validateConstraints({
        offset: 1,
        offsetLevel: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.errors).toHaveLength(2);
    });

    it('should handle null and undefined', () => {
      expect(validateConstraints(null).success).toBe(false);
      expect(validateConstraints(undefined).success).toBe(false);
    });

    it('should handle non-object types', () => {
      expect(validateConstraints('string').success).toBe(false);
      expect(validateConstraints(123).success).toBe(false);
      expect(validateConstraints(true).success).toBe(false);
      expect(validateConstraints([]).success).toBe(false);
    });
  });
});
