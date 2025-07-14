/**
 * Custom error types for N-1 versioning feature
 */

/**
 * Base error class for N-1 versioning errors
 */
export class NMinusOneError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NMinusOneError.prototype);
  }
}

/**
 * Error thrown when an invalid offset value is provided
 */
export class InvalidOffsetError extends NMinusOneError {
  offset: number;

  constructor(offset: number, message?: string) {
    const errorMessage =
      message ||
      `Invalid offset value: ${offset}. Offset must be 0 or a negative integer.`;
    super(errorMessage);
    Object.setPrototypeOf(this, InvalidOffsetError.prototype);
    this.offset = offset;
  }
}

/**
 * Error thrown when an invalid offsetLevel value is provided
 */
export class InvalidOffsetLevelError extends NMinusOneError {
  offsetLevel: string;

  constructor(offsetLevel: string, message?: string) {
    const errorMessage =
      message ||
      `Invalid offsetLevel value: "${offsetLevel}". Must be one of: major, minor, patch.`;
    super(errorMessage);
    Object.setPrototypeOf(this, InvalidOffsetLevelError.prototype);
    this.offsetLevel = offsetLevel;
  }
}

/**
 * Error thrown when no versions are available for processing
 */
export class VersionListEmptyError extends NMinusOneError {
  packageName?: string;
  datasource?: string;

  constructor(packageName?: string, datasource?: string, message?: string) {
    const errorMessage =
      message ||
      `No versions available${packageName ? ` for package "${packageName}"` : ''}${datasource ? ` from datasource "${datasource}"` : ''}`;
    super(errorMessage);
    Object.setPrototypeOf(this, VersionListEmptyError.prototype);
    this.packageName = packageName;
    this.datasource = datasource;
  }
}

/**
 * Error thrown when offset exceeds available versions
 */
export class OffsetOutOfBoundsError extends NMinusOneError {
  offset: number;
  availableVersions: number;
  offsetLevel?: string;

  constructor(
    offset: number,
    availableVersions: number,
    offsetLevel?: string,
    message?: string,
  ) {
    const errorMessage =
      message ||
      `Offset ${offset} is out of bounds. Only ${availableVersions} versions available${offsetLevel ? ` at ${offsetLevel} level` : ''}.`;
    super(errorMessage);
    Object.setPrototypeOf(this, OffsetOutOfBoundsError.prototype);
    this.offset = offset;
    this.availableVersions = availableVersions;
    this.offsetLevel = offsetLevel;
  }
}

/**
 * Error thrown when registry data cannot be fetched
 */
export class RegistryFetchError extends NMinusOneError {
  datasource?: string;
  packageName?: string;
  originalError: Error;

  constructor(
    originalError: Error,
    datasource?: string,
    packageName?: string,
    message?: string,
  ) {
    const errorMessage =
      message ||
      `Failed to fetch registry data${packageName ? ` for package "${packageName}"` : ''}${datasource ? ` from datasource "${datasource}"` : ''}: ${originalError.message}`;
    super(errorMessage);
    Object.setPrototypeOf(this, RegistryFetchError.prototype);
    this.datasource = datasource;
    this.packageName = packageName;
    this.originalError = originalError;
  }
}
