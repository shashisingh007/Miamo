/**
 * cohortBucket \u2014 Phase 11 / 18 deterministic analytics-cohort assigner.
 *
 * Maps a uid into one of N named cohorts (default `['control','a','b']`)
 * with a stable, uniform-ish distribution. Used by:
 *   - A/B experiments where we want to read out cohort \u2192 outcome
 *   - dashboards that need to compare two halves of the user base
 *
 * Pure; different `experimentKey` values give independent bucketings.
 */
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export type CohortInputs = {
  uid: string;
  experimentKey: string;
  cohorts?: string[]; // default ['control', 'a', 'b']
};

export type CohortResult = {
  cohort: string;
  index: number;
  bucket: number; // 0..2^32-1
};

export function assignCohort(inp: CohortInputs): CohortResult {
  const cohorts = inp.cohorts && inp.cohorts.length > 0 ? inp.cohorts : ['control', 'a', 'b'];
  if (typeof inp.uid !== 'string' || inp.uid === '' || typeof inp.experimentKey !== 'string' || inp.experimentKey === '') {
    return { cohort: cohorts[0], index: 0, bucket: 0 };
  }
  const bucket = fnv1a32(`${inp.experimentKey}:${inp.uid}`);
  const index = bucket % cohorts.length;
  return { cohort: cohorts[index], index, bucket };
}
