// Miamo Mobile — Creativity (v3.5 reels-first).
// Web parity: services/web/src/app/(main)/creativity/page.tsx.
//
// Tabs:
//   • Reels — full-screen paged FlatList. Right-side action rail (like,
//     comment, save, share, send move, hide, not interested, dislike,
//     report, hide author).
//   • Feed — traditional list.
//   • Categories — filter chip strip → filters feed.
//   • Vault — saved items.
//   • Trending — live + trend rollups.
//
// Floating Spotlight card at top of Reels shows the current spotlight streak
// and links to claim / purchase. Floating "+" opens a compose modal to create
// a new creativity item.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import MediaPicker from '@components/MediaPicker';
import MoveV2Picker from '@components/MoveV2Picker';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const { height: SCREEN_H } = Dimensions.get('window');
const TAB_KEYS = ['reels', 'feed', 'categories', 'vault', 'trending'] as const;
type Tab = (typeof TAB_KEYS)[number];

const REPORT_REASONS = [
  'spam',
  'inappropriate',
  'harassment',
  'nudity',
  'violence',
  'other',
];

export default function CreativityScreen() {
  useTrackPageView('creativity');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [tab, setTab] = useState<Tab>('reels');
  const [reels, setReels] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [vault, setVault] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [live, setLive] = useState<any[]>([]);
  const [spotlight, setSpotlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedIndex, setViewedIndex] = useState(0);
  const [commentsFor, setCommentsFor] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [movePickerFor, setMovePickerFor] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeMedia, setComposeMedia] = useState<string | null>(null);
  const [composeType, setComposeType] = useState<'text' | 'image' | 'video'>(
    'text',
  );

  const viewedTs = useRef<{ [id: string]: number }>({});

  // ─── Load ───────────────────────────────────────────────────
  const loadReels = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.getCreativityReels();
      setReels(res?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      const res: any = await api.getCreativityFeed(params);
      setFeed(res?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  const loadCategories = useCallback(async () => {
    try {
      const res: any = await api.getCreativityCategories();
      setCategories(res?.data ?? []);
    } catch {
      // best-effort
    }
  }, []);

  const loadVault = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.getCreativityVault();
      setVault(res?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    try {
      const [t, l] = await Promise.all([
        api.getCreativityTrends(),
        api.getCreativityLiveTrending(),
      ]);
      setTrending(t?.data ?? []);
      setLive(l?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSpotlight = useCallback(async () => {
    try {
      const res: any = await api.getSpotlight();
      setSpotlight(res?.data ?? null);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    if (tab === 'reels') loadReels();
    if (tab === 'feed') loadFeed();
    if (tab === 'vault') loadVault();
    if (tab === 'trending') loadTrending();
  }, [tab, loadReels, loadFeed, loadVault, loadTrending]);

  useEffect(() => {
    loadCategories();
    loadSpotlight();
  }, [loadCategories, loadSpotlight]);

  useEffect(() => {
    if (tab === 'feed') loadFeed();
  }, [category, tab, loadFeed]);

  // ─── View tracking on reel viewport enter/exit ─────────────
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems?.length) return;
    const item = viewableItems[0].item;
    if (!item?.id) return;
    setViewedIndex(viewableItems[0].index ?? 0);
    // Fire on-enter tracking (best-effort).
    if (!viewedTs.current[item.id]) {
      viewedTs.current[item.id] = Date.now();
    }
    // For items that left, log dwell.
    Object.entries(viewedTs.current).forEach(([id, t]) => {
      const stillVisible = viewableItems.some((v: any) => v.item?.id === id);
      if (!stillVisible) {
        const dwell = Date.now() - (t as number);
        delete viewedTs.current[id];
        api.viewCreativityItem(id, dwell).catch(() => undefined);
      }
    });
  }).current;

  // ─── Actions ───────────────────────────────────────────────
  const act = useCallback(
    async (
      item: any,
      action:
        | 'like'
        | 'save'
        | 'share'
        | 'hide'
        | 'not_interested'
        | 'dislike'
        | 'hide_author',
    ) => {
      try {
        switch (action) {
          case 'like':
            await api.reactToCreativity(item.id, 'like');
            break;
          case 'save':
            await api.saveCreativityItem(item.id);
            toast.success('Saved');
            break;
          case 'share':
            await api.shareCreativityItem(item.id, 'copy');
            toast.success('Shared');
            break;
          case 'hide':
            await api.hideCreativityItem(item.id);
            toast.success('Hidden');
            break;
          case 'not_interested':
            await api.notInterestedCreativityItem(item.id);
            toast.success('Got it');
            break;
          case 'dislike':
            await api.dislikeCreativityItem(item.id);
            break;
          case 'hide_author':
            await api.hideCreativityAuthor(item.author?.id ?? item.authorId);
            toast.success('Author hidden');
            break;
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [],
  );

  const openComments = useCallback(async (item: any) => {
    setCommentsFor(item);
    setCommentsLoading(true);
    try {
      const res: any = await api.getCreativityComments(item.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const submitComment = useCallback(async () => {
    if (!commentsFor || !commentDraft.trim()) return;
    try {
      await api.commentOnCreativity(commentsFor.id, commentDraft.trim());
      setCommentDraft('');
      const res: any = await api.getCreativityComments(commentsFor.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [commentsFor, commentDraft]);

  const submitReport = useCallback(async () => {
    if (!reportFor || !reportReason) return;
    try {
      await api.reportCreativityItem(reportFor.id, reportReason);
      toast.success('Reported');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReportFor(null);
      setReportReason('');
    }
  }, [reportFor, reportReason]);

  const submitDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteCreativityItem(deleteConfirm.id);
      toast.success('Deleted');
      if (tab === 'reels') loadReels();
      if (tab === 'feed') loadFeed();
      if (tab === 'vault') loadVault();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, tab, loadReels, loadFeed, loadVault]);

  const sendMove = useCallback(async (s: { text: string }, itemId: string) => {
    try {
      await api.sendCreativityMove(itemId, s.text);
      toast.success('Move sent');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setMovePickerFor(null);
    }
  }, []);

  const submitCompose = useCallback(async () => {
    if (!composeText.trim() && !composeMedia) return;
    try {
      await api.createCreativityItem({
        type: composeType,
        content: composeText.trim(),
        mediaUrl: composeMedia ?? undefined,
      } as any);
      toast.success('Posted');
      setComposeOpen(false);
      setComposeText('');
      setComposeMedia(null);
      setComposeType('text');
      if (tab === 'reels') loadReels();
      if (tab === 'feed') loadFeed();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [composeType, composeText, composeMedia, tab, loadReels, loadFeed]);

  const claimSpotlight = useCallback(async () => {
    try {
      await api.claimSpotlightStreak();
      toast.success('Spotlight claimed!');
      loadSpotlight();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [loadSpotlight]);

  // ─── Renderers ─────────────────────────────────────────────
  const renderReel = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        onLongPress={() => setDeleteConfirm(item.isSelf ? item : null)}
        style={styles.reel}
        testID={`reel-${item.id}`}>
        {item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.reelMedia} />
        ) : (
          <View style={[styles.reelMedia, { backgroundColor: '#222' }]} />
        )}
        <View style={styles.reelOverlay}>
          <View style={styles.reelMeta}>
            <Text style={styles.reelAuthor}>
              {item.author?.displayName ?? 'Someone'}
            </Text>
            {item.prompt ? (
              <Text style={styles.reelPrompt}>{item.prompt}</Text>
            ) : null}
            {item.content ? (
              <Text style={styles.reelCaption} numberOfLines={3}>
                {item.content}
              </Text>
            ) : null}
          </View>
          <View style={styles.reelActions}>
            <ReelAction
              testID={`reel-like-${item.id}`}
              label="♥"
              onPress={() => act(item, 'like')}
            />
            <ReelAction
              testID={`reel-comment-${item.id}`}
              label="💬"
              onPress={() => openComments(item)}
            />
            <ReelAction
              testID={`reel-save-${item.id}`}
              label="⌘"
              onPress={() => act(item, 'save')}
            />
            <ReelAction
              testID={`reel-share-${item.id}`}
              label="↗"
              onPress={() => act(item, 'share')}
            />
            <ReelAction
              testID={`reel-move-${item.id}`}
              label="✧"
              onPress={() => setMovePickerFor(item.id)}
            />
            <ReelAction
              testID={`reel-hide-${item.id}`}
              label="⨯"
              onPress={() => act(item, 'hide')}
            />
            <ReelAction
              testID={`reel-notint-${item.id}`}
              label="⤫"
              onPress={() => act(item, 'not_interested')}
            />
            <ReelAction
              testID={`reel-dislike-${item.id}`}
              label="⇩"
              onPress={() => act(item, 'dislike')}
            />
            <ReelAction
              testID={`reel-report-${item.id}`}
              label="!"
              onPress={() => setReportFor(item)}
            />
            <ReelAction
              testID={`reel-hide-author-${item.id}`}
              label="👤⨯"
              onPress={() => act(item, 'hide_author')}
            />
          </View>
        </View>
      </Pressable>
    ),
    [act, openComments],
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.feedCard} testID={`feed-${item.id}`}>
        <Text style={styles.author}>{item.author?.displayName ?? 'Someone'}</Text>
        {item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.feedMedia} />
        ) : null}
        <Text style={styles.content}>{item.content ?? ''}</Text>
        <View style={styles.feedActions}>
          <ChipBtn label="♥ Like" onPress={() => act(item, 'like')} />
          <ChipBtn label="💬 Comment" onPress={() => openComments(item)} />
          <ChipBtn label="⌘ Save" onPress={() => act(item, 'save')} />
          <ChipBtn
            label="✧ Move"
            onPress={() => setMovePickerFor(item.id)}
          />
        </View>
      </View>
    ),
    [act, openComments],
  );

  // ─── Body per-tab ──────────────────────────────────────────
  const body = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          title="Couldn't load"
          message={error}
          actionLabel="Retry"
          onAction={() => {
            if (tab === 'reels') loadReels();
            if (tab === 'feed') loadFeed();
            if (tab === 'vault') loadVault();
            if (tab === 'trending') loadTrending();
          }}
        />
      );
    }
    if (tab === 'reels') {
      if (reels.length === 0)
        return (
          <EmptyState
            title="No reels yet"
            actionLabel="Refresh"
            onAction={loadReels}
          />
        );
      return (
        <FlatList
          data={reels}
          keyExtractor={(x: any) => x.id}
          renderItem={renderReel}
          pagingEnabled
          snapToInterval={SCREEN_H - 120}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
          testID="creativity-reels"
        />
      );
    }
    if (tab === 'feed') {
      return (
        <FlatList
          data={feed}
          keyExtractor={(x: any) => x.id}
          renderItem={renderFeedItem}
          ListEmptyComponent={<EmptyState title="Feed is empty" />}
        />
      );
    }
    if (tab === 'categories') {
      return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.section}>Pick a category</Text>
          <View style={styles.pillRow}>
            {categories.map((c: any) => (
              <Pressable
                key={c.id ?? c.name}
                testID={`cat-${c.name ?? c.id}`}
                onPress={() => {
                  setCategory(c.name ?? c.id);
                  setTab('feed');
                }}
                style={[
                  styles.pill,
                  category === (c.name ?? c.id) && styles.pillActive,
                ]}>
                <Text
                  style={
                    category === (c.name ?? c.id)
                      ? styles.pillActiveText
                      : styles.pillText
                  }>
                  {c.name ?? c.id}
                </Text>
              </Pressable>
            ))}
          </View>
          {category ? (
            <Pressable
              testID="cat-clear"
              onPress={() => setCategory(null)}
              style={[styles.pill, { marginTop: 12, alignSelf: 'flex-start' }]}>
              <Text style={styles.pillText}>Clear</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      );
    }
    if (tab === 'vault') {
      return (
        <FlatList
          data={vault}
          keyExtractor={(x: any) => x.id}
          renderItem={renderFeedItem}
          ListEmptyComponent={
            <EmptyState
              title="Vault is empty"
              message="Save creativity items to see them here."
            />
          }
        />
      );
    }
    // trending
    return (
      <ScrollView>
        <Text style={styles.section}>Live</Text>
        {live.length === 0 ? (
          <Text style={styles.meta}>Nothing live right now.</Text>
        ) : (
          live.map((l: any) => (
            <Text key={l.id} style={styles.trendRow}>
              #{l.rank} {l.title ?? l.name}
            </Text>
          ))
        )}
        <Text style={styles.section}>Trending</Text>
        {trending.length === 0 ? (
          <Text style={styles.meta}>No trending topics.</Text>
        ) : (
          trending.map((t: any) => (
            <Text key={t.id} style={styles.trendRow}>
              {t.tag ?? t.name}
            </Text>
          ))
        )}
      </ScrollView>
    );
  }, [
    loading,
    error,
    tab,
    reels,
    feed,
    vault,
    trending,
    live,
    categories,
    category,
    renderReel,
    renderFeedItem,
    onViewableItemsChanged,
    loadReels,
    loadFeed,
    loadVault,
    loadTrending,
  ]);

  return (
    <SafeAreaView style={styles.wrap} testID="creativity-screen">
      {/* Spotlight card (only on reels tab) */}
      {tab === 'reels' && spotlight ? (
        <View style={styles.spotlightCard} testID="spotlight-card">
          <View style={{ flex: 1 }}>
            <Text style={styles.spotlightTitle}>Spotlight</Text>
            <Text style={styles.spotlightMeta}>
              Streak: {spotlight.streak ?? 0} · Rank: {spotlight.rank ?? '—'}
            </Text>
          </View>
          <Pressable
            testID="spotlight-claim"
            onPress={claimSpotlight}
            style={styles.spotlightBtn}>
            <Text style={styles.spotlightBtnText}>Claim</Text>
          </Pressable>
          <Pressable
            testID="spotlight-purchase"
            onPress={() => navigation.navigate('Premium')}
            style={[styles.spotlightBtn, styles.spotlightBtnAlt]}>
            <Text style={styles.spotlightBtnText}>Buy</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabs}>
        {TAB_KEYS.map(t => (
          <Pressable
            key={t}
            testID={`creativity-tab-${t}`}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabActive]}>
            <Text style={tab === t ? styles.tabActiveText : styles.tabText}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Body */}
      <View style={{ flex: 1 }}>{body}</View>

      {/* FAB — compose */}
      <Pressable
        testID="creativity-create"
        onPress={() => setComposeOpen(true)}
        style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Comments modal */}
      <Modal
        visible={!!commentsFor}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsFor(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Comments</Text>
            {commentsLoading ? (
              <ActivityIndicator />
            ) : comments.length === 0 ? (
              <Text style={styles.meta}>No comments yet.</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c: any) => c.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Text style={styles.commentAuthor}>
                      {item.author?.displayName ?? 'Someone'}
                    </Text>
                    <Text style={styles.commentBody}>{item.content}</Text>
                  </View>
                )}
              />
            )}
            <TextInput
              testID="creativity-comment-input"
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Add a comment…"
              placeholderTextColor="#888"
              style={styles.input}
              multiline
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setCommentsFor(null)}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Close</Text>
              </Pressable>
              <Pressable
                testID="creativity-comment-submit"
                onPress={submitComment}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move picker */}
      <Modal
        visible={!!movePickerFor}
        animationType="slide"
        transparent
        onRequestClose={() => setMovePickerFor(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Send a Move</Text>
            {movePickerFor ? (
              <MoveV2Picker
                itemId={movePickerFor}
                onSelect={s => sendMove(s, movePickerFor)}
              />
            ) : null}
            <Pressable
              onPress={() => setMovePickerFor(null)}
              style={[
                styles.sheetBtn,
                styles.sheetBtnGhost,
                { marginTop: 12 },
              ]}>
              <Text style={styles.sheetBtnGhostText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Report reason */}
      <Modal
        visible={!!reportFor}
        animationType="slide"
        transparent
        onRequestClose={() => setReportFor(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Report</Text>
            <View style={styles.pillRow}>
              {REPORT_REASONS.map(r => (
                <Pressable
                  key={r}
                  testID={`report-${r}`}
                  onPress={() => setReportReason(r)}
                  style={[
                    styles.pill,
                    reportReason === r && styles.pillActive,
                  ]}>
                  <Text
                    style={
                      reportReason === r
                        ? styles.pillActiveText
                        : styles.pillText
                    }>
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => {
                  setReportFor(null);
                  setReportReason('');
                }}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="report-submit"
                onPress={submitReport}
                disabled={!reportReason}
                style={[
                  styles.sheetBtn,
                  styles.sheetBtnPrimary,
                  !reportReason && { opacity: 0.5 },
                ]}>
                <Text style={styles.sheetBtnPrimaryText}>Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Compose */}
      <Modal
        visible={composeOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Create</Text>
            <View style={styles.pillRow}>
              {(['text', 'image', 'video'] as const).map(t => (
                <Pressable
                  key={t}
                  testID={`compose-type-${t}`}
                  onPress={() => setComposeType(t)}
                  style={[
                    styles.pill,
                    composeType === t && styles.pillActive,
                  ]}>
                  <Text
                    style={
                      composeType === t
                        ? styles.pillActiveText
                        : styles.pillText
                    }>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            {composeType !== 'text' ? (
              <View style={{ marginTop: 12 }}>
                <MediaPicker
                  onPicked={setComposeMedia}
                  label={composeMedia ? 'Change media' : 'Pick media'}
                />
              </View>
            ) : null}
            <TextInput
              testID="compose-text"
              placeholder={
                composeType === 'text' ? 'Say something…' : 'Caption (optional)'
              }
              placeholderTextColor="#888"
              value={composeText}
              onChangeText={setComposeText}
              style={styles.input}
              multiline
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setComposeOpen(false)}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="compose-submit"
                onPress={submitCompose}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!deleteConfirm}
        title="Delete post?"
        message="This can't be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={submitDelete}
      />
    </SafeAreaView>
  );
}

function ReelAction({
  testID,
  label,
  onPress,
}: {
  testID: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.reelActionBtn}>
      <Text style={styles.reelActionText}>{label}</Text>
    </Pressable>
  );
}

function ChipBtn({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spotlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  spotlightTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  spotlightMeta: { color: '#aaa', fontSize: 12, marginTop: 2 },
  spotlightBtn: {
    backgroundColor: '#c92244',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  spotlightBtnAlt: { backgroundColor: '#333' },
  spotlightBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  tabs: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabActive: { backgroundColor: '#c92244', borderColor: '#c92244' },
  tabText: { color: '#aaa', fontSize: 12, fontWeight: '700' },
  tabActiveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reel: { height: SCREEN_H - 120 },
  reelMedia: { width: '100%', height: '100%' },
  reelOverlay: {
    position: 'absolute',
    inset: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  reelMeta: { flex: 1, justifyContent: 'flex-end' },
  reelAuthor: { color: '#fff', fontWeight: '800', fontSize: 16 },
  reelPrompt: { color: '#eee', fontSize: 13, marginTop: 4 },
  reelCaption: { color: '#ddd', fontSize: 13, marginTop: 6 },
  reelActions: { gap: 8, alignItems: 'center', paddingLeft: 12 },
  reelActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelActionText: { color: '#fff', fontSize: 18 },
  feedCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
  },
  author: { color: '#fff', fontWeight: '700' },
  feedMedia: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#333',
  },
  content: { color: '#ddd', marginTop: 8 },
  feedActions: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  chipText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#c92244',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  section: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 8, marginTop: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#111',
  },
  pillActive: { backgroundColor: '#c92244', borderColor: '#c92244' },
  pillText: { color: '#ddd', fontSize: 12 },
  pillActiveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  meta: { color: '#888', padding: 12 },
  trendRow: {
    color: '#ddd',
    fontSize: 14,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
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
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    marginTop: 12,
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
  commentRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  commentAuthor: { fontWeight: '700', fontSize: 13, color: '#111' },
  commentBody: { fontSize: 14, color: '#333', marginTop: 4 },
});
