// Miamo Mobile — Serious Mode (advanced dating pool + matrimonial filters).
// Web parity: services/web/src/app/(main)/serious-mode/page.tsx.
//
// Combines:
//   • Serious Mode master toggle (profile.seriousMode).
//   • Intent override selector.
//   • Advanced filters: age, distance, height, education, dating intent.
//   • Family / matrimonial preferences: mother-tongue, religion, community,
//     diet.
//   • Result grid via api.browseMatrimonial(params).
//   • Tap a candidate → inline compatibility (api.getMatrimonialCompatibility)
//     + Request Access CTA (api.requestAccess).
//   • Optional numerology summary (api.getMatrimonialNumerology).
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { toast } from '@components/Toast';
import ConfirmDialog from '@components/ConfirmDialog';
import { useTrackPageView } from '@hooks/useTrackActivity';

const INTENTS = ['serious', 'dtm'] as const;
const EDUCATION_LEVELS = [
  'high_school',
  'undergrad',
  'postgrad',
  'phd',
  'other',
] as const;
const RELIGIONS = ['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'other', 'none'] as const;
const DIETS = ['veg', 'non_veg', 'jain', 'vegan', 'eggetarian', 'other'] as const;
const LANGUAGES = [
  'hindi',
  'english',
  'tamil',
  'telugu',
  'kannada',
  'marathi',
  'bengali',
  'gujarati',
  'punjabi',
  'malayalam',
  'other',
] as const;
const ACCESS_TYPES = [
  { key: 'photo', label: 'Extra photos' },
  { key: 'contact', label: 'Contact details' },
  { key: 'family', label: 'Family info' },
  { key: 'horoscope', label: 'Horoscope' },
] as const;

type Filters = {
  minAge: number;
  maxAge: number;
  distance: number;
  minHeight: number;
  maxHeight: number;
  education: string[];
  intent: (typeof INTENTS)[number];
  motherTongue: string[];
  religion: string[];
  community: string;
  diet: string[];
};

const DEFAULT_FILTERS: Filters = {
  minAge: 24,
  maxAge: 36,
  distance: 100,
  minHeight: 150,
  maxHeight: 200,
  education: [],
  intent: 'serious',
  motherTongue: [],
  religion: [],
  community: '',
  diet: [],
};

export default function SeriousModeScreen() {
  useTrackPageView('serious-mode');
  const [enabled, setEnabled] = useState(false);
  const [intentOverride, setIntentOverride] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<any[]>([]);
  const [numerology, setNumerology] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<any | null>(null);
  const [compat, setCompat] = useState<any>(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const [accessType, setAccessType] = useState<string>('photo');
  const [accessMessage, setAccessMessage] = useState('');
  const [accessConfirm, setAccessConfirm] = useState<any | null>(null);

  // ─── Bootstrap ──────────────────────────────────────────────
  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [p, i, n] = await Promise.all([
        api.getMyProfile().catch(() => ({ data: null })),
        api.getIntentStatus().catch(() => ({ data: null })),
        (api as any).getMatrimonialNumerology
          ? (api as any).getMatrimonialNumerology().catch(() => null)
          : Promise.resolve(null),
      ]);
      setEnabled(!!(p as any)?.data?.seriousMode);
      setIntentOverride(
        (i as any)?.data?.override ?? (i as any)?.data?.revealed ?? null,
      );
      setNumerology(n?.data ?? null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // ─── Mutations ──────────────────────────────────────────────
  const toggleSerious = useCallback(async (v: boolean) => {
    setEnabled(v);
    try {
      await api.updateProfile({ seriousMode: v } as any);
      toast.success(v ? 'Serious Mode on' : 'Serious Mode off');
    } catch (err) {
      setEnabled(!v);
      toast.error((err as Error).message);
    }
  }, []);

  const changeOverride = useCallback(async (o: string | null) => {
    setIntentOverride(o);
    try {
      await api.setIntentOverride(o);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const runBrowse = useCallback(async () => {
    setBusy(true);
    try {
      const params: Record<string, string | number> = {
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        distance: filters.distance,
        minHeight: filters.minHeight,
        maxHeight: filters.maxHeight,
        intent: filters.intent,
      };
      if (filters.community) params.community = filters.community;
      if (filters.education.length) params.education = filters.education.join(',');
      if (filters.religion.length) params.religion = filters.religion.join(',');
      if (filters.motherTongue.length)
        params.motherTongue = filters.motherTongue.join(',');
      if (filters.diet.length) params.diet = filters.diet.join(',');
      const res: any = await api.browseMatrimonial(params);
      setResults(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [filters]);

  const openCandidate = useCallback(async (row: any) => {
    setCandidate(row);
    setCompat(null);
    setCompatLoading(true);
    try {
      const res: any = await api.getMatrimonialCompatibility(
        row.userId ?? row.id,
      );
      setCompat(res?.data ?? res ?? null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCompatLoading(false);
    }
  }, []);

  const submitAccess = useCallback(async () => {
    if (!accessConfirm) return;
    try {
      await api.requestAccess(
        accessConfirm.userId ?? accessConfirm.id,
        accessType,
        accessMessage.trim() || undefined,
      );
      toast.success('Request sent');
      setAccessConfirm(null);
      setAccessMessage('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [accessConfirm, accessType, accessMessage]);

  // ─── Helpers ────────────────────────────────────────────────
  const toggleInArr = useCallback(
    (arr: string[], v: string): string[] =>
      arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v],
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="serious-mode-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) return <EmptyState title="Couldn't load" message={error} />;

  return (
    <SafeAreaView style={styles.wrap} testID="serious-mode-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Serious Mode</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Enabled</Text>
            <Switch
              testID="serious-mode-toggle"
              value={enabled}
              onValueChange={toggleSerious}
            />
          </View>
          <Text style={styles.help}>
            Restricts your queue to serious daters + DTM candidates.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Intent override</Text>
          <View style={styles.pillRow}>
            {(['serious', 'casual', 'dtm', 'exploring'] as const).map(i => (
              <Pressable
                key={i}
                testID={`intent-${i}`}
                onPress={() => changeOverride(i)}
                style={[
                  styles.pill,
                  intentOverride === i && styles.pillActive,
                ]}>
                <Text
                  style={
                    intentOverride === i
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {i}
                </Text>
              </Pressable>
            ))}
            <Pressable
              testID="intent-clear"
              onPress={() => changeOverride(null)}
              style={styles.pill}>
              <Text style={styles.pillText}>clear</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>Advanced filters</Text>
        <View style={styles.card}>
          <StepperRow
            label="Age"
            min={local => local.minAge}
            max={local => local.maxAge}
            filters={filters}
            onMin={v => setFilters(f => ({ ...f, minAge: Math.min(v, f.maxAge) }))}
            onMax={v => setFilters(f => ({ ...f, maxAge: Math.max(v, f.minAge) }))}
            floor={18}
            ceiling={80}
          />
          <StepperRow
            label="Height (cm)"
            min={local => local.minHeight}
            max={local => local.maxHeight}
            filters={filters}
            onMin={v =>
              setFilters(f => ({ ...f, minHeight: Math.min(v, f.maxHeight) }))
            }
            onMax={v =>
              setFilters(f => ({ ...f, maxHeight: Math.max(v, f.minHeight) }))
            }
            floor={140}
            ceiling={220}
          />
          <SingleStepperRow
            label={`Distance (${filters.distance} km)`}
            value={filters.distance}
            step={5}
            floor={5}
            ceiling={500}
            onChange={v => setFilters(f => ({ ...f, distance: v }))}
          />
          <Text style={styles.subsection}>Intent</Text>
          <View style={styles.pillRow}>
            {INTENTS.map(i => (
              <Pressable
                key={i}
                testID={`filter-intent-${i}`}
                onPress={() => setFilters(f => ({ ...f, intent: i }))}
                style={[
                  styles.pill,
                  filters.intent === i && styles.pillActive,
                ]}>
                <Text
                  style={
                    filters.intent === i
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {i}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.subsection}>Education</Text>
          <View style={styles.pillRow}>
            {EDUCATION_LEVELS.map(e => (
              <Pressable
                key={e}
                testID={`filter-edu-${e}`}
                onPress={() =>
                  setFilters(f => ({
                    ...f,
                    education: toggleInArr(f.education, e),
                  }))
                }
                style={[
                  styles.pill,
                  filters.education.includes(e) && styles.pillActive,
                ]}>
                <Text
                  style={
                    filters.education.includes(e)
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {e.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.section}>Family / matrimonial</Text>
        <View style={styles.card}>
          <Text style={styles.subsection}>Mother tongue</Text>
          <View style={styles.pillRow}>
            {LANGUAGES.map(l => (
              <Pressable
                key={l}
                testID={`filter-lang-${l}`}
                onPress={() =>
                  setFilters(f => ({
                    ...f,
                    motherTongue: toggleInArr(f.motherTongue, l),
                  }))
                }
                style={[
                  styles.pill,
                  filters.motherTongue.includes(l) && styles.pillActive,
                ]}>
                <Text
                  style={
                    filters.motherTongue.includes(l)
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.subsection}>Religion</Text>
          <View style={styles.pillRow}>
            {RELIGIONS.map(r => (
              <Pressable
                key={r}
                testID={`filter-religion-${r}`}
                onPress={() =>
                  setFilters(f => ({
                    ...f,
                    religion: toggleInArr(f.religion, r),
                  }))
                }
                style={[
                  styles.pill,
                  filters.religion.includes(r) && styles.pillActive,
                ]}>
                <Text
                  style={
                    filters.religion.includes(r)
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.subsection}>Community (optional)</Text>
          <TextInput
            testID="filter-community"
            placeholder="e.g. Iyer, Sindhi"
            placeholderTextColor="#888"
            value={filters.community}
            onChangeText={t => setFilters(f => ({ ...f, community: t }))}
            style={styles.input}
          />
          <Text style={styles.subsection}>Diet</Text>
          <View style={styles.pillRow}>
            {DIETS.map(d => (
              <Pressable
                key={d}
                testID={`filter-diet-${d}`}
                onPress={() =>
                  setFilters(f => ({
                    ...f,
                    diet: toggleInArr(f.diet, d),
                  }))
                }
                style={[
                  styles.pill,
                  filters.diet.includes(d) && styles.pillActive,
                ]}>
                <Text
                  style={
                    filters.diet.includes(d)
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {d.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          testID="serious-run-browse"
          onPress={runBrowse}
          disabled={busy}
          style={[styles.primary, busy && styles.disabled]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Find matches</Text>
          )}
        </Pressable>

        {numerology ? (
          <View style={styles.card}>
            <Text style={styles.section}>Your numerology</Text>
            <Text style={styles.meta}>
              Life path: {numerology.lifePath ?? '—'} · Destiny:{' '}
              {numerology.destiny ?? '—'}
            </Text>
          </View>
        ) : null}

        {results.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.section}>{results.length} matches</Text>
            <FlatList
              data={results}
              keyExtractor={(item: any) => item.userId ?? item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  testID={`serious-result-${item.userId ?? item.id}`}
                  onPress={() => openCandidate(item)}
                  style={styles.resultRow}>
                  <View style={styles.avatar} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName}>
                      {item.displayName ?? 'Someone'}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {item.age ? `${item.age} · ` : ''}
                      {item.city ?? ''}
                    </Text>
                    {item.matchScore ? (
                      <Text style={styles.rowScore}>
                        Match {item.matchScore}%
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Candidate detail sheet */}
      <Modal
        visible={!!candidate}
        animationType="slide"
        transparent
        onRequestClose={() => setCandidate(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {candidate?.displayName ?? 'Candidate'}
            </Text>
            {compatLoading ? (
              <ActivityIndicator />
            ) : compat ? (
              <View>
                <Text style={styles.meta}>Overall: {compat.overall ?? '—'}</Text>
                {Array.isArray(compat.factors) ? (
                  compat.factors.map((f: any, i: number) => (
                    <Text key={i} style={styles.meta}>
                      {f.label}: {f.score}
                    </Text>
                  ))
                ) : null}
              </View>
            ) : (
              <Text style={styles.meta}>No compatibility data.</Text>
            )}

            <Text style={styles.section}>Request access</Text>
            <View style={styles.pillRow}>
              {ACCESS_TYPES.map(a => (
                <Pressable
                  key={a.key}
                  testID={`access-type-${a.key}`}
                  onPress={() => setAccessType(a.key)}
                  style={[
                    styles.pill,
                    accessType === a.key && styles.pillActive,
                  ]}>
                  <Text
                    style={
                      accessType === a.key
                        ? styles.pillActiveText
                        : styles.pillText
                    }>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="access-message"
              placeholder="Message (optional)"
              placeholderTextColor="#888"
              value={accessMessage}
              onChangeText={setAccessMessage}
              style={styles.input}
              multiline
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setCandidate(null)}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Close</Text>
              </Pressable>
              <Pressable
                testID="access-submit"
                onPress={() => setAccessConfirm(candidate)}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Request</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!accessConfirm}
        title="Request access?"
        message="They'll be notified and can grant, deny or revoke access."
        confirmLabel="Send request"
        onCancel={() => setAccessConfirm(null)}
        onConfirm={submitAccess}
      />
    </SafeAreaView>
  );
}

// ─── Small sub-components ─────────────────────────────────────
function StepperRow({
  label,
  min,
  max,
  filters,
  onMin,
  onMax,
  floor,
  ceiling,
}: {
  label: string;
  min: (f: any) => number;
  max: (f: any) => number;
  filters: any;
  onMin: (v: number) => void;
  onMax: (v: number) => void;
  floor: number;
  ceiling: number;
}) {
  const minV = min(filters);
  const maxV = max(filters);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.subsection}>
        {label}: {minV} – {maxV}
      </Text>
      <View style={styles.stepperRow}>
        <Stepper
          testID={`step-min-${label}`}
          value={minV}
          floor={floor}
          ceiling={ceiling}
          onChange={onMin}
        />
        <Stepper
          testID={`step-max-${label}`}
          value={maxV}
          floor={floor}
          ceiling={ceiling}
          onChange={onMax}
        />
      </View>
    </View>
  );
}

function SingleStepperRow({
  label,
  value,
  onChange,
  step = 1,
  floor,
  ceiling,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  floor: number;
  ceiling: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.subsection}>{label}</Text>
      <View style={styles.stepperRow}>
        <Stepper
          testID={`step-${label}`}
          value={value}
          onChange={onChange}
          step={step}
          floor={floor}
          ceiling={ceiling}
        />
      </View>
    </View>
  );
}

function Stepper({
  value,
  onChange,
  step = 1,
  floor,
  ceiling,
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  floor: number;
  ceiling: number;
  testID: string;
}) {
  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable
        onPress={() => onChange(Math.max(floor, value - step))}
        style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(ceiling, value + step))}
        style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f7f7f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: '#111' },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  subsection: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  help: { fontSize: 12, color: '#666', marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#111' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    color: '#111',
    marginTop: 6,
  },
  primary: {
    marginTop: 8,
    backgroundColor: '#c92244',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  resultRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#111' },
  rowMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  rowScore: { fontSize: 12, color: '#1a8a34', fontWeight: '700', marginTop: 2 },
  meta: { fontSize: 13, color: '#333', marginTop: 4 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  sheetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sheetBtnPrimary: { backgroundColor: '#111' },
  sheetBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  sheetBtnGhost: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  sheetBtnGhostText: { color: '#111', fontWeight: '600' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '700', color: '#111' },
  stepValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
    color: '#111',
  },
});
