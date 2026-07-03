// Miamo Mobile — Onboarding.
// 11-step wizard mirroring services/web/src/app/(main)/onboarding/page.tsx.
//
// Steps:
//   1. Welcome
//   2. Basics (name, age, gender)
//   3. Location (CityAutocomplete + reverse-lookup fallback)
//   4. Photos (PhotoUpload — up to 6)
//   5. Prompts (3 canonical prompts)
//   6. Interests (IconChipMulti, max 8)
//   7. Dating intent (IconOptionGrid)
//   8. Height/job/education
//   9. DTM opt-in (yes → navigate to Dtm sub-onboarding)
//  10. Verification (selfie)
//  11. Done
//
// Every step's Next button saves the delta so drop-offs don't lose data. A
// progress bar renders at the top. State that hasn't been saved yet is kept
// in local component state; once saved we also mirror onto the auth-store
// user object.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { api } from '@lib/api';
import { useAuthStore } from '@stores/authStore';
import { toast } from '@components/Toast';
import type { RootStackParamList } from '@/navigation/AppNavigator';
// The following components ship in a parallel PR (mobile primitives batch).
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
// @ts-ignore
import Button from '@components/Button';

const STEPS = [
  'welcome',
  'basics',
  'location',
  'photos',
  'prompts',
  'interests',
  'intent',
  'stats',
  'dtm',
  'verify',
  'done',
] as const;
type Step = (typeof STEPS)[number];

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
  { value: 'serious', label: 'Serious', description: 'Long-term relationship' },
  { value: 'dtm', label: 'DTM', description: 'Marriage-track (families involved)' },
  { value: 'casual', label: 'Casual', description: 'Dating, no rush' },
  { value: 'exploring', label: 'Exploring', description: 'Not sure yet' },
];

const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

interface PromptEntry {
  question: string;
  answer: string;
}
interface PhotoEntry {
  id?: string;
  url: string;
}

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { updateUser } = useAuthStore();

  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<number | null>(null);

  // Persistent form state (mirrors updateProfile shape)
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [cityId, setCityId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([
    { question: CANONICAL_PROMPTS[0], answer: '' },
    { question: CANONICAL_PROMPTS[1], answer: '' },
    { question: CANONICAL_PROMPTS[2], answer: '' },
  ]);
  const [interests, setInterests] = useState<string[]>([]);
  const [intent, setIntent] = useState<string>('');
  const [heightCm, setHeightCm] = useState<number>(170);
  const [job, setJob] = useState<string>('');
  const [education, setEducation] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [dtm, setDtm] = useState<boolean | null>(null);
  const [verifyPhotoUrl, setVerifyPhotoUrl] = useState<string>('');

  // ─── bootstrap ────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [profRes, compRes] = await Promise.all([
          api.getMyProfile().catch(() => null),
          api.getCompletion().catch(() => null),
        ]);
        if (!alive) return;
        const p = profRes?.data ?? null;
        if (p) {
          setDisplayName(p.displayName ?? '');
          setAge(p.age ? String(p.age) : '');
          setGender(p.gender ?? '');
          setCity(p.city ?? '');
          setInterests(p.interests ?? []);
          setIntent(p.datingIntent ?? '');
          setHeightCm(p.heightCm ?? 170);
          setJob(p.job ?? '');
          setEducation(p.education ?? '');
          setBio(p.bio ?? '');
          if (Array.isArray(p.photos)) setPhotos(p.photos);
          if (Array.isArray(p.prompts) && p.prompts.length) {
            setPrompts(
              p.prompts.slice(0, 3).map((x: any) => ({
                question: x.question ?? CANONICAL_PROMPTS[0],
                answer: x.answer ?? '',
              })),
            );
          }
        }
        setCompletion(compRes?.data?.score ?? null);
      } catch (err) {
        if (alive) setError((err as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ─── helpers ───────────────────────────────────────
  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const goNext = useCallback(() => {
    const next = STEPS[Math.min(stepIndex + 1, STEPS.length - 1)];
    setStep(next);
  }, [stepIndex]);
  const goBack = useCallback(() => {
    const prev = STEPS[Math.max(stepIndex - 1, 0)];
    setStep(prev);
  }, [stepIndex]);

  async function savePatch(patch: Record<string, any>) {
    setSaving(true);
    try {
      await api.updateProfile(patch);
      updateUser(patch);
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  // ─── per-step Next handlers ────────────────────────
  async function nextFromBasics() {
    if (!displayName || !age || !gender) {
      Alert.alert('Fill everything', 'Name, age and gender are needed.');
      return;
    }
    try {
      await savePatch({ displayName, age: Number(age), gender });
      goNext();
    } catch {}
  }
  async function nextFromLocation() {
    if (!city) {
      Alert.alert('Location required', 'Pick your city to continue.');
      return;
    }
    try {
      await savePatch({ city, cityId: cityId ?? undefined });
      goNext();
    } catch {}
  }
  async function detectLocation() {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        toast.error('Location permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const res = await api.nearestCity(pos.coords.latitude, pos.coords.longitude);
      const data = res?.data;
      if (data?.name) {
        setCity(data.name);
        setCityId(data.id ?? null);
        toast.info(`Detected ${data.name}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function nextFromPhotos() {
    if (photos.length === 0) {
      Alert.alert('Add at least one photo', 'Profiles without photos are hidden.');
      return;
    }
    goNext();
  }
  async function nextFromPrompts() {
    const answered = prompts.filter(p => p.answer.trim().length > 0);
    if (answered.length < 1) {
      Alert.alert('Answer at least one prompt', 'This helps others start conversations.');
      return;
    }
    try {
      setSaving(true);
      await api.updatePrompts(
        prompts.map((p, i) => ({ question: p.question, answer: p.answer, position: i })),
      );
      goNext();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function nextFromInterests() {
    try {
      setSaving(true);
      await api.updateInterests(interests);
      goNext();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function nextFromIntent() {
    if (!intent) {
      Alert.alert('Pick an intent', 'This shapes who we recommend.');
      return;
    }
    try {
      await savePatch({ datingIntent: intent });
      goNext();
    } catch {}
  }
  async function nextFromStats() {
    try {
      await savePatch({ heightCm, job, education, bio });
      goNext();
    } catch {}
  }
  async function nextFromDtm() {
    if (dtm === null) {
      Alert.alert('Pick one', 'Are you open to marriage-track connections?');
      return;
    }
    if (dtm) {
      navigation.navigate('Dtm');
      return;
    }
    goNext();
  }
  async function submitVerification() {
    if (!verifyPhotoUrl) {
      Alert.alert('Upload a selfie', 'We need a real photo to verify.');
      return;
    }
    try {
      setSaving(true);
      await api.submitVerification({ kind: 'selfie', photoUrl: verifyPhotoUrl });
      toast.success('Submitted for review');
      goNext();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function finishOnboarding() {
    try {
      const res = await api.getCompletion();
      const score = res?.data?.score ?? 0;
      setCompletion(score);
      if (score < 60) {
        toast.info('Profile is only ' + score + '% — you can fill more later.');
      } else {
        toast.success('Welcome to Miamo');
      }
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch {
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    }
  }

  // ─── photo handlers ────────────────────────────────
  const onPhotoUploaded = useCallback((p: PhotoEntry) => {
    setPhotos(cur => (cur.length < 6 ? [...cur, p] : cur));
  }, []);
  const onPhotoRemove = useCallback(async (id?: string) => {
    if (!id) return;
    try {
      await api.deletePhoto(id);
      setPhotos(cur => cur.filter(x => x.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} testID="onboarding-screen">
      {/* progress bar */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stepMeta}>
        Step {stepIndex + 1} of {totalSteps}
        {completion !== null ? ` · profile ${completion}%` : ''}
      </Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {step === 'welcome' && (
        <View style={styles.stepBlock} testID="onb-welcome">
          <Text style={styles.title}>Welcome to Miamo</Text>
          <Text style={styles.body}>
            Serious dating for India. Behaviour-based matching, no swiping, no games.
          </Text>
          <Text style={styles.body}>Takes about 4 minutes.</Text>
        </View>
      )}

      {step === 'basics' && (
        <View style={styles.stepBlock} testID="onb-basics">
          <Text style={styles.title}>The basics</Text>
          <TextInput
            testID="onb-name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            style={styles.input}
          />
          <TextInput
            testID="onb-age"
            value={age}
            onChangeText={setAge}
            placeholder="Age"
            keyboardType="number-pad"
            style={styles.input}
          />
          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map(g => (
              <Pressable
                key={g.value}
                testID={`onb-gender-${g.value}`}
                onPress={() => setGender(g.value)}
                style={[styles.pill, gender === g.value && styles.pillActive]}>
                <Text style={gender === g.value ? styles.pillActiveText : styles.pillText}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 'location' && (
        <View style={styles.stepBlock} testID="onb-location">
          <Text style={styles.title}>Where are you based?</Text>
          <CityAutocomplete
            value={city}
            onChange={(name: string, id?: string) => {
              setCity(name);
              setCityId(id ?? null);
            }}
          />
          <Pressable onPress={detectLocation} style={styles.linkBtn} testID="onb-loc-detect">
            <Text style={styles.link}>Use my current location</Text>
          </Pressable>
        </View>
      )}

      {step === 'photos' && (
        <View style={styles.stepBlock} testID="onb-photos">
          <Text style={styles.title}>Add some photos</Text>
          <Text style={styles.body}>Up to 6. First photo is your main one.</Text>
          <PhotoUpload photos={photos} onUploaded={onPhotoUploaded} onRemove={onPhotoRemove} max={6} />
        </View>
      )}

      {step === 'prompts' && (
        <View style={styles.stepBlock} testID="onb-prompts">
          <Text style={styles.title}>Answer 3 prompts</Text>
          {prompts.map((p, i) => (
            <View key={i} style={styles.promptCard}>
              <IconOptionGrid
                testID={`onb-prompt-q-${i}`}
                value={p.question}
                options={CANONICAL_PROMPTS.map(q => ({ value: q, label: q }))}
                onChange={(q: string) => {
                  const next = [...prompts];
                  next[i] = { ...next[i], question: q };
                  setPrompts(next);
                }}
              />
              <TextInput
                testID={`onb-prompt-a-${i}`}
                value={p.answer}
                onChangeText={t => {
                  const next = [...prompts];
                  next[i] = { ...next[i], answer: t };
                  setPrompts(next);
                }}
                placeholder="Your answer"
                multiline
                style={[styles.input, styles.multiline]}
              />
            </View>
          ))}
        </View>
      )}

      {step === 'interests' && (
        <View style={styles.stepBlock} testID="onb-interests">
          <Text style={styles.title}>What lights you up?</Text>
          <Text style={styles.body}>Pick up to 8.</Text>
          <IconChipMulti
            options={INTEREST_OPTIONS}
            value={interests}
            onChange={setInterests}
            max={8}
          />
        </View>
      )}

      {step === 'intent' && (
        <View style={styles.stepBlock} testID="onb-intent">
          <Text style={styles.title}>What are you here for?</Text>
          <IconOptionGrid options={INTENT_OPTIONS} value={intent} onChange={setIntent} />
        </View>
      )}

      {step === 'stats' && (
        <View style={styles.stepBlock} testID="onb-stats">
          <Text style={styles.title}>A few more details</Text>
          <Text style={styles.label}>Height (cm)</Text>
          <NumberStepper value={heightCm} onChange={setHeightCm} min={140} max={210} step={1} />
          <TextInput
            testID="onb-job"
            value={job}
            onChangeText={setJob}
            placeholder="Job title"
            style={styles.input}
          />
          <TextInput
            testID="onb-edu"
            value={education}
            onChangeText={setEducation}
            placeholder="Education"
            style={styles.input}
          />
          <TextInput
            testID="onb-bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Short bio (optional)"
            style={[styles.input, styles.multiline]}
            multiline
          />
        </View>
      )}

      {step === 'dtm' && (
        <View style={styles.stepBlock} testID="onb-dtm">
          <Text style={styles.title}>Marriage-track?</Text>
          <Text style={styles.body}>
            DTM (Directly to Marriage) is our matrimonial track — profiles are shared with family
            reviewers.
          </Text>
          <View style={styles.chipRow}>
            <Pressable
              testID="onb-dtm-yes"
              onPress={() => setDtm(true)}
              style={[styles.pill, dtm === true && styles.pillActive]}>
              <Text style={dtm === true ? styles.pillActiveText : styles.pillText}>Yes</Text>
            </Pressable>
            <Pressable
              testID="onb-dtm-no"
              onPress={() => setDtm(false)}
              style={[styles.pill, dtm === false && styles.pillActive]}>
              <Text style={dtm === false ? styles.pillActiveText : styles.pillText}>Not right now</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 'verify' && (
        <View style={styles.stepBlock} testID="onb-verify">
          <Text style={styles.title}>Quick verification</Text>
          <Text style={styles.body}>Snap a selfie so we know you're real. Reviewed within 24h.</Text>
          <PhotoUpload
            single
            onUploaded={(p: PhotoEntry) => setVerifyPhotoUrl(p.url)}
            max={1}
          />
          {verifyPhotoUrl ? <Text style={styles.body}>Selfie ready to submit</Text> : null}
        </View>
      )}

      {step === 'done' && (
        <View style={styles.stepBlock} testID="onb-done">
          <Text style={styles.title}>You're in.</Text>
          <Text style={styles.body}>Welcome to Miamo. You can tune preferences any time from Settings.</Text>
        </View>
      )}

      {/* nav row */}
      <View style={styles.navRow}>
        {stepIndex > 0 && (
          <Pressable onPress={goBack} style={styles.backBtn} testID="onb-back">
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        <Pressable
          testID="onb-next"
          accessibilityRole="button"
          disabled={saving}
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={() => {
            if (step === 'welcome') goNext();
            else if (step === 'basics') nextFromBasics();
            else if (step === 'location') nextFromLocation();
            else if (step === 'photos') nextFromPhotos();
            else if (step === 'prompts') nextFromPrompts();
            else if (step === 'interests') nextFromInterests();
            else if (step === 'intent') nextFromIntent();
            else if (step === 'stats') nextFromStats();
            else if (step === 'dtm') nextFromDtm();
            else if (step === 'verify') submitVerification();
            else if (step === 'done') finishOnboarding();
          }}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {step === 'done' ? 'Enter Miamo' : step === 'verify' ? 'Submit selfie' : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>

      {step !== 'welcome' && step !== 'done' && (
        <Pressable
          testID="onb-skip"
          onPress={goNext}
          style={styles.skipBtn}
          accessibilityRole="button">
          <Text style={styles.link}>Skip for now</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, flexGrow: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#111' },
  stepMeta: { fontSize: 12, color: '#666', textAlign: 'center' },
  stepBlock: { gap: 10, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  body: { fontSize: 14, color: '#333', lineHeight: 20 },
  label: { fontSize: 13, color: '#555', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff', fontWeight: '600' },
  promptCard: { gap: 8, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 12 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  backText: { color: '#111', fontWeight: '600' },
  btn: { backgroundColor: '#111', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  skipBtn: { alignItems: 'center', paddingVertical: 6 },
  link: { color: '#111', fontWeight: '600' },
  errorText: { color: '#c92222', textAlign: 'center' },
});
