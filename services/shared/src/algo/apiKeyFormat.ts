/**
 * apiKeyFormat \u2014 Phase 20 API-key format validator + parser (pure).
 *
 * Keys follow `<prefix>_<random>_<crc>` where:
 *   - prefix is environment tag from allowed list (e.g. `live`, `test`)
 *   - random is 24+ url-safe base64 chars (A-Z a-z 0-9 - _)
 *   - crc is 6-char djb2-hex checksum of `${prefix}_${random}`
 *
 *   parseApiKey('live_abcDEF012345____________xxx_yyyyyy')
 *     -> { ok: true, prefix: 'live', random: '...' }
 */

export type ApiKeyParseInput = {
  raw: string | null | undefined;
  allowedPrefixes?: ReadonlyArray<string>; // default ['live','test']
  minRandomLength?: number;                // default 24
};

export type ApiKeyParseResult =
  | { ok: true; prefix: string; random: string }
  | {
      ok: false;
      reason:
        | 'missing'
        | 'malformed'
        | 'bad_prefix'
        | 'random_too_short'
        | 'bad_charset'
        | 'bad_checksum';
    };

const RANDOM = /^[A-Za-z0-9_\-]+$/;
const PREFIX = /^[a-z]+$/;
const CRC = /^[a-f0-9]{6}$/;

function djb2Hex6(s: string): string {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  // 6 hex chars
  return h.toString(16).padStart(8, '0').slice(-6);
}

export function formatApiKey(prefix: string, random: string): string {
  const body = `${prefix}_${random}`;
  return `${body}_${djb2Hex6(body)}`;
}

export function parseApiKey(input: ApiKeyParseInput): ApiKeyParseResult {
  const allowed = input.allowedPrefixes ?? ['live', 'test'];
  const minLen = input.minRandomLength ?? 24;
  if (!input.raw || typeof input.raw !== 'string') return { ok: false, reason: 'missing' };
  const raw = input.raw.trim();
  if (!raw) return { ok: false, reason: 'missing' };

  const parts = raw.split('_');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [prefix, random, crc] = parts;

  if (!PREFIX.test(prefix)) return { ok: false, reason: 'malformed' };
  if (!allowed.includes(prefix)) return { ok: false, reason: 'bad_prefix' };
  if (!RANDOM.test(random)) return { ok: false, reason: 'bad_charset' };
  if (random.length < minLen) return { ok: false, reason: 'random_too_short' };
  if (!CRC.test(crc)) return { ok: false, reason: 'malformed' };

  const expected = djb2Hex6(`${prefix}_${random}`);
  if (expected !== crc) return { ok: false, reason: 'bad_checksum' };
  return { ok: true, prefix, random };
}
