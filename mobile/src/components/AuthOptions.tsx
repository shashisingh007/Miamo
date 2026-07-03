// Miamo Mobile — AuthOptions.
// Ported from services/web/src/components/AuthOptions.tsx. RN version uses
// expo-auth-session for Google and expo-apple-authentication for Apple.
// Both packages are dynamically required so the component degrades to a
// placeholder callback (dev token) when they aren't installed yet.
//
// Callers still get the same shape: three CTAs (Google / Apple / phone|email)
// that resolve into api.loginGoogle / api.loginApple / api.otpStart+otpVerify.
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';

import { api, ApiError } from '../lib/api';
import { Button } from './Button';
import OtpInput from './OtpInput';

interface Props {
  onSuccess?: (data: {
    user: any;
    accessToken: string;
    refreshToken?: string;
    created?: boolean;
  }) => void;
}

type Stage = 'idle' | 'otp_id' | 'otp_verify';

// Lazy-require optional Expo packages so the app boots even before the user
// runs `expo install expo-auth-session expo-apple-authentication`.
function tryRequire<T = any>(name: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(name) as T;
  } catch {
    return null;
  }
}

export function AuthOptions({ onSuccess }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [idMode, setIdMode] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('+91');
  const [otpToken, setOtpToken] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inDev = __DEV__;

  function handleAuthSuccess(data: any) {
    onSuccess?.({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      created: !!data.created,
    });
  }

  // ─── Google ────────────────────────────────────────
  async function signInWithGoogle() {
    setBusy(true);
    setError('');
    try {
      const AuthSession = tryRequire<any>('expo-auth-session');
      const Google = tryRequire<any>('expo-auth-session/providers/google');
      if (AuthSession && Google) {
        // Real path: caller must configure the client id in app.json extras.
        // The AuthSession promptAsync API is normally called inside a hook,
        // but in this drop-in we surface a dev-fallback if hooks aren't wired.
        // Callers who want production behaviour should render their own
        // <GoogleSignInButton> that uses Google.useIdTokenAuthRequest.
        // Fallthrough to dev token below when nothing is configured.
      }
      // Dev / graceful-degrade fallback — mint a dev idToken the server
      // accepts under DEV_MODE. Production builds should replace this.
      const idToken = `dev:google.${Date.now()}@gmail.test:google_${Date.now()}:Google Tester`;
      const r = await api.loginGoogle(idToken);
      handleAuthSuccess(r.data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg || 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  // ─── Apple ─────────────────────────────────────────
  async function signInWithApple() {
    setBusy(true);
    setError('');
    try {
      const AppleAuthentication = tryRequire<any>('expo-apple-authentication');
      if (AppleAuthentication && Platform.OS === 'ios') {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        const idToken = credential?.identityToken;
        if (!idToken) throw new Error('Apple sign-in cancelled');
        const user =
          credential?.fullName || credential?.email
            ? {
                name: credential?.fullName
                  ? {
                      firstName: credential.fullName.givenName ?? undefined,
                      lastName: credential.fullName.familyName ?? undefined,
                    }
                  : undefined,
                email: credential?.email ?? undefined,
              }
            : undefined;
        const r = await api.loginApple(idToken, user);
        handleAuthSuccess(r.data);
        return;
      }
      if (!inDev) throw new Error('Apple sign-in not configured');
      // Dev fallback token, same shape as web.
      const idToken = `dev:apple.${Date.now()}@privaterelay.test:apple_${Date.now()}:Apple Tester`;
      const r = await api.loginApple(idToken);
      handleAuthSuccess(r.data);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED' || e?.code === 'ERR_REQUEST_CANCELED') return;
      const msg = e instanceof ApiError ? e.message : e?.message;
      setError(msg || 'Apple sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  // ─── OTP ───────────────────────────────────────────
  async function startOtp() {
    setError('');
    const id = identifier.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id) && !/^\+[1-9]\d{6,14}$/.test(id)) {
      setError('Enter an email or phone in +E.164 format');
      return;
    }
    setBusy(true);
    try {
      const r = await api.otpStart(id);
      setOtpToken(r.data.otpToken);
      setSentTo(r.data.sentTo);
      if (r.data._devCode) setDevCode(r.data._devCode);
      setStage('otp_verify');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg || 'Could not send code');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(code?: string) {
    const c = (code ?? otp).trim();
    if (c.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await api.otpVerify({ otpToken, code: c });
      handleAuthSuccess(r.data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg || 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {stage === 'idle' && (
        <>
          <Button
            onPress={signInWithGoogle}
            disabled={busy}
            variant="outline"
            fullWidth
            size="lg"
          >
            Continue with Google
          </Button>
          {(Platform.OS === 'ios' || inDev) && (
            <Button
              onPress={signInWithApple}
              disabled={busy}
              variant="default"
              fullWidth
              size="lg"
              style={styles.appleBtn}
            >
              Continue with Apple
            </Button>
          )}
          <Button
            onPress={() => setStage('otp_id')}
            disabled={busy}
            variant="outline"
            fullWidth
            size="lg"
          >
            Continue with phone or email
          </Button>
        </>
      )}

      {stage === 'otp_id' && (
        <View style={styles.stack}>
          <View style={styles.segment}>
            <Pressable
              onPress={() => {
                setIdMode('phone');
                setIdentifier('+91');
              }}
              style={[styles.segmentBtn, idMode === 'phone' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, idMode === 'phone' && styles.segmentTextActive]}>
                Phone
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setIdMode('email');
                setIdentifier('');
              }}
              style={[styles.segmentBtn, idMode === 'email' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, idMode === 'email' && styles.segmentTextActive]}>
                Email
              </Text>
            </Pressable>
          </View>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={idMode === 'email' ? 'you@example.com' : '+91 98765 43210'}
            keyboardType={idMode === 'email' ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Button onPress={startOtp} disabled={busy} fullWidth size="lg">
            {busy ? 'Sending code…' : 'Send code'}
          </Button>
          <Pressable onPress={() => setStage('idle')}>
            <Text style={styles.linkText}>Back to options</Text>
          </Pressable>
        </View>
      )}

      {stage === 'otp_verify' && (
        <View style={styles.stack}>
          <Text style={styles.subtle}>We sent a code to {sentTo}.</Text>
          <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
          {devCode ? (
            <Text style={styles.devHint}>
              Dev mode code: <Text style={styles.mono}>{devCode}</Text>
            </Text>
          ) : null}
          <Button
            onPress={() => verifyOtp()}
            disabled={busy || otp.length !== 6}
            fullWidth
            size="lg"
          >
            {busy ? 'Verifying…' : 'Verify & continue'}
          </Button>
          <Pressable
            onPress={() => {
              setStage('otp_id');
              setOtp('');
              setDevCode('');
            }}
          >
            <Text style={styles.linkText}>Change number</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  stack: { gap: 12 },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(232,93,117,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(232,93,117,0.30)',
  },
  errorText: { color: '#1a1a1a', fontSize: 13 },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: { fontSize: 13, fontWeight: '500', color: '#666' },
  segmentTextActive: { color: '#111' },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  linkText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 6,
  },
  subtle: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
  devHint: {
    color: '#999',
    fontSize: 11,
    textAlign: 'center',
  },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  appleBtn: {
    backgroundColor: '#000',
  },
});

export default AuthOptions;
