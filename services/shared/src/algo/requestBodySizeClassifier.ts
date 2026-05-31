export type RequestBodySizeClassification = {
  readonly bytes: number;
  readonly band: 'empty' | 'small' | 'medium' | 'large' | 'oversize';
  readonly accepted: boolean;
  readonly reason?: 'oversize' | 'invalid';
};

export type RequestBodySizeOptions = {
  readonly smallMaxBytes?: number;
  readonly mediumMaxBytes?: number;
  readonly largeMaxBytes?: number;
  readonly hardMaxBytes: number;
};

function clean(n: number): number | null {
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function classifyRequestBodySize(
  contentLength: unknown,
  opts: RequestBodySizeOptions,
): RequestBodySizeClassification {
  let bytes: number;
  if (typeof contentLength === 'number') {
    const c = clean(contentLength);
    if (c === null) return { bytes: 0, band: 'empty', accepted: false, reason: 'invalid' };
    bytes = c;
  } else if (typeof contentLength === 'string') {
    const n = Number.parseInt(contentLength, 10);
    if (!Number.isFinite(n) || n < 0) {
      return { bytes: 0, band: 'empty', accepted: false, reason: 'invalid' };
    }
    bytes = n;
  } else if (contentLength === null || contentLength === undefined) {
    bytes = 0;
  } else {
    return { bytes: 0, band: 'empty', accepted: false, reason: 'invalid' };
  }

  const hardMax = Math.max(1, clean(opts.hardMaxBytes) ?? 1);
  const small = Math.max(0, clean(opts.smallMaxBytes ?? 1024) ?? 1024);
  const medium = Math.max(small, clean(opts.mediumMaxBytes ?? 64 * 1024) ?? 64 * 1024);
  const large = Math.max(medium, clean(opts.largeMaxBytes ?? 1024 * 1024) ?? 1024 * 1024);

  if (bytes > hardMax) {
    return { bytes, band: 'oversize', accepted: false, reason: 'oversize' };
  }
  let band: RequestBodySizeClassification['band'];
  if (bytes === 0) band = 'empty';
  else if (bytes <= small) band = 'small';
  else if (bytes <= medium) band = 'medium';
  else if (bytes <= large) band = 'large';
  else band = 'oversize';
  return { bytes, band, accepted: band !== 'oversize' };
}
