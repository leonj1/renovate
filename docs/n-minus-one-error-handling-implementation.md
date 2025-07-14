# N-1 Versioning Error Handling Implementation

## Overview

This document describes the implementation of specific error types for the N-1 versioning feature in Renovate, addressing items #3 and #8 from the PR review checklist.

## Custom Error Types Created

### Base Error Class

- **NMinusOneError**: Base class for all N-1 versioning errors

### Specific Error Classes

1. **InvalidOffsetError**

   - Thrown when offset value is positive (only 0 or negative values allowed)
   - Contains the invalid offset value
   - Example: `Invalid offset value: 1. Offset must be 0 or a negative integer.`

2. **InvalidOffsetLevelError**

   - Thrown when offsetLevel is not one of: major, minor, patch
   - Contains the invalid offsetLevel value
   - Example: `Invalid offsetLevel value: "micro". Must be one of: major, minor, patch.`

3. **VersionListEmptyError**

   - Thrown when no versions are available for processing
   - Contains package name and datasource if available
   - Example: `No versions available for package "express" from datasource "npm"`

4. **OffsetOutOfBoundsError**

   - Thrown when offset exceeds the number of available versions
   - Contains offset, available version count, and optional offsetLevel
   - Example: `Offset -5 is out of bounds. Only 3 versions available at major level.`

5. **RegistryFetchError**
   - Thrown when registry data cannot be fetched
   - Contains original error, datasource, and package name
   - Example: `Failed to fetch registry data for package "react" from datasource "npm": Network error`

## Implementation Details

### Error Type Location

All error types are defined in:

```
/home/jose/src/renovate/lib/types/errors/n-minus-one-errors.ts
```

### Error Handling Strategy

The implementation follows a **graceful degradation** approach:

1. Create specific error instances with detailed context
2. Log the error with appropriate log level (warn for validation, debug for processing)
3. Return `currentValue` to maintain backward compatibility
4. Preserve all context information for debugging

### Updated Code Locations

The main implementation file was updated:

```
/home/jose/src/renovate/lib/modules/versioning/index.ts
```

Changes include:

- Import of custom error types
- Creation of specific errors instead of generic logging
- Enhanced error messages with context
- Structured error logging with all relevant details

## Benefits

1. **Better Debugging**: Specific error types make it easier to identify issues
2. **Structured Error Handling**: Errors contain all relevant context
3. **Backward Compatibility**: Maintains existing behavior while improving internals
4. **Future Extensibility**: Easy to add new error types or change handling strategy

## Example Usage

```typescript
// Input validation
if (config.constraints?.offset !== undefined && config.constraints.offset > 0) {
  const error = new InvalidOffsetError(config.constraints.offset);
  logger.warn(
    { offset: config.constraints.offset, error: error.message },
    'Invalid offset value'
  );
  return currentValue;
}

// Registry fetch error
} catch (error) {
  const registryError = new RegistryFetchError(
    error as Error,
    config.datasource,
    config.packageName
  );
  logger.debug(
    {
      error: registryError.message,
      originalError: error,
      currentValue,
      versioning: config.versioning,
      datasource: config.datasource,
      packageName: config.packageName,
    },
    'Failed to fetch package releases'
  );
  return currentValue;
}
```

## Testing

All existing tests continue to pass, confirming backward compatibility is maintained while improving error handling internally.
