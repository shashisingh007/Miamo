import { describe, it, expect } from 'vitest';
import { checkTlsPolicy } from '../tlsCipherPolicy';

describe('tlsCipherPolicy', () => {
  it('accepts TLS1.3 AES-GCM', () => {
    expect(checkTlsPolicy({ protocol: 'TLSv1.3', cipherName: 'TLS_AES_128_GCM_SHA256' })).toEqual({ ok: true });
  });

  it('accepts TLS1.2 ECDHE', () => {
    expect(checkTlsPolicy({ protocol: 'TLSv1.2', cipherName: 'ECDHE-RSA-AES128-GCM-SHA256' })).toEqual({ ok: true });
  });

  it('rejects TLS1.0 by default', () => {
    expect((checkTlsPolicy({ protocol: 'TLSv1', cipherName: 'ECDHE-RSA-AES128-GCM-SHA256' }) as any).reason)
      .toBe('protocol_too_old');
  });

  it('enforces minProtocol=TLSv1.3 when configured', () => {
    const r = checkTlsPolicy(
      { protocol: 'TLSv1.2', cipherName: 'ECDHE-RSA-AES128-GCM-SHA256' },
      { minProtocol: 'TLSv1.3' },
    );
    expect((r as any).reason).toBe('protocol_too_old');
  });

  it('blocks RC4 / NULL / DES suites', () => {
    expect((checkTlsPolicy({ protocol: 'TLSv1.2', cipherName: 'RC4-MD5' }) as any).reason).toBe('cipher_blocked');
    expect((checkTlsPolicy({ protocol: 'TLSv1.2', cipherName: 'NULL-SHA' }) as any).reason).toBe('cipher_blocked');
    expect((checkTlsPolicy({ protocol: 'TLSv1.2', cipherName: 'DES-CBC-SHA' }) as any).reason).toBe('cipher_blocked');
  });

  it('rejects non-forward-secret RSA suites by default', () => {
    expect((checkTlsPolicy({ protocol: 'TLSv1.2', cipherName: 'AES128-GCM-SHA256' }) as any).reason)
      .toBe('no_forward_secrecy');
  });

  it('forward secrecy gate can be disabled', () => {
    const r = checkTlsPolicy(
      { protocol: 'TLSv1.2', cipherName: 'AES128-GCM-SHA256' },
      { requireForwardSecrecy: false },
    );
    expect(r.ok).toBe(true);
  });

  it('missing_handshake when input invalid', () => {
    expect((checkTlsPolicy(null) as any).reason).toBe('missing_handshake');
    expect((checkTlsPolicy({ protocol: null, cipherName: 'x' } as any) as any).reason).toBe('missing_handshake');
  });

  it('custom disallowedCiphers blocks additional suites', () => {
    const r = checkTlsPolicy(
      { protocol: 'TLSv1.3', cipherName: 'TLS_CHACHA20_POLY1305_SHA256' },
      { disallowedCiphers: ['CHACHA20'] },
    );
    expect((r as any).reason).toBe('cipher_blocked');
  });

  it('unknown protocol string treated as too-old', () => {
    expect((checkTlsPolicy({ protocol: 'SSLv3', cipherName: 'ECDHE-RSA' }) as any).reason).toBe('protocol_too_old');
  });
});
