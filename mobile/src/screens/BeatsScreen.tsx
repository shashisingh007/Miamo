// Miamo Mobile — Beats (daily-prompt streaks between matched pairs).
// Web parity: services/web/src/app/(main)/beats/page.tsx.
//
// A "beat" is a daily prompt exchanged between a matched pair. The screen
// pivots around four state tabs (active / missed / completed / archived).
// Each row exposes:
//   • start / continue (opens compose modal → text / photo / voice payload)
//   • miss / expire / restore / archive lifecycle actions
//   • per-event playback (view, replay, save, unsave, screenshot, download)
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import MediaPicker from '@components/MediaPicker';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

type BeatState = 'active' | 'missed' | 'completed' | 'archived';
const TABS: { key: BeatState; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'missed', label: 'Missed' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
];

type ComposeState = {
  visible: boolean;
  beat?: any;
  type: 'text' | 'photo' | 'voice';
  text: string;
  photoUri?: string;
};

export default function BeatsScreen() {
  useTrackPageView('beats');
  const [tab, setTab] = useState<BeatState>('active');
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState<ComposeState>({
    visible: false,
    type: 'text',
    text: '',
  });
  const [detail, setDetail] = useState<any | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<any | null>(null);
  const [confirmMiss, setConfirmMiss] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.getBeats(tab);
      setBeats(res?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Lifecycle actions ─────────────────────────────────────
  const startBeat = useCallback(async (beat: any) => {
    setBusy(true);
    try {
      await api.startBeat(beat.otherUser?.id ?? beat.matchedUserId);
      setCompose({ visible: true, beat, type: 'text', text: '' });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const openCompose = useCallback((beat: any) => {
    setCompose({ visible: true, beat, type: 'text', text: '' });
  }, []);

  const submitCompose = useCallback(async () => {
    if (!compose.beat) return;
    const content =
      compose.type === 'photo'
        ? compose.photoUri ?? ''
        : compose.text.trim();
    if (!content) {
      toast.error('Please add content');
      return;
    }
    setBusy(true);
    try {
      await api.completeBeat(compose.beat.id, compose.type, content);
      toast.success('Beat completed');
      setCompose({ visible: false, type: 'text', text: '' });
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [compose, load]);

  const missBeat = useCallback(async () => {
    if (!confirmMiss) return;
    try {
      await api.missBeat(confirmMiss.id);
      toast.success('Marked missed');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfirmMiss(null);
    }
  }, [confirmMiss, load]);

  const expireBeat = useCallback(async (beat: any) => {
    try {
      await api.expireBeat(beat.id);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [load]);

  const restoreBeat = useCallback(async (beat: any) => {
    try {
      await api.restoreBeat(beat.id);
      toast.success('Restored');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [load]);

  const archiveBeat = useCallback(async () => {
    if (!confirmArchive) return;
    try {
      await api.archiveBeat(confirmArchive.id);
      toast.success('Archived');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfirmArchive(null);
    }
  }, [confirmArchive, load]);

  // ─── Event actions ─────────────────────────────────────────
  const eventAction = useCallback(
    async (
      event: any,
      action:
        | 'view'
        | 'replay'
        | 'save'
        | 'unsave'
        | 'screenshot'
        | 'download',
    ) => {
      try {
        switch (action) {
          case 'view':
            await api.viewBeatEvent(event.id);
            break;
          case 'replay':
            await api.replayBeatEvent(event.id);
            break;
          case 'save':
            await api.saveBeatEvent(event.id);
            toast.success('Saved');
            break;
          case 'unsave':
            await api.unsaveBeatEvent(event.id);
            toast.success('Removed');
            break;
          case 'screenshot':
            await api.screenshotBeatEvent(event.id);
            break;
          case 'download':
            await api.downloadBeatEvent(event.id);
            toast.success('Download queued');
            break;
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [],
  );

  // ─── Render helpers ────────────────────────────────────────
  const renderRow = useCallback(
    ({ item }: { item: any }) => {
      const isActive = tab === 'active';
      const isMissed = tab === 'missed';
      const isCompleted = tab === 'completed';
      const isArchived = tab === 'archived';
      return (
        <Pressable
          testID={`beat-row-${item.id}`}
          onPress={() => setDetail(item)}
          style={styles.row}>
          <View style={styles.avatar} />
          <View style={styles.body}>
            <Text style={styles.name}>
              {item.otherUser?.displayName ?? 'Match'}
            </Text>
            <Text style={styles.prompt} numberOfLines={2}>
              {item.prompt?.text ?? item.promptText ?? 'Daily prompt'}
            </Text>
            <Text style={styles.meta}>
              {item.count ?? 0} beat{item.count === 1 ? '' : 's'} ·{' '}
              {item.state ?? tab}
              {item.expiresAt
                ? ` · ${formatRemaining(item.expiresAt)}`
                : ''}
            </Text>
          </View>
          <View style={styles.rowActions}>
            {isActive ? (
              <ActionChip
                testID={`beat-start-${item.id}`}
                label={item.count ? 'Continue' : 'Start'}
                onPress={() => (item.count ? openCompose(item) : startBeat(item))}
              />
            ) : null}
            {isMissed ? (
              <ActionChip
                testID={`beat-restore-${item.id}`}
                label="Restore"
                onPress={() => restoreBeat(item)}
              />
            ) : null}
            {isCompleted ? (
              <ActionChip
                testID={`beat-archive-${item.id}`}
                label="Archive"
                onPress={() => setConfirmArchive(item)}
                ghost
              />
            ) : null}
            {isArchived ? (
              <ActionChip
                testID={`beat-restore-arc-${item.id}`}
                label="Restore"
                onPress={() => restoreBeat(item)}
              />
            ) : null}
          </View>
        </Pressable>
      );
    },
    [tab, openCompose, restoreBeat, startBeat],
  );

  return (
    <SafeAreaView style={styles.wrap} testID="beats-screen">
      <Text style={styles.title}>Beats</Text>
      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            testID={`beats-tab-${t.key}`}
            onPress={() => setTab(t.key)}
            style={[styles.tabBtn, tab === t.key && styles.tabActive]}>
            <Text
              style={
                tab === t.key ? styles.tabActiveText : styles.tabText
              }>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <View style={styles.center} testID="beats-loading">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <EmptyState
          title="Couldn't load beats"
          message={error}
          actionLabel="Retry"
          onAction={load}
        />
      ) : beats.length === 0 ? (
        <EmptyState
          title={`No ${tab} beats`}
          message="Check other tabs or come back later."
        />
      ) : (
        <FlatList
          data={beats}
          keyExtractor={(b: any) => b.id}
          renderItem={renderRow}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      {/* Compose sheet */}
      <Modal
        visible={compose.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setCompose({ visible: false, type: 'text', text: '' })
        }>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Compose your beat</Text>
            <View style={styles.typeRow}>
              {(['text', 'photo', 'voice'] as const).map(t => (
                <Pressable
                  key={t}
                  testID={`compose-type-${t}`}
                  onPress={() => setCompose(c => ({ ...c, type: t }))}
                  style={[
                    styles.pill,
                    compose.type === t && styles.pillActive,
                  ]}>
                  <Text
                    style={
                      compose.type === t
                        ? styles.pillActiveText
                        : styles.pillText
                    }>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            {compose.type === 'text' ? (
              <TextInput
                testID="compose-text"
                placeholder="Your reply…"
                placeholderTextColor="#888"
                value={compose.text}
                onChangeText={t => setCompose(c => ({ ...c, text: t }))}
                style={styles.textArea}
                multiline
              />
            ) : compose.type === 'photo' ? (
              <View style={{ marginTop: 12 }}>
                <MediaPicker
                  onPicked={uri => setCompose(c => ({ ...c, photoUri: uri }))}
                  label={compose.photoUri ? 'Change photo' : 'Pick a photo'}
                />
                {compose.photoUri ? (
                  <Text style={styles.meta}>Selected: {compose.photoUri}</Text>
                ) : null}
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.meta}>Voice capture coming soon.</Text>
                <TextInput
                  testID="compose-voice-caption"
                  placeholder="Caption…"
                  placeholderTextColor="#888"
                  value={compose.text}
                  onChangeText={t => setCompose(c => ({ ...c, text: t }))}
                  style={styles.textArea}
                  multiline
                />
              </View>
            )}
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() =>
                  setCompose({ visible: false, type: 'text', text: '' })
                }
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="compose-submit"
                onPress={submitCompose}
                disabled={busy}
                style={[
                  styles.sheetBtn,
                  styles.sheetBtnPrimary,
                  busy && { opacity: 0.5 },
                ]}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sheetBtnPrimaryText}>Send beat</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Beat detail sheet */}
      <Modal
        visible={!!detail}
        transparent
        animationType="slide"
        onRequestClose={() => setDetail(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {detail?.otherUser?.displayName ?? 'Beat'}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {(detail?.events ?? []).map((ev: any) => (
                <View key={ev.id} style={styles.event}>
                  <Text style={styles.eventTitle}>
                    {ev.author?.displayName ?? 'Someone'} · {ev.type}
                  </Text>
                  <Text style={styles.eventContent}>
                    {ev.content ?? ev.text ?? '(no content)'}
                  </Text>
                  <View style={styles.eventActions}>
                    <ActionChip
                      testID={`event-view-${ev.id}`}
                      label="View"
                      onPress={() => eventAction(ev, 'view')}
                      ghost
                    />
                    <ActionChip
                      testID={`event-replay-${ev.id}`}
                      label="Replay"
                      onPress={() => eventAction(ev, 'replay')}
                      ghost
                    />
                    <ActionChip
                      testID={`event-save-${ev.id}`}
                      label={ev.saved ? 'Unsave' : 'Save'}
                      onPress={() =>
                        eventAction(ev, ev.saved ? 'unsave' : 'save')
                      }
                      ghost
                    />
                    <ActionChip
                      testID={`event-screenshot-${ev.id}`}
                      label="Screenshot"
                      onPress={() => eventAction(ev, 'screenshot')}
                      ghost
                    />
                    <ActionChip
                      testID={`event-download-${ev.id}`}
                      label="Download"
                      onPress={() => eventAction(ev, 'download')}
                      ghost
                    />
                  </View>
                </View>
              ))}
              {(!detail?.events || detail.events.length === 0) && (
                <Text style={styles.meta}>No events yet.</Text>
              )}
            </ScrollView>
            <View style={styles.sheetActions}>
              {tab === 'active' ? (
                <>
                  <Pressable
                    testID="detail-miss"
                    onPress={() => setConfirmMiss(detail)}
                    style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                    <Text style={styles.sheetBtnGhostText}>Miss</Text>
                  </Pressable>
                  <Pressable
                    testID="detail-expire"
                    onPress={() => {
                      expireBeat(detail);
                      setDetail(null);
                    }}
                    style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                    <Text style={styles.sheetBtnGhostText}>Expire</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                onPress={() => setDetail(null)}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!confirmArchive}
        title="Archive this beat?"
        message="It'll move out of your active list."
        confirmLabel="Archive"
        onCancel={() => setConfirmArchive(null)}
        onConfirm={archiveBeat}
      />
      <ConfirmDialog
        visible={!!confirmMiss}
        title="Mark as missed?"
        message="This ends the streak."
        confirmLabel="Yes, mark"
        danger
        onCancel={() => setConfirmMiss(null)}
        onConfirm={missBeat}
      />
    </SafeAreaView>
  );
}

function ActionChip({
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
      style={[styles.chip, ghost && styles.chipGhost]}>
      <Text style={ghost ? styles.chipGhostText : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function formatRemaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 16,
    color: '#111',
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tabActive: { backgroundColor: '#111', borderColor: '#111' },
  tabText: { fontSize: 12, color: '#333', fontWeight: '600' },
  tabActiveText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    padding: 12,
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
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111' },
  prompt: { fontSize: 13, color: '#333', marginTop: 2 },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#111',
    borderRadius: 8,
  },
  chipGhost: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  chipGhostText: { color: '#111', fontWeight: '600', fontSize: 12 },
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
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    minHeight: 100,
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
  sheetBtnGhost: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  sheetBtnGhostText: { color: '#111', fontWeight: '600' },
  event: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  eventTitle: { fontSize: 12, color: '#666', fontWeight: '700' },
  eventContent: { fontSize: 14, marginTop: 6, color: '#111' },
  eventActions: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
});
