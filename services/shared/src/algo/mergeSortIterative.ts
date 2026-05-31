export function mergeSortIterative<T>(values: readonly T[], cmp: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0)): T[] {
  const n = values.length;
  if (n < 2) return values.slice();
  let src: T[] = values.slice();
  let dst: T[] = new Array(n);
  for (let width = 1; width < n; width *= 2) {
    for (let i = 0; i < n; i += 2 * width) {
      const left = i;
      const mid = Math.min(i + width, n);
      const right = Math.min(i + 2 * width, n);
      let a = left;
      let b = mid;
      let k = left;
      while (a < mid && b < right) {
        if (cmp(src[a], src[b]) <= 0) {
          dst[k++] = src[a++];
        } else {
          dst[k++] = src[b++];
        }
      }
      while (a < mid) dst[k++] = src[a++];
      while (b < right) dst[k++] = src[b++];
    }
    [src, dst] = [dst, src];
  }
  return src;
}
