export function boyerMooreMajorityVote<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  let candidate: T = values[0];
  let count = 0;
  for (const v of values) {
    if (count === 0) { candidate = v; count = 1; }
    else if (v === candidate) count += 1;
    else count -= 1;
  }
  let occurrences = 0;
  for (const v of values) if (v === candidate) occurrences += 1;
  return occurrences * 2 > values.length ? candidate : null;
}
