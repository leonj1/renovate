/* eslint-disable no-console */
/**
 * Performance profiling script for N-1 versioning feature
 *
 * This script measures the performance of version sorting, grouping, and offset calculations
 * with large datasets (1000, 5000, and 10000 versions).
 */

import { performance } from 'perf_hooks';
import type { VersioningApi } from './types';
import { get } from './index';

// Interface for individual performance results (kept for potential future use)

interface ProfileResults {
  testSet: number;
  sortingTime: number;
  groupingTime: number;
  offsetCalculationTime: number;
  totalTime: number;
  memoryUsed: number;
}

// Generate random semver versions
function generateVersions(count: number): string[] {
  const versions: string[] = [];
  const majors = Math.min(50, Math.ceil(count / 100)); // Reasonable distribution
  const minorsPerMajor = Math.min(20, Math.ceil(count / majors / 10));
  const patchesPerMinor = Math.ceil(count / majors / minorsPerMajor);

  for (let major = 0; major < majors && versions.length < count; major++) {
    for (
      let minor = 0;
      minor < minorsPerMajor && versions.length < count;
      minor++
    ) {
      for (
        let patch = 0;
        patch < patchesPerMinor && versions.length < count;
        patch++
      ) {
        versions.push(`${major}.${minor}.${patch}`);

        // Add some pre-release versions for realism
        if (Math.random() < 0.1 && versions.length < count) {
          versions.push(
            `${major}.${minor}.${patch}-alpha.${Math.floor(Math.random() * 5)}`,
          );
        }
      }
    }
  }

  // Shuffle to simulate unordered input
  for (let i = versions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [versions[i], versions[j]] = [versions[j], versions[i]];
  }

  return versions;
}

// Measure memory usage
function getMemoryUsage(): number {
  if (global.gc) {
    global.gc();
  }
  const usage = process.memoryUsage();
  return usage.heapUsed / 1024 / 1024; // Convert to MB
}

// Profile sorting performance
function profileSorting(versions: string[], versioning: VersioningApi): number {
  const start = performance.now();

  [...versions].sort((a, b) => versioning.sortVersions(a, b));

  const end = performance.now();
  return end - start;
}

// Profile grouping performance
function profileGrouping(
  versions: string[],
  versioning: VersioningApi,
  level: 'major' | 'minor' | 'patch',
): number {
  const start = performance.now();

  const groups: Record<string, string[]> = {};

  for (const version of versions) {
    if (!versioning.isVersion(version)) {
      continue;
    }

    let groupKey: string;
    const major = versioning.getMajor(version);

    if (level === 'major') {
      groupKey = `${major}`;
    } else {
      const minor = versioning.getMinor(version);

      if (level === 'minor') {
        groupKey = `${major}.${minor}`;
      } else {
        const patch = versioning.getPatch(version);
        groupKey = `${major}.${minor}.${patch}`;
      }
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(version);
  }

  // Sort versions within each group
  for (const groupKey in groups) {
    if (groups[groupKey].length > 1) {
      groups[groupKey].sort((a, b) => versioning.sortVersions(a, b));
    }
  }

  const end = performance.now();
  return end - start;
}

// Profile offset calculation
function profileOffsetCalculation(
  sortedVersions: string[],
  versioning: VersioningApi,
  offset: number,
): number {
  const start = performance.now();

  // Simulate offset calculation
  const targetIndex = sortedVersions.length - 1 + offset;

  if (targetIndex >= 0 && targetIndex < sortedVersions.length) {
    // Target version would be at sortedVersions[targetIndex]
  }

  const end = performance.now();
  return end - start;
}

// Main profiling function
export function profileNMinusOnePerformance(): void {
  console.log('N-1 Versioning Performance Profile\n');
  console.log('=====================================\n');

  const versioning = get('semver');
  const testSizes = [1000, 5000, 10000];
  const results: ProfileResults[] = [];

  for (const size of testSizes) {
    console.log(`\nTesting with ${size} versions...`);
    console.log('-'.repeat(50));

    const memStart = getMemoryUsage();
    const versions = generateVersions(size);
    const memAfterGenerate = getMemoryUsage();

    console.log(
      `Generated ${versions.length} versions (Memory: +${(memAfterGenerate - memStart).toFixed(2)} MB)`,
    );

    // Profile sorting
    const sortingTime = profileSorting(versions, versioning);
    console.log(
      `Sorting: ${sortingTime.toFixed(2)} ms (${((size / sortingTime) * 1000).toFixed(0)} versions/sec)`,
    );

    // Profile grouping for different levels
    const groupingTimes: Record<string, number> = {};
    for (const level of ['major', 'minor', 'patch'] as const) {
      const time = profileGrouping(versions, versioning, level);
      groupingTimes[level] = time;
      console.log(
        `Grouping by ${level}: ${time.toFixed(2)} ms (${((size / time) * 1000).toFixed(0)} versions/sec)`,
      );
    }

    // Profile offset calculations
    const sortedVersions = [...versions].sort((a, b) =>
      versioning.sortVersions(a, b),
    );
    const offsets = [-1, -5, -10, -50];
    let totalOffsetTime = 0;

    for (const offset of offsets) {
      const time = profileOffsetCalculation(sortedVersions, versioning, offset);
      totalOffsetTime += time;
      console.log(`Offset calculation (${offset}): ${time.toFixed(2)} ms`);
    }

    const avgOffsetTime = totalOffsetTime / offsets.length;
    const totalTime =
      sortingTime +
      Object.values(groupingTimes).reduce((a, b) => a + b, 0) +
      totalOffsetTime;
    const memEnd = getMemoryUsage();

    results.push({
      testSet: size,
      sortingTime,
      groupingTime: Object.values(groupingTimes).reduce((a, b) => a + b, 0) / 3,
      offsetCalculationTime: avgOffsetTime,
      totalTime,
      memoryUsed: memEnd - memStart,
    });
  }

  // Print summary
  console.log('\n\nPerformance Summary');
  console.log('===================\n');
  console.log(
    '| Versions | Sorting (ms) | Grouping (ms) | Offset (ms) | Total (ms) | Memory (MB) |',
  );
  console.log(
    '|----------|--------------|---------------|-------------|------------|-------------|',
  );

  for (const result of results) {
    console.log(
      `| ${result.testSet.toString().padEnd(8)} | ${result.sortingTime.toFixed(2).padEnd(12)} | ${result.groupingTime
        .toFixed(2)
        .padEnd(
          13,
        )} | ${result.offsetCalculationTime.toFixed(2).padEnd(11)} | ${result.totalTime
        .toFixed(2)
        .padEnd(10)} | ${result.memoryUsed.toFixed(2).padEnd(11)} |`,
    );
  }

  // Performance analysis
  console.log('\n\nPerformance Analysis');
  console.log('====================\n');

  // Check for linear vs quadratic growth
  if (results.length >= 2) {
    const ratio = results[results.length - 1].totalTime / results[0].totalTime;
    const sizeRatio = testSizes[testSizes.length - 1] / testSizes[0];

    if (ratio <= sizeRatio * 1.5) {
      console.log('✅ Performance scales linearly with version count');
    } else if (ratio <= sizeRatio * sizeRatio) {
      console.log('⚠️  Performance shows quadratic growth with version count');
    } else {
      console.log('❌ Performance degradation detected with large datasets');
    }
  }

  // Identify bottlenecks
  console.log('\nBottleneck Analysis:');
  for (const result of results) {
    const sortingPercent = (result.sortingTime / result.totalTime) * 100;
    const groupingPercent =
      ((result.groupingTime * 3) / result.totalTime) * 100; // multiply by 3 as we test 3 levels

    console.log(`\n${result.testSet} versions:`);
    console.log(`  - Sorting: ${sortingPercent.toFixed(1)}% of total time`);
    console.log(`  - Grouping: ${groupingPercent.toFixed(1)}% of total time`);

    if (sortingPercent > 60) {
      console.log('  ⚠️  Sorting is the primary bottleneck');
    }
    if (groupingPercent > 60) {
      console.log('  ⚠️  Grouping is the primary bottleneck');
    }
  }

  // Recommendations
  console.log('\n\nRecommendations');
  console.log('================\n');

  const largestTest = results[results.length - 1];
  if (largestTest.sortingTime > 100) {
    console.log(
      '- Consider implementing a more efficient sorting algorithm for large datasets',
    );
    console.log('- Consider caching sorted results when possible');
  }

  if (largestTest.memoryUsed > 50) {
    console.log(
      '- Memory usage is high; consider streaming or chunking for very large datasets',
    );
  }

  if (largestTest.totalTime < 100) {
    console.log('✅ Performance is excellent even with large datasets');
  } else if (largestTest.totalTime < 500) {
    console.log('✅ Performance is acceptable for most use cases');
  } else {
    console.log('⚠️  Performance optimization recommended for production use');
  }
}

// Run if executed directly
if (require.main === module) {
  try {
    profileNMinusOnePerformance();
  } catch (error) {
    console.error(error);
  }
}
