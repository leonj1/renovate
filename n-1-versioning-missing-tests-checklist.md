# N-1 Versioning Missing Tests Checklist

This checklist identifies test cases that should be added to improve coverage for the n-1 versioning feature in Renovate.

## Edge Cases

- [ ] **Empty versions array**
  - Test when `registry.getPkgReleases()` returns empty releases array
  - Expected: Should return `currentValue` unchanged
- [ ] **Single version available**

  - Test when only one version exists in the registry
  - Test with offset -1 (should return currentValue)
  - Test with offset 0 (should return the single version)

- [ ] **Offset equals array length**

  - Test when offset would select exactly the first version
  - Example: 3 versions available, offset = -2

- [ ] **Large negative offset**
  - Test with offset like -100 when only 5 versions exist
  - Expected: Should return `currentValue` unchanged

## Invalid Version Handling

- [ ] **Mixed valid/invalid versions**

  - Test array containing versions like: ['1.0.0', 'invalid', '2.0.0', 'not-a-version', '3.0.0']
  - Expected: Invalid versions should be filtered out before processing

- [ ] **All invalid versions**
  - Test when all versions in the array are invalid according to the versioning scheme
  - Expected: Should return `currentValue` unchanged

## Pre-release Version Handling

- [ ] **All pre-release versions**

  - Test when all available versions are pre-releases (e.g., '1.0.0-alpha', '1.0.0-beta', '2.0.0-rc.1')
  - Test with `ignorePrerelease: true` (default)
  - Expected: Should return `currentValue` unchanged

- [ ] **Mixed stable and pre-release with ignorePrerelease: false**

  - Test with versions: ['1.0.0', '2.0.0-beta', '2.0.0', '3.0.0-alpha', '3.0.0']
  - Test that pre-releases are included in the selection when `ignorePrerelease: false`

- [ ] **Pre-release ordering**
  - Test correct ordering of pre-release versions
  - Example: ['1.0.0', '2.0.0-alpha.1', '2.0.0-alpha.2', '2.0.0-beta.1', '2.0.0']

## Different Versioning Schemes

- [ ] **NPM versioning**

  - Test with npm-specific version formats
  - Include tests with version ranges and tags

- [ ] **Maven versioning**

  - Test with Maven version formats (e.g., '1.0.0-SNAPSHOT', '1.0.0.RELEASE')
  - Test offset behavior with Maven's version ordering

- [ ] **Python (PEP440) versioning**

  - Test with Python version formats (e.g., '1.0.0.dev0', '1.0.0a1', '1.0.0rc1')
  - Verify correct filtering and ordering

- [ ] **Docker versioning**

  - Test with Docker tags that may not follow semver
  - Example: ['latest', 'v1', 'v2', '20.04', '22.04']

- [ ] **Loose versioning**
  - Test with loose version formats
  - Example: ['v1', 'v1.2', 'v1.2.3', 'version-4']

## Error Handling

- [ ] **Registry lookup failure**

  - Test when `registry.getPkgReleases()` throws an error
  - Expected: Should handle gracefully, possibly return `currentValue`

- [ ] **Registry returns null/undefined**

  - Test when registry returns null instead of a proper ReleaseResult
  - Expected: Should handle gracefully

- [ ] **Invalid versioning scheme**

  - Test with non-existent versioning scheme
  - Expected: Should handle error from `get(config.versioning)`

- [ ] **Malformed release data**
  - Test with releases missing version property
  - Test with releases containing null/undefined versions

## Performance and Scale

- [ ] **Large version arrays**

  - Test with 1000+ versions
  - Verify performance is acceptable
  - Verify correct version is selected

- [ ] **Complex version sorting**
  - Test with versions that require complex comparison
  - Example: Mix of major, minor, patch, and pre-release versions

## Integration with Constraints

- [ ] **Offset with allowedVersions constraint**

  - Test how offset interacts with version constraints
  - Example: `allowedVersions: ">=2.0.0 <4.0.0"` with offset -1

- [ ] **Offset with version pinning**

  - Test behavior when version is pinned but offset is specified

- [ ] **Multiple constraints**
  - Test with complex constraint combinations

## Special Scenarios

- [ ] **Duplicate versions**

  - Test when registry returns duplicate version entries
  - Expected: Duplicates should be handled appropriately

- [ ] **Version rollback scenario**

  - Test when current version is newer than latest in registry
  - Test offset behavior in this case

- [ ] **Non-sequential versions**

  - Test with version gaps (e.g., 1.0.0, 1.0.5, 2.0.0 - missing 1.0.1-1.0.4)
  - Verify offset counts actual versions, not sequential numbers

- [ ] **Zero offset**

  - Test explicit offset of 0
  - Expected: Should return latest version

- [ ] **Positive offset**
  - Test with positive offset values
  - Expected: Should handle appropriately (likely return currentValue)

## Type Safety and Input Validation

- [ ] **Missing config properties**

  - Test when config.constraints is undefined
  - Test when config.versioning is undefined

- [ ] **Invalid offset types**

  - Test with non-numeric offset values
  - Test with float offset values (e.g., -1.5)

- [ ] **Null/undefined handling**
  - Test various null/undefined inputs
  - Ensure no runtime errors

## Test Implementation Notes

1. Each test should use appropriate mocking for `registry.getPkgReleases()`
2. Tests should verify both the returned value and any side effects
3. Consider using table-driven tests for similar scenarios with different inputs
4. Ensure tests are independent and don't rely on shared state
5. Add descriptive test names that clearly indicate what is being tested

## Priority Recommendations

High Priority:

- Empty versions array
- Invalid version handling
- Error handling scenarios
- Different versioning schemes

Medium Priority:

- Pre-release handling variations
- Performance tests
- Integration with constraints

Low Priority:

- Edge cases with unusual inputs
- Duplicate version handling
