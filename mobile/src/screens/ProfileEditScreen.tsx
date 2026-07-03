// Miamo Mobile — Profile edit.
// Web parity: services/web/src/app/(main)/profile/edit/page.tsx.
//
// Section-scoped saves — each block writes its own updateProfile patch so the
// user can bail mid-way without losing progress. Photos, interests and
// prompts have dedicated endpoints; everything else is a single JSON patch.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';
// Ships in parallel PR (mobile primitives batch).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PhotoUpload from '@components/PhotoUpload';
// @ts-ignore
import CityAutocomplete from '@components/CityAutocomplete';
// @ts-ignore
import IconChipMulti from '@components/IconChipMulti';
// @ts-ignore
import IconOptionGrid from '@components/IconOptionGrid';
// @ts-ignore
import NumberStepper from '@components/NumberStepper';

const CANONICAL_PROMPTS = [
  'The way to my heart is…',
  'Two truths and a lie about me…',
  'A perfect Sunday looks like…',
  "I'm looking for someone who…",
  'The last thing that made me laugh…',
  'My love language is…',
];
const INTEREST_OPTIONS = [
  { value: 'reading', label: 'Reading' },
  { value: 'films', label: 'Films' },
  { value: 'travel', label: 'Travel' },
  { value: 'music', label: 'Music' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'writing', label: 'Writing' },
  { value: 'photography', label: 'Photography' },
  { value: 'startups', label: 'Startups' },
  { value: 'art', label: 'Art' },
  { value: 'food', label: 'Food' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'gaming', label: 'Gaming' },
];
const INTENT_OPTIONS = [
  { value: 'serious', label: 'Serious' },
  { value: 'dtm', label: 'DTM' },
  { value: 'casual', label: 'Casual' },
  { value: 'exploring', label: 'Exploring' },
];
const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

// PhotoEntry is re-exported from @components/PhotoUpload so callbacks match
// the component's contract (id is optional there — server may not echo it
// on legacy uploads).
type PhotoEntry = import('@components/PhotoUpload').PhotoEntry;

export default function ProfileEditScreen() {
  useTrackPageView('profile-edit');
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<PhotoEntry | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getMyProfile()
      .then(res => {
        if (!alive) return;
        setProfile(((res as any)?.data ?? {}) as any);
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

  const savePatch = useCallback(
    async (key: string, patch: Record<string, any>) => {
      setSavingKey(key);
      try {
        const res = await api.updateProfile(patch as any);
        const next = (res as any)?.data ?? { ...profile, ...patch };
        setProfile(next);
        toast.success('Saved');
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setSavingKey(null);
      }
    },
    [profile],
  );

  const onPhotoUploaded = useCallback((p: PhotoEntry) => {
    setProfile((cur: any) => ({ ...cur, photos: [...(cur?.photos ?? []), p] }));
  }, []);
  const removePhoto = useCallback(
    async (p: PhotoEntry) => {
      if (!p.id) return;
      try {
        await api.deletePhoto(p.id);
        setProfile((cur: any) => ({
          ...cur,
          photos: (cur?.photos ?? []).filter((x: any) => x.id !== p.id),
        }));
        toast.success('Photo removed');
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setConfirmDeletePhoto(null);
      }
    },
    [],
  );

  async function savePrompts() {
    setSavingKey('prompts');
    try {
      await api.updatePrompts(
        (profile.prompts ?? []).map((p: any, i: number) => ({
          question: p.question,
          answer: p.answer,
          position: i,
        })),
      );
      toast.success('Prompts saved');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingKey(null);
    }
  }
  async function saveInterests() {
    setSavingKey('interests');
    try {
      await api.updateInterests(profile.interests ?? []);
      toast.success('Interests saved');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingKey(null);
    }
  }

  if (loading)
    return (
      <View style={styles.center} testID="profile-edit-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load" message={error} />;

  return (
    <SafeAreaView style={styles.wrap} testID="profile-edit-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Edit profile</Text>

        {/* ─── Photos ────────────────────────────── */}
        <Section title="Photos" saving={savingKey === 'photos'}>
          <View style={styles.photoGrid}>
            {(profile.photos ?? []).map((p: PhotoEntry) => (
              <View key={p.id} style={styles.photoTile}>
                <Image source={{ uri: p.url }} style={styles.photoImg} />
                <Pressable
                  testID={`del-photo-${p.id}`}
                  onPress={() => setConfirmDeletePhoto(p)}
                  style={styles.photoRemove}>
                  <Text style={styles.photoRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <PhotoUpload
            photos={profile.photos ?? []}
            onUploaded={onPhotoUploaded}
            max={6}
          />
        </Section>

        {/* ─── Basics ────────────────────────────── */}
        <Section title="Basics" saving={savingKey === 'basics'}>
          <TextInput
            testID="edit-name"
            value={profile.displayName ?? ''}
            onChangeText={v => setProfile({ ...profile, displayName: v })}
            placeholder="Display name"
            style={styles.input}
          />
          <TextInput
            testID="edit-age"
            value={profile.age ? String(profile.age) : ''}
            onChangeText={v => setProfile({ ...profile, age: Number(v) || undefined })}
            placeholder="Age"
            keyboardType="number-pad"
            style={styles.input}
          />
          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map(g => (
              <Pressable
                key={g.value}
                testID={`edit-gender-${g.value}`}
                onPress={() => setProfile({ ...profile, gender: g.value })}
                style={[styles.pill, profile.gender === g.value && styles.pillActive]}>
                <Text
                  style={
                    profile.gender === g.value ? styles.pillActiveText : styles.pillText
                  }>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <SaveBtn
            testID="save-basics"
            saving={savingKey === 'basics'}
            onPress={() =>
              savePatch('basics', {
                displayName: profile.displayName,
                age: profile.age,
                gender: profile.gender,
              })
            }
          />
        </Section>

        {/* ─── Location ──────────────────────────── */}
        <Section title="Location" saving={savingKey === 'location'}>
          <CityAutocomplete
            value={profile.city ?? ''}
            onChange={(name: string, id?: string) =>
              setProfile({ ...profile, city: name, cityId: id ?? profile.cityId })
            }
          />
          <SaveBtn
            testID="save-location"
            saving={savingKey === 'location'}
            onPress={() =>
              savePatch('location', { city: profile.city, cityId: profile.cityId })
            }
          />
        </Section>

        {/* ─── Physical ──────────────────────────── */}
        <Section title="Height & build" saving={savingKey === 'physical'}>
          <Text style={styles.label}>Height (cm)</Text>
          <NumberStepper
            value={profile.heightCm ?? 170}
            onChange={(v: number) => setProfile({ ...profile, heightCm: v })}
            min={140}
            max={210}
            step={1}
          />
          <TextInput
            testID="edit-build"
            value={profile.build ?? ''}
            onChangeText={v => setProfile({ ...profile, build: v })}
            placeholder="Build (optional)"
            style={styles.input}
          />
          <SaveBtn
            testID="save-physical"
            saving={savingKey === 'physical'}
            onPress={() =>
              savePatch('physical', { heightCm: profile.heightCm, build: profile.build })
            }
          />
        </Section>

        {/* ─── Job & Education ───────────────────── */}
        <Section title="Job & education" saving={savingKey === 'work'}>
          <TextInput
            testID="edit-job"
            value={profile.job ?? ''}
            onChangeText={v => setProfile({ ...profile, job: v })}
            placeholder="Job title"
            style={styles.input}
          />
          <TextInput
            testID="edit-employer"
            value={profile.employer ?? ''}
            onChangeText={v => setProfile({ ...profile, employer: v })}
            placeholder="Employer"
            style={styles.input}
          />
          <TextInput
            testID="edit-edu"
            value={profile.education ?? ''}
            onChangeText={v => setProfile({ ...profile, education: v })}
            placeholder="Education"
            style={styles.input}
          />
          <SaveBtn
            testID="save-work"
            saving={savingKey === 'work'}
            onPress={() =>
              savePatch('work', {
                job: profile.job,
                employer: profile.employer,
                education: profile.education,
              })
            }
          />
        </Section>

        {/* ─── Bio ───────────────────────────────── */}
        <Section title="Bio" saving={savingKey === 'bio'}>
          <TextInput
            testID="edit-bio"
            value={profile.bio ?? ''}
            onChangeText={v => setProfile({ ...profile, bio: v })}
            placeholder="Say a little about yourself"
            multiline
            style={[styles.input, styles.multiline]}
          />
          <SaveBtn
            testID="save-bio"
            saving={savingKey === 'bio'}
            onPress={() => savePatch('bio', { bio: profile.bio })}
          />
        </Section>

        {/* ─── Intent ────────────────────────────── */}
        <Section title="Dating intent" saving={savingKey === 'intent'}>
          <IconOptionGrid
            value={profile.datingIntent}
            options={INTENT_OPTIONS}
            onChange={(v: string) => setProfile({ ...profile, datingIntent: v })}
          />
          <SaveBtn
            testID="save-intent"
            saving={savingKey === 'intent'}
            onPress={() => savePatch('intent', { datingIntent: profile.datingIntent })}
          />
        </Section>

        {/* ─── Prompts ───────────────────────────── */}
        <Section title="Prompts" saving={savingKey === 'prompts'}>
          {(profile.prompts ?? []).map((p: any, i: number) => (
            <View key={i} style={styles.promptCard}>
              <IconOptionGrid
                value={p.question}
                options={CANONICAL_PROMPTS.map(q => ({ value: q, label: q }))}
                onChange={(q: string) => {
                  const next = [...(profile.prompts ?? [])];
                  next[i] = { ...next[i], question: q };
                  setProfile({ ...profile, prompts: next });
                }}
              />
              <TextInput
                value={p.answer ?? ''}
                onChangeText={t => {
                  const next = [...(profile.prompts ?? [])];
                  next[i] = { ...next[i], answer: t };
                  setProfile({ ...profile, prompts: next });
                }}
                multiline
                style={[styles.input, styles.multiline]}
                placeholder="Your answer"
              />
            </View>
          ))}
          <SaveBtn testID="save-prompts" saving={savingKey === 'prompts'} onPress={savePrompts} />
        </Section>

        {/* ─── Interests ─────────────────────────── */}
        <Section title="Interests" saving={savingKey === 'interests'}>
          <IconChipMulti
            options={INTEREST_OPTIONS}
            value={profile.interests ?? []}
            onChange={(v: string[]) => setProfile({ ...profile, interests: v })}
            max={8}
          />
          <SaveBtn
            testID="save-interests"
            saving={savingKey === 'interests'}
            onPress={saveInterests}
          />
        </Section>

        {/* ─── Preferences ───────────────────────── */}
        <Section title="Preferences" saving={savingKey === 'prefs'}>
          <Text style={styles.label}>Age range</Text>
          <View style={styles.row}>
            <NumberStepper
              value={profile.preferredMinAge ?? 22}
              onChange={(v: number) => setProfile({ ...profile, preferredMinAge: v })}
              min={18}
              max={80}
            />
            <NumberStepper
              value={profile.preferredMaxAge ?? 35}
              onChange={(v: number) => setProfile({ ...profile, preferredMaxAge: v })}
              min={18}
              max={80}
            />
          </View>
          <Text style={styles.label}>Distance (km)</Text>
          <NumberStepper
            value={profile.preferredDistanceKm ?? 50}
            onChange={(v: number) => setProfile({ ...profile, preferredDistanceKm: v })}
            min={5}
            max={500}
            step={5}
          />
          <Text style={styles.label}>Preferred gender</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map(g => {
              const selected = (profile.preferredGenders ?? []).includes(g.value);
              return (
                <Pressable
                  key={g.value}
                  onPress={() => {
                    const cur = new Set(profile.preferredGenders ?? []);
                    if (cur.has(g.value)) cur.delete(g.value);
                    else cur.add(g.value);
                    setProfile({ ...profile, preferredGenders: Array.from(cur) });
                  }}
                  style={[styles.pill, selected && styles.pillActive]}>
                  <Text style={selected ? styles.pillActiveText : styles.pillText}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <SaveBtn
            testID="save-prefs"
            saving={savingKey === 'prefs'}
            onPress={() =>
              savePatch('prefs', {
                preferredMinAge: profile.preferredMinAge,
                preferredMaxAge: profile.preferredMaxAge,
                preferredDistanceKm: profile.preferredDistanceKm,
                preferredGenders: profile.preferredGenders,
              })
            }
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog
        visible={!!confirmDeletePhoto}
        title="Delete photo?"
        message="This removes it from your profile immediately."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDeletePhoto(null)}
        onConfirm={() => confirmDeletePhoto && removePhoto(confirmDeletePhoto)}
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  saving,
  children,
}: {
  title: string;
  saving?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {saving ? <ActivityIndicator size="small" /> : null}
      </View>
      {children}
    </View>
  );
}
function SaveBtn({
  onPress,
  saving,
  testID,
}: {
  onPress: () => void;
  saving?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!!saving}
      style={[styles.btn, saving && styles.btnDisabled]}>
      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 16, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800' },
  section: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  label: { fontSize: 13, color: '#555' },
  row: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff', fontWeight: '600' },
  promptCard: { gap: 8, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fff' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoTile: { width: '30%', aspectRatio: 3 / 4, position: 'relative' },
  photoImg: { width: '100%', height: '100%', borderRadius: 10, backgroundColor: '#ddd' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontWeight: '800' },
  btn: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700' },
});
