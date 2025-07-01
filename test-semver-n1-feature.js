// Demo script to test the new semver-level n-1 versioning feature
const { getNewValue } = require('./lib/modules/versioning/index.js');

async function testSemverN1Feature() {
  console.log('Testing semver-level n-1 versioning feature...\n');

  // Mock registry.getPkgReleases to return test data
  const { registry } = require('./lib/util/registry.js');
  const originalGetPkgReleases = registry.getPkgReleases;

  const testCases = [
    {
      name: 'Major level n-1 versioning',
      currentValue: '1.0.0',
      availableVersions: ['1.0.0', '1.1.0', '2.0.0', '2.1.0', '3.0.0', '3.1.0'],
      offsetLevel: 'major',
      offset: -1,
      expected: '2.1.0',
    },
    {
      name: 'Minor level n-1 versioning',
      currentValue: '2.1.0',
      availableVersions: ['2.1.0', '2.1.1', '2.2.0', '2.2.1', '2.3.0', '2.3.1'],
      offsetLevel: 'minor',
      offset: -1,
      expected: '2.2.1',
    },
    {
      name: 'Patch level n-1 versioning',
      currentValue: '2.2.1',
      availableVersions: ['2.2.1', '2.2.2', '2.2.3', '2.2.4', '2.2.5'],
      offsetLevel: 'patch',
      offset: -1,
      expected: '2.2.4',
    },
  ];

  for (const testCase of testCases) {
    // Mock the registry response
    registry.getPkgReleases = () =>
      Promise.resolve({
        releases: testCase.availableVersions.map((version) => ({
          version,
          releaseTimestamp: '2023-01-01T00:00:00.000Z',
        })),
        sourceUrl: '',
        homepage: '',
        registryUrl: '',
      });

    const config = {
      versioning: 'semver',
      constraints: {
        offsetLevel: testCase.offsetLevel,
        offset: testCase.offset,
      },
    };

    try {
      const result = await getNewValue({
        currentValue: testCase.currentValue,
        rangeStrategy: 'replace',
        currentVersion: testCase.currentValue,
        config,
      });

      const passed = result === testCase.expected;
      console.log(`✅ ${testCase.name}`);
      console.log(`   Current: ${testCase.currentValue}`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Got: ${result}`);
      console.log(`   Status: ${passed ? 'PASS' : 'FAIL'}\n`);

      if (!passed) {
        console.error(`Test failed for ${testCase.name}`);
      }
    } catch (error) {
      console.error(`❌ ${testCase.name} - Error:`, error.message);
    }
  }

  // Restore original function
  registry.getPkgReleases = originalGetPkgReleases;

  console.log('✅ Semver-level n-1 versioning feature test completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  testSemverN1Feature().catch(console.error);
}

module.exports = { testSemverN1Feature };
