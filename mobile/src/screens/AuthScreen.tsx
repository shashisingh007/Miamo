// Miamo Mobile — Auth screen.
// Full auth surface with parity to services/web AuthScreen sub-flows.
// Modes:
//   login             — email + password
//   signup-start      — enter identifier (email or phone) → OTP sent
//   signup-verify     — enter OTP → returns verifiedToken
//   signup-complete   — set password + displayName → tokens
//   otp-start         — OTP login: enter identifier
//   otp-verify        — OTP login: enter OTP → tokens
//   email-otp-verify  — from profile (email verify)
//   phone-otp-verify  — from profile (phone verify)
//   2fa               — TOTP challenge after login
//
// Google / Apple sign-in delegate to <AuthOptions /> which internally calls
// api.loginGoogle / api.loginApple. Auth store handles token persistence.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@lib/api';
import { useAuthStore } from '@stores/authStore';
import { toast } from '@components/Toast';
import OtpInput from '@components/OtpInput';
import PhoneInput from '@components/PhoneInput';
// AuthOptions is being created by a parallel agent. It calls api.loginGoogle /
// api.loginApple internally and reports tokens back through onSuccess.
// The import is intentionally left in place so this file compiles once the
// component lands.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — component ships in parallel PR
import AuthOptions from '@components/AuthOptions';

type Mode =
  | 'login'
  | 'signup-start'
  | 'signup-verify'
  | 'signup-complete'
  | 'otp-start'
  | 'otp-verify'
  | 'email-otp-verify'
  | 'phone-otp-verify'
  | '2fa';

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isPhone(v: string) {
  const digits = v.replace(/[^0-9]/g, '');
  return digits.length >= 10;
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode] = useState('');
  const [identifierKind, setIdentifierKind] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const canLogin = useMemo(
    () => isEmail(identifier) && password.length >= 6,
    [identifier, password],
  );
  const canStartSignup = useMemo(
    () => (identifierKind === 'email' ? isEmail(identifier) : isPhone(identifier)),
    [identifierKind, identifier],
  );
  const canCompleteSignup = useMemo(
    () => password.length >= 8 && displayName.trim().length >= 2,
    [password, displayName],
  );

  const clearAll = useCallback(() => {
    setIdentifier('');
    setPassword('');
    setDisplayName('');
    setSignupToken('');
    setVerifiedToken('');
    setOtpToken('');
    setChallengeToken('');
    setCode('');
    setError(null);
  }, []);

  // ─── login flow ────────────────────────────────────
  async function doLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email: identifier.trim(), password });
      const data = res?.data ?? {};
      if (data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setCode('');
        setMode('2fa');
        toast.info('Enter your 2FA code');
        return;
      }
      if (data.accessToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        toast.success('Welcome back');
      } else {
        setError('Unexpected response — try again.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function do2fa() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login2fa({ challengeToken, code });
      const data = res?.data ?? {};
      if (data.accessToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
      } else {
        setError('Code rejected — try again.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ─── signup flow (3 steps) ─────────────────────────
  async function doSignupStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.signupStart({ identifier: identifier.trim() });
      setSignupToken(res?.data?.signupToken ?? '');
      setCode('');
      setMode('signup-verify');
      toast.info('Verification code sent');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function doSignupVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.signupVerify({ signupToken, code });
      setVerifiedToken(res?.data?.verifiedToken ?? '');
      setMode('signup-complete');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function doSignupComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.signupComplete({
        verifiedToken,
        password,
        displayName: displayName.trim(),
      });
      const data = res?.data ?? {};
      if (data.accessToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ─── OTP-only login ────────────────────────────────
  async function doOtpStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.otpStart(identifier.trim());
      setOtpToken(res?.data?.otpToken ?? '');
      setCode('');
      setMode('otp-verify');
      toast.info('Code sent');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function doOtpVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.otpVerify({ otpToken, code });
      const data = res?.data ?? {};
      if (data.accessToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ─── email/phone verify from profile ───────────────
  async function doEmailVerifySend() {
    setLoading(true);
    setError(null);
    try {
      await api.sendEmailOtp();
      setMode('email-otp-verify');
      toast.info('Check your inbox');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function doEmailVerify() {
    setLoading(true);
    setError(null);
    try {
      await api.verifyEmailOtp(code);
      toast.success('Email verified');
      setMode('login');
      clearAll();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function doPhoneVerifySend() {
    setLoading(true);
    setError(null);
    try {
      await api.sendPhoneOtp(identifier.trim());
      setMode('phone-otp-verify');
      toast.info('Code sent');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function doPhoneVerify() {
    setLoading(true);
    setError(null);
    try {
      await api.verifyPhoneOtp(code);
      toast.success('Phone verified');
      setMode('login');
      clearAll();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const authOptionsProps = {
    onSuccess: (data: any) => {
      if (data?.accessToken) setAuth(data.user, data.accessToken, data.refreshToken);
    },
    onError: (msg: string) => setError(msg),
  } as any;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Miamo</Text>
        <Text style={styles.sub}>Serious dating for India.</Text>

        {mode === 'login' && (
          <>
            <TextInput
              testID="auth-email"
              placeholder="Email"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              testID="auth-password"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-login-submit"
              accessibilityRole="button"
              onPress={doLogin}
              disabled={loading || !canLogin}
              style={[styles.btn, (loading || !canLogin) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Log in</Text>
              )}
            </Pressable>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <AuthOptions {...authOptionsProps} />
            <View style={styles.linkRow}>
              <Pressable
                testID="auth-switch-otp"
                onPress={() => {
                  clearAll();
                  setMode('otp-start');
                }}>
                <Text style={styles.link}>Use OTP</Text>
              </Pressable>
              <Pressable
                testID="auth-switch-signup"
                onPress={() => {
                  clearAll();
                  setMode('signup-start');
                }}>
                <Text style={styles.link}>Create account</Text>
              </Pressable>
            </View>
          </>
        )}

        {mode === 'signup-start' && (
          <>
            <Text style={styles.stepTitle}>Sign up</Text>
            <View style={styles.segment}>
              {(['email', 'phone'] as const).map(k => (
                <Pressable
                  key={k}
                  testID={`auth-signup-kind-${k}`}
                  onPress={() => {
                    setIdentifierKind(k);
                    setIdentifier('');
                  }}
                  style={[styles.segmentBtn, identifierKind === k && styles.segmentBtnActive]}>
                  <Text style={identifierKind === k ? styles.segmentTextActive : styles.segmentText}>
                    {k === 'email' ? 'Email' : 'Phone'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {identifierKind === 'email' ? (
              <TextInput
                testID="auth-signup-email"
                placeholder="Email"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            ) : (
              <PhoneInput value={identifier} onChange={setIdentifier} />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-signup-start"
              accessibilityRole="button"
              onPress={doSignupStart}
              disabled={loading || !canStartSignup}
              style={[styles.btn, (loading || !canStartSignup) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Send code</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.linkBtn}>
              <Text style={styles.link}>Back to log in</Text>
            </Pressable>
          </>
        )}

        {mode === 'signup-verify' && (
          <>
            <Text style={styles.stepTitle}>Enter the code</Text>
            <Text style={styles.sub}>Sent to {identifier}</Text>
            <OtpInput value={code} onChange={setCode} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-signup-verify"
              accessibilityRole="button"
              onPress={doSignupVerify}
              disabled={loading || code.length < 6}
              style={[styles.btn, (loading || code.length < 6) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify</Text>
              )}
            </Pressable>
            <Pressable onPress={doSignupStart} style={styles.linkBtn}>
              <Text style={styles.link}>Resend code</Text>
            </Pressable>
          </>
        )}

        {mode === 'signup-complete' && (
          <>
            <Text style={styles.stepTitle}>One last step</Text>
            <TextInput
              testID="auth-signup-name"
              placeholder="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
            />
            <TextInput
              testID="auth-signup-password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-signup-complete"
              accessibilityRole="button"
              onPress={doSignupComplete}
              disabled={loading || !canCompleteSignup}
              style={[styles.btn, (loading || !canCompleteSignup) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Finish signup</Text>
              )}
            </Pressable>
          </>
        )}

        {mode === 'otp-start' && (
          <>
            <Text style={styles.stepTitle}>Log in with OTP</Text>
            <TextInput
              testID="auth-otp-identifier"
              placeholder="Email or phone"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-otp-start"
              accessibilityRole="button"
              onPress={doOtpStart}
              disabled={loading || !identifier}
              style={[styles.btn, (loading || !identifier) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Send code</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.linkBtn}>
              <Text style={styles.link}>Use password instead</Text>
            </Pressable>
          </>
        )}

        {mode === 'otp-verify' && (
          <>
            <Text style={styles.stepTitle}>Enter the code</Text>
            <Text style={styles.sub}>Sent to {identifier}</Text>
            <OtpInput value={code} onChange={setCode} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-otp-verify"
              accessibilityRole="button"
              onPress={doOtpVerify}
              disabled={loading || code.length < 6}
              style={[styles.btn, (loading || code.length < 6) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify</Text>
              )}
            </Pressable>
            <Pressable onPress={doOtpStart} style={styles.linkBtn}>
              <Text style={styles.link}>Resend code</Text>
            </Pressable>
          </>
        )}

        {mode === '2fa' && (
          <>
            <Text style={styles.stepTitle}>Two-factor code</Text>
            <Text style={styles.sub}>Enter the 6-digit code from your authenticator app.</Text>
            <OtpInput value={code} onChange={setCode} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-2fa-verify"
              accessibilityRole="button"
              onPress={do2fa}
              disabled={loading || code.length < 6}
              style={[styles.btn, (loading || code.length < 6) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.linkBtn}>
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          </>
        )}

        {mode === 'email-otp-verify' && (
          <>
            <Text style={styles.stepTitle}>Verify email</Text>
            <OtpInput value={code} onChange={setCode} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-email-verify"
              accessibilityRole="button"
              onPress={doEmailVerify}
              disabled={loading || code.length < 6}
              style={[styles.btn, (loading || code.length < 6) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify email</Text>
              )}
            </Pressable>
            <Pressable onPress={doEmailVerifySend} style={styles.linkBtn}>
              <Text style={styles.link}>Resend email</Text>
            </Pressable>
          </>
        )}

        {mode === 'phone-otp-verify' && (
          <>
            <Text style={styles.stepTitle}>Verify phone</Text>
            <OtpInput value={code} onChange={setCode} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="auth-phone-verify"
              accessibilityRole="button"
              onPress={doPhoneVerify}
              disabled={loading || code.length < 6}
              style={[styles.btn, (loading || code.length < 6) && styles.btnDisabled]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify phone</Text>
              )}
            </Pressable>
            <Pressable onPress={doPhoneVerifySend} style={styles.linkBtn}>
              <Text style={styles.link}>Resend code</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 24, gap: 12, flexGrow: 1, justifyContent: 'center' },
  header: { fontSize: 40, fontWeight: '800', color: '#111', textAlign: 'center' },
  sub: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 8 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  btn: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  link: { color: '#111', fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 8 },
  errorText: { color: '#c92222', fontSize: 13, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { color: '#888', fontSize: 12 },
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, overflow: 'hidden' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#111' },
  segmentText: { color: '#111', fontWeight: '600' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
});
