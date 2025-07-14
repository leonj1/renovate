# N-1 Versioning Migration Guide

This guide helps you migrate to using Renovate's N-1 versioning feature, which allows you to stay one or more versions behind the latest release.

## Overview

N-1 versioning is useful when you want to:

- Avoid immediately adopting the newest versions
- Let other users test new releases before you upgrade
- Maintain a more conservative update strategy
- Reduce the risk of encountering bugs in newly released versions

## Basic Configuration

### Simple N-1 Versioning

To stay one version behind the latest:

```json
{
  "constraints": {
    "offset": -1
  }
}
```

### Semantic Version Level Control

To apply N-1 versioning at specific semantic version levels:

```json
{
  "constraints": {
    "offset": -1,
    "offsetLevel": "minor"
  }
}
```

## Migration Examples

### From Manual Version Pinning

**Before:**

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["react"],
      "allowedVersions": "<18.2.0"
    }
  ]
}
```

**After:**

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["react"],
      "constraints": {
        "offset": -1,
        "offsetLevel": "minor"
      }
    }
  ]
}
```

### From Fixed Version Ranges

**Before:**

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["webpack"],
      "allowedVersions": ">=5.0.0 <5.75.0"
    }
  ]
}
```

**After:**

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["webpack"],
      "constraints": {
        "offset": -2,
        "offsetLevel": "major"
      }
    }
  ]
}
```

## Advanced Configurations

### Different Strategies for Different Packages

```json
{
  "packageRules": [
    {
      "description": "Conservative updates for production dependencies",
      "matchDepTypes": ["dependencies"],
      "constraints": {
        "offset": -1
      }
    },
    {
      "description": "Stay on previous major for frameworks",
      "matchPackagePatterns": ["^@angular/", "^react$", "^vue$"],
      "constraints": {
        "offset": -1,
        "offsetLevel": "major"
      }
    },
    {
      "description": "More aggressive for dev dependencies",
      "matchDepTypes": ["devDependencies"],
      "constraints": {
        "offset": 0
      }
    }
  ]
}
```

### Including Pre-releases

By default, pre-release versions are ignored. To include them:

```json
{
  "constraints": {
    "offset": -1,
    "ignorePrerelease": false
  }
}
```

## Common Use Cases

### 1. Enterprise Applications

For mission-critical applications where stability is paramount:

```json
{
  "extends": ["config:base"],
  "constraints": {
    "offset": -2,
    "offsetLevel": "minor"
  }
}
```

### 2. Gradual Adoption

Start conservative and gradually move to latest:

```json
{
  "packageRules": [
    {
      "description": "Well-tested packages can use latest",
      "matchPackageNames": ["lodash", "date-fns"],
      "constraints": {
        "offset": 0
      }
    },
    {
      "description": "Everything else stays one version behind",
      "matchPackagePatterns": ["*"],
      "constraints": {
        "offset": -1
      }
    }
  ]
}
```

### 3. Framework-Specific Strategy

Different strategies for different types of packages:

```json
{
  "packageRules": [
    {
      "description": "Node.js stays on LTS",
      "matchPackageNames": ["node"],
      "constraints": {
        "offset": -1,
        "offsetLevel": "major"
      }
    },
    {
      "description": "React ecosystem coordinated updates",
      "matchPackagePatterns": ["^react", "^@types/react"],
      "constraints": {
        "offset": -1,
        "offsetLevel": "minor"
      }
    }
  ]
}
```

## Troubleshooting

### No Updates Found

If Renovate isn't finding updates with your N-1 configuration:

1. Check if there are enough versions available
2. Verify your offset isn't too large
3. Ensure pre-releases aren't affecting the count

### Unexpected Version Selection

If the selected version isn't what you expected:

1. Check the `offsetLevel` - it constrains version selection within semantic levels
2. Verify `ignorePrerelease` setting
3. Review the available versions in your package registry

## Best Practices

1. **Start Conservative**: Begin with `-1` offset and adjust based on your comfort level
2. **Monitor Updates**: Keep track of what versions you're skipping
3. **Regular Reviews**: Periodically review if your offset strategy is still appropriate
4. **Different Rules**: Use different strategies for different types of dependencies
5. **Document Your Strategy**: Add comments explaining why you chose specific offsets

## Limitations

- Only works with datasources that provide version information
- Requires valid semantic versioning for `offsetLevel` to work properly
- Pre-release handling depends on the versioning scheme used

## FAQ

**Q: What happens if my offset is larger than available versions?**
A: Renovate will keep your current version and not propose any updates.

**Q: Can I use positive offsets?**
A: No, only negative offsets (staying behind) and zero (latest) are supported.

**Q: How does this work with version ranges?**
A: The offset applies to the target version selection, and Renovate will update your range accordingly based on your `rangeStrategy`.

**Q: Does this work with all package managers?**
A: Yes, as long as the datasource provides version information and the versioning scheme is supported.
