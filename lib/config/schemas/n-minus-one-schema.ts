import { z } from 'zod';

/**
 * Schema for N-1 versioning configuration in packageRules
 */

// Re-use the constraints schema from versioning module
const ConstraintsConfigSchema = z
  .object({
    allowedVersions: z.string().optional(),
    offset: z
      .number()
      .int()
      .max(0, 'Offset must be 0 or a negative integer')
      .optional(),
    offsetLevel: z.enum(['major', 'minor', 'patch']).optional(),
    ignorePrerelease: z.boolean().optional(),
  })
  .strict()
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

/**
 * Schema for packageRules with N-1 versioning support
 */
export const PackageRuleSchema = z.object({
  // Match criteria
  matchPackageNames: z.union([z.string(), z.array(z.string())]).optional(),
  matchDepNames: z.union([z.string(), z.array(z.string())]).optional(),
  matchPackagePatterns: z.union([z.string(), z.array(z.string())]).optional(),
  matchDepPatterns: z.union([z.string(), z.array(z.string())]).optional(),
  matchCurrentVersion: z.string().optional(),
  matchCurrentValue: z.string().optional(),
  matchDatasources: z.array(z.string()).optional(),
  matchCategories: z.array(z.string()).optional(),
  matchDepTypes: z.array(z.string()).optional(),
  matchFiles: z.array(z.string()).optional(),
  matchPaths: z.array(z.string()).optional(),
  matchSourceUrls: z.array(z.string()).optional(),
  matchUpdateTypes: z
    .array(
      z.enum([
        'major',
        'minor',
        'patch',
        'pin',
        'digest',
        'lockFileMaintenance',
        'rollback',
        'bump',
        'replacement',
      ]),
    )
    .optional(),
  matchConfidence: z
    .array(z.enum(['low', 'neutral', 'high', 'very high']))
    .optional(),
  matchManagers: z.array(z.string()).optional(),
  matchLanguages: z.array(z.string()).optional(),
  matchBaseBranches: z.array(z.string()).optional(),
  matchFileNames: z.array(z.string()).optional(),

  // N-1 versioning constraints
  constraints: ConstraintsConfigSchema.optional(),

  // Update behavior
  enabled: z.boolean().optional(),
  automerge: z.boolean().optional(),
  automergeType: z.enum(['branch', 'pr', 'pr-comment']).optional(),
  rangeStrategy: z
    .enum([
      'auto',
      'pin',
      'bump',
      'replace',
      'widen',
      'update-lockfile',
      'in-range-only',
    ])
    .optional(),
  semanticCommits: z.enum(['auto', 'enabled', 'disabled']).optional(),
  semanticCommitType: z.string().optional(),
  semanticCommitScope: z.string().nullable().optional(),

  // PR/Branch settings
  recreateClosed: z.boolean().optional(),
  rebaseWhen: z
    .enum(['auto', 'never', 'conflicted', 'behind-base-branch'])
    .optional(),
  groupName: z.string().optional(),
  groupSlug: z.string().optional(),
  schedule: z.union([z.string(), z.array(z.string())]).optional(),
  prPriority: z.number().optional(),

  // Labels
  labels: z.array(z.string()).optional(),
  addLabels: z.array(z.string()).optional(),

  // Other common properties
  description: z.array(z.string()).optional(),
  excludePackageNames: z.array(z.string()).optional(),
  excludePackagePatterns: z.array(z.string()).optional(),
  extends: z.array(z.string()).optional(),
});

export type PackageRule = z.infer<typeof PackageRuleSchema>;

/**
 * Schema for the complete configuration with packageRules
 */
export const ConfigWithPackageRulesSchema = z
  .object({
    packageRules: z.array(PackageRuleSchema).optional(),
    // Allow other properties but don't validate them
  })
  .passthrough();

/**
 * Validates packageRules configuration
 */
export function validatePackageRules(packageRules: unknown): {
  success: boolean;
  data?: PackageRule[];
  errors?: { rule: number; error: z.ZodError }[];
} {
  if (!Array.isArray(packageRules)) {
    return {
      success: false,
      errors: [
        {
          rule: -1,
          error: new z.ZodError([
            {
              code: 'invalid_type',
              expected: 'array',
              received: typeof packageRules,
              path: [],
              message: 'packageRules must be an array',
            },
          ]),
        },
      ],
    };
  }

  const errors: { rule: number; error: z.ZodError }[] = [];
  const validatedRules: PackageRule[] = [];

  packageRules.forEach((rule, index) => {
    const result = PackageRuleSchema.safeParse(rule);
    if (result.success) {
      validatedRules.push(result.data);
    } else {
      errors.push({ rule: index, error: result.error });
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: validatedRules };
}

/**
 * Validates constraints within a package rule
 */
export function validateConstraintsInRule(constraints: unknown): {
  success: boolean;
  data?: z.infer<typeof ConstraintsConfigSchema>;
  error?: z.ZodError;
} {
  const result = ConstraintsConfigSchema.safeParse(constraints);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}
