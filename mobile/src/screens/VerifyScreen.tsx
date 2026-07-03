// Miamo Mobile — Verify (identity verification).
// Web parity: services/web/src/app/(main)/verify/page.tsx.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import MediaPicker from '@components/MediaPicker';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

type Kind = 'selfie' | 'id_document' | 'video_liveness';

export default function VerifyScreen() {
  useTrackPageView('verify');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kind, setKind] = useState<Kind>('selfie');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getVerificationStatus()
      .then(res => {
        if (!alive) return;
        setStatus(res?.data ?? null);
        setLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function submit() {
    if (!photoUrl) {
      toast.error('Pick a photo first');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitVerification({ kind, photoUrl });
      toast.success('Submitted — we’ll review shortly');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center} testID="verify-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load" message={error} />;

  return (
    <SafeAreaView style={styles.wrap} testID="verify-screen">
      <Text style={styles.title}>Verify your profile</Text>
      <Text style={styles.meta}>Status: {status?.state ?? 'unverified'}</Text>
      <View style={styles.pills}>
        {(['selfie', 'id_document', 'video_liveness'] as const).map(k => (
          <Pressable
            key={k}
            testID={`verify-kind-${k}`}
            onPress={() => setKind(k)}
            style={[styles.pill, kind === k && styles.pillActive]}>
            <Text style={kind === k ? styles.pillActiveText : styles.pillText}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <MediaPicker onPicked={uri => setPhotoUrl(uri)} />
      {photoUrl ? <Text style={styles.meta}>Selected: {photoUrl}</Text> : null}
      <Pressable
        testID="verify-submit"
        onPress={submit}
        disabled={submitting || !photoUrl}
        style={[styles.btn, (submitting || !photoUrl) && styles.btnDisabled]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit</Text>}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 13, color: '#666' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff' },
  btn: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700' },
});
