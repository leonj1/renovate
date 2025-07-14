#!/usr/bin/env node

/**
 * Script to run N-1 versioning performance profiling
 * Usage: npm run profile:n-minus-one
 */

import { profileNMinusOnePerformance } from '../lib/modules/versioning/performance-profile';

async function main() {
  try {
    console.log('Starting N-1 Versioning Performance Profiling...\n');
    await profileNMinusOnePerformance();
    console.log('\nProfiling completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during profiling:', error);
    process.exit(1);
  }
}

main();
