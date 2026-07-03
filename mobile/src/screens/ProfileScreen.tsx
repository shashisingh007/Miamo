// Miamo Mobile — Profile (own).
// Web parity: services/web/src/app/(main)/profile/page.tsx.
// Displays photos, basics, prompts, interests, activity stats + verification
// badge. Buttons: Edit, View as (previews how others see it), Trust Score
// (deep-link into settings sub-screen).
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import TrustScoreCard from '@components/TrustScoreCard';
import { useAuth } from '@hooks/useAuth';
import { useTrackPageView } from '@hooks/useTrackActivity';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const { width: SCREEN_W } = Dimensions.get('window');

interface Profile {
  id?: string;
  displayName?: string;
  age?: number;
  gender?: string;
  city?: string;
  bio?: string;
  photos?: { id: string; url: string }[];
  prompts?: { question: string; answer: string }[];
  interests?: string[];
  datingIntent?: string;
  heightCm?: number;
  job?: string;
  education?: string;
  verified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  stats?: {
    matches?: number;
    conversations?: number;
    profileViews?: number;
    completion?: number;
  };
}

export default function ProfileScreen() {
  useTrackPageView('profile');
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewAs, setViewAs] = useState(false);
  const [completion, setCompletion] = useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, v] = await Promise.all([
        api.getMyProfile(),
        api.getCompletion().catch(() => null),
        api.getVerificationStatus().catch(() => null),
      ]);
      setProfile(((p as any)?.data ?? null) as Profile | null);
      setCompletion(((c as any)?.data?.score ?? null) as number | null);
      setVerifyStatus(((v as any)?.data?.status ?? null) as string | null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <View style={styles.center} testID="profile-loading">
        <ActivityIndicator />
      </View>
    );
  if (error)
    return <EmptyState title="Couldn't load profile" message={error} actionLabel="Retry" onAction={load} />;

  const p = profile ?? {};
  const photos = p.photos ?? [];
  const prompts = p.prompts ?? [];
  const interests = p.interests ?? [];

  return (
    <SafeAreaView style={styles.wrap} testID="profile-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.name}>{user?.displayName ?? p.displayName ?? 'You'}</Text>
            <Text style={styles.meta}>
              {p.age ? `${p.age}` : ''}
              {p.age && p.city ? ' · ' : ''}
              {p.city ?? ''}
            </Text>
            {p.verified || verifyStatus === 'approved' ? (
              <View style={styles.verifiedRow}>
                <Text style={styles.verifiedBadge}>✓ Verified</Text>
              </View>
            ) : verifyStatus === 'pending' ? (
              <Text style={styles.pending}>Verification pending</Text>
            ) : (
              <Pressable
                onPress={() => navigation.navigate('Verify')}
                testID="profile-verify-cta">
                <Text style={styles.verifyCta}>Get verified →</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            testID="profile-view-as"
            onPress={() => setViewAs(v => !v)}
            style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>{viewAs ? 'Editing' : 'View as'}</Text>
          </Pressable>
        </View>

        {/* Photos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {photos.length === 0 ? (
            <Pressable
              onPress={() => navigation.navigate('ProfileEdit')}
              style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>Add photos</Text>
            </Pressable>
          ) : (
            photos.map(ph => (
              <Image key={ph.id} source={{ uri: ph.url }} style={styles.photo} />
            ))
          )}
        </ScrollView>

        {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}

        {/* Stats + completion */}
        <View style={styles.statsRow}>
          <StatCell label="Matches" value={String(p.stats?.matches ?? 0)} />
          <StatCell label="Chats" value={String(p.stats?.conversations ?? 0)} />
          <StatCell label="Views" value={String(p.stats?.profileViews ?? 0)} />
          <StatCell label="Complete" value={completion !== null ? `${completion}%` : '—'} />
        </View>

        {/* Trust score */}
        <Pressable
          testID="profile-open-trust"
          onPress={() => navigation.navigate('SettingsTrust' as any)}>
          <TrustScoreCard />
        </Pressable>

        {/* Prompts */}
        {prompts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            {prompts.map((pr, i) => (
              <View key={i} style={styles.promptCard}>
                <Text style={styles.promptQ}>{pr.question}</Text>
                <Text style={styles.promptA}>{pr.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chipRow}>
              {interests.map(i => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{i}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Basics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basics</Text>
          <BasicRow label="Intent" value={p.datingIntent ?? '—'} />
          <BasicRow label="Height" value={p.heightCm ? `${p.heightCm} cm` : '—'} />
          <BasicRow label="Work" value={p.job ?? '—'} />
          <BasicRow label="Education" value={p.education ?? '—'} />
          <BasicRow label="Gender" value={p.gender ?? '—'} />
        </View>

        <Pressable
          testID="profile-edit"
          onPress={() => navigation.navigate('ProfileEdit')}
          style={styles.btn}>
          <Text style={styles.btnText}>Edit profile</Text>
        </Pressable>
        <Pressable
          testID="profile-settings"
          onPress={() => navigation.navigate('Settings')}
          style={styles.linkBtn}>
          <Text style={styles.link}>Settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function BasicRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.basicRow}>
      <Text style={styles.basicLabel}>{label}</Text>
      <Text style={styles.basicValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  name: { fontSize: 26, fontWeight: '800' },
  meta: { fontSize: 14, color: '#666', marginTop: 2 },
  verifiedRow: { flexDirection: 'row', marginTop: 6 },
  verifiedBadge: {
    color: '#1a8a34',
    fontWeight: '700',
    backgroundColor: '#e6f5eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  pending: { color: '#d19a17', fontSize: 12, marginTop: 6 },
  verifyCta: { color: '#111', fontWeight: '600', marginTop: 6 },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
  },
  smallBtnText: { color: '#111', fontWeight: '600', fontSize: 12 },
  photoRow: { flexDirection: 'row', paddingVertical: 4 },
  photo: {
    width: SCREEN_W * 0.7,
    height: SCREEN_W * 0.9,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { color: '#888', fontWeight: '600' },
  bio: { fontSize: 15, color: '#333', lineHeight: 22 },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    justifyContent: 'space-around',
  },
  statCell: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  promptCard: { padding: 12, borderRadius: 10, backgroundColor: '#f7f7f7' },
  promptQ: { fontSize: 12, color: '#666' },
  promptA: { fontSize: 15, color: '#111', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipText: { color: '#111' },
  basicRow: { flexDirection: 'row', paddingVertical: 8, justifyContent: 'space-between' },
  basicLabel: { color: '#666' },
  basicValue: { color: '#111', fontWeight: '600' },
  btn: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  link: { color: '#111', fontWeight: '600' },
});
