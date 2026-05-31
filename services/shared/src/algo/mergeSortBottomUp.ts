export type Compare<T> = (a: T, b: T) => number;

function defaultCompare<T>(a: T, b: T): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function mergeSortBottomUp<T>(values: T[], compare?: Compare<T>): T[] {
  const cmp = compare ?? defaultCompare;
  const n = values.length;
  let src = values.slice();
  let dst: T[] = new Array(n);
  for (let width = 1; width < n; width *= 2) {
    for (let i = 0; i < n; i += 2 * width) {
      const mid = Math.min(i + width, n);
      const end = Math.min(i + 2 * width, n);
      let p = i;
      let q = mid;
      let k = i;
      while (p < mid && q < end) {
        if (cmp(src[p], src[q]) <= 0) dst[k++] = src[p++];
        else dst[k++] = src[q++];
      }
      while (p < mid) dst[k++] = src[p++];
      while (q < end) dst[k++] = src[q++];
    }
    [src, dst] = [dst, src];
  }
  return src;
}
