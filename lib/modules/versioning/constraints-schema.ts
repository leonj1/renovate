import { z } from 'zod';

/**
 * Schema for N-1 versioning constraints object
 */
export const ConstraintsSchema = z
  .object({
    /**
     * Allowed versions pattern (existing functionality)
     */
    allowedVersions: z.string().optional(),

    /**
     * Offset for N-1 versioning - must be 0 or negative
     */
    offset: z
      .number()
      .int()
      .max(0, 'Offset must be 0 or a negative integer')
      .optional(),

    /**
     * Semantic version level for offset application
     */
    offsetLevel: z.enum(['major', 'minor', 'patch']).optional(),

    /**
     * Whether to ignore pre-release versions (defaults to true)
     */
    ignorePrerelease: z.boolean().optional(),
  })
  .strict() // Disallow unknown properties
  .refine(
    (data) => {
      // If offsetLevel is specified, offset must also be specified and non-zero
      if (data.offsetLevel && (!data.offset || data.offset === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'offsetLevel requires a non-zero offset value',
      path: ['offsetLevel'],
    },
  );

export type Constraints = z.infer<typeof ConstraintsSchema>;

/**
 * Validates constraints object and returns parsed result
 */
export function validateConstraints(constraints: unknown): {
  success: boolean;
  data?: Constraints;
  error?: z.ZodError;
} {
  const result = ConstraintsSchema.safeParse(constraints);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}
