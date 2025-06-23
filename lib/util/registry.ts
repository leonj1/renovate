import type { ReleaseResult } from '../modules/datasource/types';

export const registry = {
  getPkgReleases(): Promise<ReleaseResult> {
    return Promise.resolve({
      releases: [],
      sourceUrl: '',
      homepage: '',
      registryUrl: '',
    });
  },
};
