# N-1 Versioning Documentation

## Overview

N-1 versioning allows you to specify package versions relative to the latest release using offset constraints. This feature supports multiple versioning schemes beyond traditional semver.

## Supported Versioning Schemes

### Semantic Versioning (semver)

- **Scheme**: `semver`
- **Example versions**: `1.0.0`, `2.1.3`, `3.0.0-beta.1`
- **Behavior**: Standard semantic versioning with major.minor.patch structure
- **Pre-releases**: Filtered by default when `ignorePrerelease: true` (default)

### Python PEP440

- **Scheme**: `pep440`
- **Example versions**: `1.0.0`, `1.1.0rc1`, `1.2.0a1`, `2.0.0.dev1`
- **Behavior**: Follows PEP440 specification for Python package versioning
- **Pre-releases**: Alpha (`a`), beta (`b`), release candidate (`rc`), and dev releases are filtered when `ignorePrerelease: true`

### Loose Versioning

- **Scheme**: `loose`
- **Example versions**: `v1.0`, `1.1`, `release-1.2.0`, `2.0-SNAPSHOT`
- **Behavior**: Flexible versioning that accepts various formats
- **Pre-releases**: Versions with common pre-release indicators (SNAPSHOT, alpha, beta, rc) are filtered

### Docker Versioning

- **Scheme**: `docker`
- **Example versions**: `1.0`, `1.0-alpine`, `latest`, `2.0-slim`
- **Behavior**: Handles Docker image tags with suffixes
- **Pre-releases**: Non-numeric tags like `latest` are typically filtered

### Ruby Versioning

- **Scheme**: `ruby`
- **Example versions**: `1.0.0`, `2.1.3`, `3.0.0.pre.1`
- **Behavior**: Ruby gem versioning with support for pre-releases
- **Pre-releases**: `.pre`, `.alpha`, `.beta` versions are filtered when appropriate

### Composer (PHP)

- **Scheme**: `composer`
- **Example versions**: `1.0.0`, `v2.1.3`, `3.0.0-beta1`
- **Behavior**: PHP Composer versioning, similar to semver with v-prefix support
- **Pre-releases**: Alpha, beta, RC versions are filtered

### Cargo (Rust)

- **Scheme**: `cargo`
- **Example versions**: `1.0.0`, `2.1.3`, `3.0.0-alpha.1`
- **Behavior**: Rust cargo versioning, follows semver closely
- **Pre-releases**: Alpha, beta, RC versions are filtered

## Configuration Examples

### Basic N-1 Version

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["my-package"],
      "constraints": {
        "offset": -1
      }
    }
  ]
}
```

### N-2 Version with Specific Level

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["my-package"],
      "constraints": {
        "offset": -2,
        "offsetLevel": "minor"
      }
    }
  ]
}
```

### Including Pre-releases

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["my-python-package"],
      "versioning": "pep440",
      "constraints": {
        "offset": -1,
        "ignorePrerelease": false
      }
    }
  ]
}
```

## Edge Cases and Behavior

### Empty Version Lists

When no versions are available from the registry:

- Returns the current version
- Logs a debug message indicating no versions were found
- Does not throw an error

### Malformed Versions

When the version list contains invalid entries:

- Invalid versions are filtered out silently
- Only valid versions according to the versioning scheme are considered
- If all versions are invalid, returns the current version

### Version Gaps

When version sequences have gaps (e.g., 1.0.0, 1.0.2, 1.0.5):

- Offset calculations work on the filtered, sorted list
- Gaps do not affect the offset behavior
- Example: With versions [1.0.0, 1.0.2, 1.0.5], offset -1 from 1.0.5 returns 1.0.2

### Offset Out of Bounds

When the requested offset exceeds available versions:

- Returns the current version
- Logs a debug message with details
- Does not throw an error

### Offset Level Constraints

When using `offsetLevel` with limited versions at that level:

- If no other versions exist at the specified level, returns current version
- Example: With only one minor version in a major, `offsetLevel: "minor"` with offset -1 returns current

## Versioning Scheme Specifics

### Major.Minor.Patch Structure

For versioning schemes that support major.minor.patch:

- `offsetLevel: "major"` - Considers only major version changes
- `offsetLevel: "minor"` - Considers minor versions within the same major
- `offsetLevel: "patch"` - Considers patch versions within the same major.minor

### Non-Structured Versions

For versioning schemes without clear major.minor.patch structure:

- `offsetLevel` is ignored
- Global offset is applied to the sorted version list
- Examples: Git commit SHAs, date-based versions

## Performance Considerations

- Version lists are cached for 15 minutes to reduce registry calls
- Large version lists (>100 versions) use optimized sorting
- Retry logic with exponential backoff for transient network failures
- Maximum 3 retry attempts by default, configurable

## Debugging

Enable debug logging to see:

- Which versions were filtered and why
- Offset calculations and results
- Registry fetch attempts and retries
- Cache hits and misses

```bash
LOG_LEVEL=debug renovate
```

## Limitations

1. Offset values must be 0 or negative (positive offsets not supported)
2. Some versioning schemes may not support `offsetLevel` (e.g., git, docker tags)
3. Pre-release filtering depends on the versioning scheme's ability to identify pre-releases
4. Version sorting follows the rules of the specific versioning scheme
