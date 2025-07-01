import { logger } from '../../logger';
import { registry } from '../../util/registry';
import type { Release } from '../datasource/types';
import versionings from './api';
import { Versioning } from './schema';
import * as semverCoerced from './semver-coerced';
import type { VersioningApi, VersioningApiConstructor } from './types';

export * from './types';

export const defaultVersioning = semverCoerced;

export const getVersioningList = (): string[] => Array.from(versionings.keys());
/**
 * Get versioning map. Can be used to dynamically add new versioning type
 */
export const getVersionings = (): Map<
  string,
  VersioningApi | VersioningApiConstructor
> => versionings;

export function get(versioning: string | null | undefined): VersioningApi {
  const res = Versioning.safeParse(versioning ?? defaultVersioning.id);

  if (!res.success) {
    const [issue] = res.error.issues;
    if (issue && issue.code === 'custom' && issue.params?.error) {
      throw issue.params.error;
    }

    // istanbul ignore next: should never happen
    throw res.error;
  }

  return res.data;
}

interface GetNewValueConfig {
  currentValue: string;
  rangeStrategy: string;
  currentVersion: string;
  config: {
    versioning: string;
    constraints?: {
      allowedVersions?: string;
      offset?: number;
      offsetLevel?: 'major' | 'minor' | 'patch';
      ignorePrerelease?: boolean;
    };
  };
}

/**
 * Groups versions by semantic version level (major, minor, or patch)
 */
function groupVersionsBySemverLevel(
  versions: string[],
  versioning: VersioningApi,
  level: 'major' | 'minor' | 'patch',
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const version of versions) {
    if (!versioning.isVersion(version)) {
      continue;
    }

    let groupKey: string;
    const major = versioning.getMajor(version);
    const minor = versioning.getMinor(version);
    const patch = versioning.getPatch(version);

    switch (level) {
      case 'major':
        groupKey = `${major}`;
        break;
      case 'minor':
        groupKey = `${major}.${minor}`;
        break;
      case 'patch':
        groupKey = `${major}.${minor}.${patch}`;
        break;
      default:
        continue;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(version);
  }

  // Sort versions within each group
  for (const groupKey in groups) {
    groups[groupKey].sort((a: string, b: string) =>
      versioning.sortVersions(a, b),
    );
  }

  return groups;
}

/**
 * Gets the nth version from semver-level grouped versions
 */
function getVersionFromSemverGroups(
  groups: Record<string, string[]>,
  versioning: VersioningApi,
  offset: number,
  level: 'major' | 'minor' | 'patch',
  currentVersion: string,
): string | null {
  // Get sorted group keys
  const groupKeys = Object.keys(groups).sort((a, b) => {
    // Compare the highest version from each group to determine group order
    const aLatest = groups[a][groups[a].length - 1];
    const bLatest = groups[b][groups[b].length - 1];
    return versioning.sortVersions(aLatest, bLatest);
  });

  if (groupKeys.length === 0) {
    return null;
  }

  // For minor and patch levels, filter to only consider groups within the same parent level
  let filteredGroupKeys = groupKeys;

  if (level === 'minor') {
    // Only consider minor versions within the same major
    const currentMajor = versioning.getMajor(currentVersion);
    filteredGroupKeys = groupKeys.filter((key) => {
      const [major] = key.split('.');
      return parseInt(major, 10) === currentMajor;
    });
  } else if (level === 'patch') {
    // Only consider patch versions within the same major.minor
    const currentMajor = versioning.getMajor(currentVersion);
    const currentMinor = versioning.getMinor(currentVersion);
    filteredGroupKeys = groupKeys.filter((key) => {
      const [major, minor] = key.split('.');
      return (
        parseInt(major, 10) === currentMajor &&
        parseInt(minor, 10) === currentMinor
      );
    });
  }

  if (filteredGroupKeys.length === 0) {
    return null;
  }

  // Apply offset to select target group
  const targetGroupIndex = filteredGroupKeys.length - 1 + offset;

  if (targetGroupIndex < 0 || targetGroupIndex >= filteredGroupKeys.length) {
    return null;
  }

  const targetGroup = groups[filteredGroupKeys[targetGroupIndex]];

  // Return the latest version from the target group
  return targetGroup[targetGroup.length - 1];
}

export async function getNewValue({
  currentValue,
  rangeStrategy,
  currentVersion,
  config,
}: GetNewValueConfig): Promise<string> {
  const versioning = get(config.versioning);

  let versions;
  try {
    versions = await registry.getPkgReleases();
  } catch (error) {
    logger.debug(
      { error, currentValue, versioning: config.versioning },
      'Failed to fetch package releases, returning currentValue',
    );
    return currentValue;
  }

  if (!versions.releases?.length) {
    return currentValue;
  }

  // Filter out invalid versions
  let filteredVersions = versions.releases
    .map((release: Release) => release.version)
    .filter((version: string) => versioning.isValid(version));

  // Filter out prerelease versions if ignorePrerelease is true or not specified
  const ignorePrerelease = config.constraints?.ignorePrerelease !== false;
  if (ignorePrerelease) {
    filteredVersions = filteredVersions.filter((version: string) =>
      versioning.isStable(version),
    );
  }

  // Sort the filtered versions
  const sortedVersions = filteredVersions.sort((a: string, b: string) =>
    versioning.sortVersions(a, b),
  );

  if (!sortedVersions.length) {
    return currentValue;
  }

  const offset = config.constraints?.offset ?? 0;
  const offsetLevel = config.constraints?.offsetLevel;

  // If offsetLevel is specified, use semver-level grouping
  if (offsetLevel && offset !== 0) {
    const groups = groupVersionsBySemverLevel(
      sortedVersions,
      versioning,
      offsetLevel,
    );
    const result = getVersionFromSemverGroups(
      groups,
      versioning,
      offset,
      offsetLevel,
      currentVersion,
    );

    if (result) {
      return result;
    }

    // Fallback to current value if no valid target found
    return currentValue;
  }

  // Original behavior for global offset
  const targetIndex = sortedVersions.length - 1 + offset;

  if (targetIndex < 0 || targetIndex >= sortedVersions.length) {
    return currentValue;
  }

  return sortedVersions[targetIndex];
}
