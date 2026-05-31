// E.164 phone normalizer — additive infra. New symbols only.
// Pragmatic implementation focused on default-country fallback and US/UK-style trunk-prefix stripping.

export interface PhoneE164NormalizeOptions {
  defaultCountry?: 'US' | 'GB' | 'CA' | 'IN' | 'AU' | 'DE' | 'FR'; // narrow set with known dial codes
}

const DIAL_CODES: Record<NonNullable<PhoneE164NormalizeOptions['defaultCountry']>, string> = {
  US: '1',
  CA: '1',
  GB: '44',
  IN: '91',
  AU: '61',
  DE: '49',
  FR: '33',
};

// Trunk prefixes that callers commonly type before the national number.
const NATIONAL_TRUNK: Record<string, string> = {
  US: '1',
  CA: '1',
  GB: '0',
  IN: '0',
  AU: '0',
  DE: '0',
  FR: '0',
};

const EXT_PATTERN = /[xX](\d{1,7})\s*$/;

export interface PhoneE164Result {
  e164: string;
  countryCode: string;
  national: string;
  extension: string | null;
}

export function normalizePhoneE164(
  raw: string,
  opts: PhoneE164NormalizeOptions = {}
): PhoneE164Result | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;

  // Strip extension marker first (preserve digits)
  let extension: string | null = null;
  const extMatch = EXT_PATTERN.exec(s);
  if (extMatch) {
    extension = extMatch[1];
    s = s.slice(0, extMatch.index).trim();
  }

  let digits = s.replace(/[\s().\-\u2013\u2014/]/g, '');
  let plus = false;
  if (digits.startsWith('+')) {
    plus = true;
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    plus = true;
    digits = digits.slice(2);
  }
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length < 4 || digits.length > 15) return null;

  let countryCode: string;
  let national: string;
  if (plus) {
    // Determine country dial code (1-3 digits). Prefer 1 (NANP), then known 2-3 digit codes.
    if (digits.startsWith('1')) {
      countryCode = '1';
      national = digits.slice(1);
    } else {
      // Try registered codes (longest first)
      const codes = Object.values(DIAL_CODES);
      codes.sort((a, b) => b.length - a.length);
      const match = codes.find((c) => digits.startsWith(c));
      if (match) {
        countryCode = match;
        national = digits.slice(match.length);
      } else {
        // Fall back: take first 1-3 digits as country code based on E.164 max (we don't know lookup).
        // Use 2-digit prefix as a best effort.
        countryCode = digits.slice(0, 2);
        national = digits.slice(2);
      }
    }
  } else {
    const cc = opts.defaultCountry;
    if (!cc) return null;
    countryCode = DIAL_CODES[cc];
    const trunk = NATIONAL_TRUNK[cc];
    if (trunk && digits.startsWith(trunk) && digits.length > trunk.length) {
      national = digits.slice(trunk.length);
    } else if (digits.startsWith(countryCode) && digits.length > countryCode.length + 4) {
      // already prefixed with country code
      national = digits.slice(countryCode.length);
    } else {
      national = digits;
    }
  }

  if (national.length < 4) return null;
  const full = countryCode + national;
  if (full.length < 7 || full.length > 15) return null;

  return {
    e164: '+' + full,
    countryCode,
    national,
    extension,
  };
}

export function isValidPhoneE164(raw: string, opts: PhoneE164NormalizeOptions = {}): boolean {
  return normalizePhoneE164(raw, opts) !== null;
}
