/**
 * tlsCipherPolicy \u2014 Phase 20 OWASP A02 TLS configuration validator (pure).
 *
 * Inspects a negotiated TLS connection summary and decides whether it
 * meets policy. Pair with `tls.TLSSocket#getCipher()` /
 * `getProtocol()` at request-acceptance time to refuse weak handshakes
 * before any application logic runs.
 */
export type TlsConnSummary = {
  protocol: string | null;   // e.g. 'TLSv1.3', 'TLSv1.2'
  cipherName: string | null; // e.g. 'TLS_AES_128_GCM_SHA256'
};

export type TlsPolicy = {
  minProtocol?: 'TLSv1.2' | 'TLSv1.3';   // default TLSv1.2
  disallowedCiphers?: ReadonlyArray<string>;
  requireForwardSecrecy?: boolean;        // default true
};

export type TlsCheck =
  | { ok: true }
  | { ok: false; reason:
      | 'missing_handshake' | 'protocol_too_old' | 'cipher_blocked'
      | 'no_forward_secrecy' };

const PROTO_RANK: Record<string, number> = {
  'TLSv1': 1,
  'TLSv1.1': 2,
  'TLSv1.2': 3,
  'TLSv1.3': 4,
};

const FS_HINTS = ['ECDHE', 'DHE', 'TLS_AES', 'TLS_CHACHA20']; // TLS1.3 suites always-FS

const DEFAULT_DISALLOWED: ReadonlyArray<string> = [
  'NULL', 'RC4', 'DES', '3DES', 'EXPORT', 'MD5', 'IDEA',
];

export function checkTlsPolicy(conn: TlsConnSummary | null | undefined, policy: TlsPolicy = {}): TlsCheck {
  if (!conn || typeof conn.protocol !== 'string' || typeof conn.cipherName !== 'string') {
    return { ok: false, reason: 'missing_handshake' };
  }
  const minProto = policy.minProtocol ?? 'TLSv1.2';
  const min = PROTO_RANK[minProto] ?? 3;
  const got = PROTO_RANK[conn.protocol] ?? 0;
  if (got < min) return { ok: false, reason: 'protocol_too_old' };

  const upper = conn.cipherName.toUpperCase();
  const blocked = [...DEFAULT_DISALLOWED, ...(policy.disallowedCiphers ?? [])];
  if (blocked.some((b) => upper.includes(b.toUpperCase()))) {
    return { ok: false, reason: 'cipher_blocked' };
  }

  if (policy.requireForwardSecrecy !== false) {
    const fs = FS_HINTS.some((h) => upper.includes(h));
    if (!fs) return { ok: false, reason: 'no_forward_secrecy' };
  }
  return { ok: true };
}
