// Miamo Mobile — Discover screen (v3.6).
// Web parity: services/web/src/app/(main)/discover/page.tsx.
//
// Full-feature dating deck:
//   • Filters bar (age range, distance, gender, intent) → persisted via
//     api.saveDiscoverFilters and re-hydrated from api.getDiscoverFilters.
//   • WeeklyTop10 strip at the top (auto-hidden on flag OFF).
//   • Card deck via react-native-deck-swiper. Cards show photos carousel,
//     name+age, city, dating intent chip, prompts, verification badge and a
//     "Why am I seeing this?" button (WhyCard).
//   • Swipe right → sendLike (isMutual → MatchSuccessModal).
//   • Swipe left → passUser, plus triple-pass feedback modal.
//   • Long press on card → menu with Super Like, Send Move (MoveV2Picker),
//     Save for Later (deferItem).
//   • Empty deck → AllCaughtUpScreen (with deferred pile support).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@lib/api';
import { useDiscoverStore } from '@stores/discoverStore';
import EmptyState from '@components/EmptyState';
import MatchSuccessModal from '@components/MatchSuccessModal';
import { toast } from '@components/Toast';
import WeeklyTop10 from '@components/WeeklyTop10';
import WhyCard from '@components/WhyCard';
import MoveV2Picker from '@components/MoveV2Picker';
import AllCaughtUpScreen from '@components/AllCaughtUpScreen';
import ConfirmDialog from '@components/ConfirmDialog';
import { useTrackPageView, useTrackActivity } from '@hooks/useTrackActivity';

// Chip taxonomy — mirrors the web filter bar.
const GENDER_OPTIONS = ['any', 'women', 'men', 'nonbinary'] as const;
const INTENT_OPTIONS = ['any', 'serious', 'casual', 'dtm', 'exploring'] as const;

type Filters = {
  minAge: number;
  maxAge: number;
  distance: number;
  gender: (typeof GENDER_OPTIONS)[number];
  intent: (typeof INTENT_OPTIONS)[number];
};

const DEFAULT_FILTERS: Filters = {
  minAge: 21,
  maxAge: 35,
  distance: 50,
  gender: 'any',
  intent: 'any',
};

const PASS_REASONS = [
  { key: 'not_my_type', label: 'Not my type' },
  { key: 'distance', label: 'Too far' },
  { key: 'age', label: 'Age gap' },
  { key: 'intent', label: 'Different intent' },
  { key: 'other', label: 'Other' },
] as const;

export default function DiscoverScreen() {
  useTrackPageView('discover');
  const track = useTrackActivity();
  const { cards, setCards, nextProfile } = useDiscoverStore();
  const swiperRef = useRef<Swiper<any> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [passStreak, setPassStreak] = useState(0);
  const [passFeedback, setPassFeedback] = useState<{
    visible: boolean;
    userId?: string;
    reason?: string;
    details?: string;
  }>({ visible: false });
  const [longPressTarget, setLongPressTarget] = useState<any | null>(null);
  const [whyForId, setWhyForId] = useState<string | null>(null);
  const [movePickerFor, setMovePickerFor] = useState<string | null>(null);
  const [deferConfirm, setDeferConfirm] = useState<any | null>(null);
  const [matchPayload, setMatchPayload] = useState<{
    visible: boolean;
    otherName?: string;
    isFirstMatch?: boolean;
  }>({ visible: false });

  // ─── Data ───────────────────────────────────────────────────
  const loadFilters = useCallback(async () => {
    try {
      const res: any = await api.getDiscoverFilters();
      const f = res?.data;
      if (!f) return;
      setFilters(prev => ({
        minAge: f.minAge ?? prev.minAge,
        maxAge: f.maxAge ?? prev.maxAge,
        distance: f.distance ?? prev.distance,
        gender: (f.gender as any) ?? prev.gender,
        intent: (f.intent as any) ?? prev.intent,
      }));
    } catch {
      // best-effort — fall back to defaults
    }
  }, []);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        minAge: String(filters.minAge),
        maxAge: String(filters.maxAge),
        distance: String(filters.distance),
      };
      if (filters.gender !== 'any') params.gender = filters.gender;
      if (filters.intent !== 'any') params.intent = filters.intent;
      const res: any = await api.getDiscover(params);
      setCards(res?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters, setCards]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // ─── Filter mutations ────────────────────────────────────────
  const commitFilters = useCallback(
    async (next: Filters) => {
      setFilters(next);
      try {
        await api.saveDiscoverFilters({
          minAge: next.minAge,
          maxAge: next.maxAge,
          distance: next.distance,
          gender: next.gender === 'any' ? null : (next.gender as any),
          intent: next.intent === 'any' ? null : (next.intent as any),
        } as any);
        track('filter_change', 'discover', undefined, { ...next });
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [track],
  );

  // ─── Swipe handlers ──────────────────────────────────────────
  const onSwipeRight = useCallback(
    async (idx: number) => {
      const target = cards[idx];
      if (!target) return;
      setPassStreak(0);
      try {
        const res: any = await api.sendLike(target.id);
        track('swipe_right', 'discover', target.id);
        if (res?.data?.isMutual) {
          setMatchPayload({
            visible: true,
            otherName:
              target?.profile?.displayName || target?.displayName || undefined,
            isFirstMatch: !!res?.data?.isFirstMatch,
          });
        }
        nextProfile();
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [cards, nextProfile, track],
  );

  const onSwipeLeft = useCallback(
    async (idx: number) => {
      const target = cards[idx];
      if (!target) return;
      const nextStreak = passStreak + 1;
      setPassStreak(nextStreak);
      try {
        await api.passUser(target.id);
        track('swipe_left', 'discover', target.id);
        nextProfile();
        if (nextStreak >= 3) {
          setPassFeedback({ visible: true, userId: target.id });
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [cards, passStreak, nextProfile, track],
  );

  const submitPassFeedback = useCallback(async () => {
    if (!passFeedback.userId || !passFeedback.reason) {
      setPassFeedback({ visible: false });
      setPassStreak(0);
      return;
    }
    try {
      await api.passUserFeedback(
        passFeedback.userId,
        passFeedback.reason,
        passFeedback.details,
      );
      toast.success('Thanks for the feedback');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPassFeedback({ visible: false });
      setPassStreak(0);
    }
  }, [passFeedback]);

  // ─── Long-press menu actions ─────────────────────────────────
  const onSuperLike = useCallback(async (target: any) => {
    try {
      await api.superLikeUser(target.id);
      toast.success('Super Liked');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const onDeferConfirm = useCallback(async () => {
    if (!deferConfirm) return;
    try {
      await api.deferItem({ surface: 'discover', targetId: deferConfirm.id });
      toast.success('Saved for later');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeferConfirm(null);
    }
  }, [deferConfirm]);

  const onSendMove = useCallback(
    async (suggestion: { text: string }, targetId: string) => {
      try {
        await api.sendMiamoMove(targetId, suggestion.text);
        toast.success('Move sent');
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setMovePickerFor(null);
      }
    },
    [],
  );

  // ─── Renderers ───────────────────────────────────────────────
  const renderCard = useCallback(
    (card: any) => {
      if (!card) return null;
      const photos: any[] = card?.photos ?? [];
      const displayName =
        card?.profile?.displayName ?? card?.displayName ?? 'Someone';
      const age = card?.profile?.age;
      const city = card?.profile?.city;
      const intent = card?.profile?.intent ?? card?.intent;
      const verified = !!card?.profile?.verified;
      const prompts: any[] = card?.profile?.prompts ?? [];

      return (
        <Pressable
          onLongPress={() => setLongPressTarget(card)}
          delayLongPress={350}
          style={styles.card}
          testID={`discover-card-${card.id}`}>
          <ScrollView style={styles.cardScroll}>
            {photos[0]?.url ? (
              <Image source={{ uri: photos[0].url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder} />
            )}
            {photos.slice(1, 4).length > 0 ? (
              <ScrollView horizontal style={styles.thumbRow}>
                {photos.slice(1, 4).map((p, i) => (
                  <Image
                    key={i}
                    source={{ uri: p.url }}
                    style={styles.thumb}
                  />
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {displayName}
                  {age ? `, ${age}` : ''}
                </Text>
                {verified ? <Text style={styles.badge}>✓ Verified</Text> : null}
              </View>
              {city ? <Text style={styles.meta}>{city}</Text> : null}
              {intent ? (
                <View style={styles.chipInline}>
                  <Text style={styles.chipInlineText}>{intent}</Text>
                </View>
              ) : null}
              {prompts.slice(0, 3).map((p: any, i: number) => (
                <View key={i} style={styles.prompt}>
                  <Text style={styles.promptQ}>{p.question}</Text>
                  <Text style={styles.promptA}>{p.answer}</Text>
                </View>
              ))}
              <Pressable
                testID={`discover-why-${card.id}`}
                onPress={() => setWhyForId(card.id)}
                style={styles.whyBtn}>
                <Text style={styles.whyBtnText}>Why am I seeing this?</Text>
              </Pressable>
              {whyForId === card.id ? <WhyCard targetId={card.id} /> : null}
            </View>
          </ScrollView>
        </Pressable>
      );
    },
    [whyForId],
  );

  // ─── Render tree ─────────────────────────────────────────────
  const filterSummary = useMemo(
    () =>
      `${filters.minAge}-${filters.maxAge} · ${filters.distance}km · ${filters.gender} · ${filters.intent}`,
    [filters],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="discover-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn't load"
        message={error}
        actionLabel="Retry"
        onAction={loadDeck}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.wrap}>
        <FiltersBar
          summary={filterSummary}
          onOpen={() => setFilterOpen(true)}
        />
        <AllCaughtUpScreen
          surface="discover"
          onAdjustFilters={() => setFilterOpen(true)}
          onPileChanged={loadDeck}
        />
        <FiltersModal
          visible={filterOpen}
          initial={filters}
          onCancel={() => setFilterOpen(false)}
          onSave={f => {
            setFilterOpen(false);
            commitFilters(f);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap} testID="discover-screen">
      <FiltersBar
        summary={filterSummary}
        onOpen={() => setFilterOpen(true)}
      />
      <View style={styles.weekly}>
        <WeeklyTop10 />
      </View>
      <View style={styles.deckWrap}>
        <Swiper
          ref={r => {
            swiperRef.current = r;
          }}
          cards={cards}
          renderCard={renderCard}
          onSwipedRight={onSwipeRight}
          onSwipedLeft={onSwipeLeft}
          backgroundColor="transparent"
          stackSize={3}
          verticalSwipe={false}
          cardIndex={0}
        />
      </View>
      <MatchSuccessModal
        visible={matchPayload.visible}
        otherName={matchPayload.otherName}
        isFirstMatch={matchPayload.isFirstMatch}
        onSendMove={() => setMatchPayload({ visible: false })}
        onKeepBrowsing={() => setMatchPayload({ visible: false })}
      />
      {/* Long-press action menu */}
      <Modal
        visible={!!longPressTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setLongPressTarget(null)}
        testID="discover-longpress-menu">
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setLongPressTarget(null)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>
              {longPressTarget?.profile?.displayName ??
                longPressTarget?.displayName ??
                'Options'}
            </Text>
            <MenuBtn
              testID="menu-super-like"
              label="Super Like"
              onPress={() => {
                onSuperLike(longPressTarget);
                setLongPressTarget(null);
              }}
            />
            <MenuBtn
              testID="menu-send-move"
              label="Send Move"
              onPress={() => {
                setMovePickerFor(longPressTarget.id);
                setLongPressTarget(null);
              }}
            />
            <MenuBtn
              testID="menu-save-later"
              label="Save for later"
              onPress={() => {
                setDeferConfirm(longPressTarget);
                setLongPressTarget(null);
              }}
            />
            <MenuBtn
              testID="menu-cancel"
              label="Cancel"
              ghost
              onPress={() => setLongPressTarget(null)}
            />
          </View>
        </Pressable>
      </Modal>
      {/* Move picker sheet */}
      <Modal
        visible={!!movePickerFor}
        transparent
        animationType="slide"
        onRequestClose={() => setMovePickerFor(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Pick a Move</Text>
            {movePickerFor ? (
              <MoveV2Picker
                itemId={movePickerFor}
                onSelect={s => onSendMove(s, movePickerFor)}
              />
            ) : null}
            <Pressable
              onPress={() => setMovePickerFor(null)}
              style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* Pass feedback (triple-pass) */}
      <Modal
        visible={passFeedback.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setPassFeedback({ visible: false })}
        testID="pass-feedback-modal">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Help us do better</Text>
            <Text style={styles.sheetBody}>
              You just passed on a few. Why? (optional)
            </Text>
            <View style={styles.reasonRow}>
              {PASS_REASONS.map(r => (
                <Pressable
                  key={r.key}
                  testID={`pass-reason-${r.key}`}
                  onPress={() =>
                    setPassFeedback(pf => ({ ...pf, reason: r.key }))
                  }
                  style={[
                    styles.pill,
                    passFeedback.reason === r.key && styles.pillActive,
                  ]}>
                  <Text
                    style={
                      passFeedback.reason === r.key
                        ? styles.pillActiveText
                        : styles.pillText
                    }>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Anything else? (optional)"
              placeholderTextColor="#888"
              value={passFeedback.details ?? ''}
              onChangeText={t =>
                setPassFeedback(pf => ({ ...pf, details: t }))
              }
              style={styles.detailsInput}
              multiline
              testID="pass-feedback-details"
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => {
                  setPassFeedback({ visible: false });
                  setPassStreak(0);
                }}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={submitPassFeedback}
                testID="pass-feedback-submit"
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Filters modal */}
      <FiltersModal
        visible={filterOpen}
        initial={filters}
        onCancel={() => setFilterOpen(false)}
        onSave={f => {
          setFilterOpen(false);
          commitFilters(f);
        }}
      />
      {/* Save-for-later confirm */}
      <ConfirmDialog
        visible={!!deferConfirm}
        title="Save for later?"
        message={
          deferConfirm
            ? `We'll bring ${
                deferConfirm?.profile?.displayName ??
                deferConfirm?.displayName ??
                'this profile'
              } back to your deferred pile.`
            : undefined
        }
        confirmLabel="Save"
        onConfirm={onDeferConfirm}
        onCancel={() => setDeferConfirm(null)}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────
function FiltersBar({
  summary,
  onOpen,
}: {
  summary: string;
  onOpen: () => void;
}) {
  return (
    <Pressable
      testID="discover-filters-bar"
      onPress={onOpen}
      style={styles.filterBar}>
      <Text style={styles.filterBarLabel}>Filters</Text>
      <Text style={styles.filterBarSummary}>{summary}</Text>
    </Pressable>
  );
}

function FiltersModal({
  visible,
  initial,
  onCancel,
  onSave,
}: {
  visible: boolean;
  initial: Filters;
  onCancel: () => void;
  onSave: (f: Filters) => void;
}) {
  const [local, setLocal] = useState<Filters>(initial);
  useEffect(() => {
    if (visible) setLocal(initial);
  }, [visible, initial]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
      testID="discover-filters-modal">
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Text style={styles.section}>Age</Text>
          <View style={styles.stepperRow}>
            <NumberStepperInline
              testID="filter-min-age"
              value={local.minAge}
              min={18}
              max={99}
              onChange={v =>
                setLocal(l => ({
                  ...l,
                  minAge: Math.min(v, l.maxAge),
                }))
              }
            />
            <Text style={styles.dash}>—</Text>
            <NumberStepperInline
              testID="filter-max-age"
              value={local.maxAge}
              min={18}
              max={99}
              onChange={v =>
                setLocal(l => ({ ...l, maxAge: Math.max(v, l.minAge) }))
              }
            />
          </View>
          <Text style={styles.section}>Distance ({local.distance} km)</Text>
          <View style={styles.stepperRow}>
            <NumberStepperInline
              testID="filter-distance"
              value={local.distance}
              min={5}
              max={200}
              step={5}
              onChange={v => setLocal(l => ({ ...l, distance: v }))}
            />
          </View>
          <Text style={styles.section}>Gender</Text>
          <View style={styles.reasonRow}>
            {GENDER_OPTIONS.map(g => (
              <Pressable
                key={g}
                testID={`filter-gender-${g}`}
                onPress={() => setLocal(l => ({ ...l, gender: g }))}
                style={[
                  styles.pill,
                  local.gender === g && styles.pillActive,
                ]}>
                <Text
                  style={
                    local.gender === g
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.section}>Intent</Text>
          <View style={styles.reasonRow}>
            {INTENT_OPTIONS.map(i => (
              <Pressable
                key={i}
                testID={`filter-intent-${i}`}
                onPress={() => setLocal(l => ({ ...l, intent: i }))}
                style={[
                  styles.pill,
                  local.intent === i && styles.pillActive,
                ]}>
                <Text
                  style={
                    local.intent === i
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {i}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.sheetActions}>
            <Pressable
              onPress={onCancel}
              style={[styles.sheetBtn, styles.sheetBtnGhost]}>
              <Text style={styles.sheetBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(local)}
              testID="filter-save"
              style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
              <Text style={styles.sheetBtnPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NumberStepperInline({
  testID,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  testID: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        style={styles.stepBtn}
        testID={`${testID}-dec`}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        style={styles.stepBtn}
        testID={`${testID}-inc`}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function MenuBtn({
  testID,
  label,
  onPress,
  ghost,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  ghost?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.menuBtn, ghost && styles.menuBtnGhost]}>
      <Text style={ghost ? styles.menuBtnGhostText : styles.menuBtnText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  filterBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  filterBarSummary: { fontSize: 13, color: '#111', fontWeight: '600' },
  weekly: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deckWrap: { flex: 1 },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    minHeight: 460,
    overflow: 'hidden',
  },
  cardScroll: { flex: 1 },
  photo: { width: '100%', height: 320 },
  photoPlaceholder: { width: '100%', height: 320, backgroundColor: '#eee' },
  thumbRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: '#ddd',
  },
  cardBody: { padding: 16 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { fontSize: 22, fontWeight: '800', color: '#111' },
  badge: {
    fontSize: 11,
    color: '#1a8a34',
    fontWeight: '700',
    backgroundColor: '#e6f7ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  meta: { fontSize: 13, color: '#666', marginTop: 4 },
  chipInline: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#c92244',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipInlineText: { color: '#c92244', fontSize: 12, fontWeight: '600' },
  prompt: { marginTop: 12 },
  promptQ: { fontSize: 12, color: '#888', fontWeight: '600' },
  promptA: { fontSize: 15, color: '#111', marginTop: 2 },
  whyBtn: {
    marginTop: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
  },
  whyBtnText: { fontSize: 12, color: '#333', fontWeight: '600' },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  menuBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  menuBtnText: { color: '#fff', fontWeight: '700' },
  menuBtnGhost: { backgroundColor: '#eee' },
  menuBtnGhostText: { color: '#111', fontWeight: '600' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  sheetBody: { fontSize: 14, color: '#333', marginBottom: 12 },
  sheetClose: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  sheetCloseText: { color: '#c92222', fontWeight: '600' },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  detailsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    minHeight: 60,
    color: '#111',
    textAlignVertical: 'top',
  },
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
    gap: 8,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '700', color: '#111' },
  stepValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
    color: '#111',
  },
  dash: { fontSize: 18, color: '#888' },
});
