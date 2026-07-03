// Miamo Mobile — Stories (24-hour ephemeral posts).
// Web parity: services/web/src/app/(main)/stories/page.tsx.
//
// Presents:
//   • Story rings at top — my stories + friends' stories (getStories,
//     getMyStories).
//   • Full-screen viewer with tap-to-advance, likes, reactions, comments.
//   • Owner-only affordances: viewers list, likes list, delete, post-to-feed.
//   • Compose flow: media picker → createStory.
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import MediaPicker from '@components/MediaPicker';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

const { width } = Dimensions.get('window');
const REACTIONS = ['❤️', '🔥', '😂', '😍', '😮', '🙌'];

export default function StoriesScreen() {
  useTrackPageView('stories');
  const [stories, setStories] = useState<any[]>([]);
  const [myStories, setMyStories] = useState<any[]>([]);
  const [viewer, setViewer] = useState<{ list: any[]; idx: number } | null>(
    null,
  );
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMedia, setComposeMedia] = useState<string | null>(null);
  const [composeCaption, setComposeCaption] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [likesOpen, setLikesOpen] = useState(false);
  const [likes, setLikes] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, mine] = await Promise.all([
        api.getStories(),
        (api as any).getMyStories
          ? (api as any).getMyStories().catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setStories((s as any)?.data ?? []);
      setMyStories((mine as any)?.data ?? []);
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

  // ─── Viewer control ────────────────────────────────────────
  const openViewer = useCallback(async (list: any[], idx = 0) => {
    setViewer({ list, idx });
    if (list[idx]?.id) {
      try {
        await api.viewStory(list[idx].id);
      } catch {
        // best-effort
      }
    }
  }, []);

  const advance = useCallback(async () => {
    if (!viewer) return;
    const nextIdx = viewer.idx + 1;
    if (nextIdx >= viewer.list.length) {
      setViewer(null);
      return;
    }
    setViewer({ ...viewer, idx: nextIdx });
    try {
      await api.viewStory(viewer.list[nextIdx].id);
    } catch {
      // best-effort
    }
  }, [viewer]);

  const currentStory = viewer ? viewer.list[viewer.idx] : null;

  // ─── Actions ───────────────────────────────────────────────
  const like = useCallback(async () => {
    if (!currentStory) return;
    try {
      await (api as any).likeStory?.(currentStory.id);
      toast.success('Liked');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [currentStory]);

  const react = useCallback(
    async (r: string) => {
      if (!currentStory) return;
      try {
        await (api as any).reactToStory?.(currentStory.id, r);
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [currentStory],
  );

  const openComments = useCallback(async () => {
    if (!currentStory) return;
    setCommentsOpen(true);
    try {
      const res: any = await (api as any).getStoryComments?.(currentStory.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [currentStory]);

  const submitComment = useCallback(async () => {
    if (!currentStory || !commentDraft.trim()) return;
    try {
      await (api as any).commentOnStory?.(currentStory.id, commentDraft.trim());
      setCommentDraft('');
      const res: any = await (api as any).getStoryComments?.(currentStory.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [currentStory, commentDraft]);

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!currentStory) return;
      try {
        await (api as any).deleteStoryComment?.(currentStory.id, commentId);
        setComments(prev => prev.filter(c => c.id !== commentId));
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [currentStory],
  );

  const openViewers = useCallback(async () => {
    if (!currentStory) return;
    setViewersOpen(true);
    try {
      const res: any = await (api as any).getStoryViewers?.(currentStory.id);
      setViewers(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [currentStory]);

  const openLikes = useCallback(async () => {
    if (!currentStory) return;
    setLikesOpen(true);
    try {
      const res: any = await (api as any).getStoryLikes?.(currentStory.id);
      setLikes(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [currentStory]);

  const postToFeed = useCallback(async () => {
    if (!currentStory) return;
    try {
      await (api as any).postStoryToFeed?.(currentStory.id);
      toast.success('Posted to feed');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [currentStory]);

  const deleteStory = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await (api as any).deleteStory?.(deleteConfirm.id);
      toast.success('Story deleted');
      setViewer(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, load]);

  const createStory = useCallback(async () => {
    if (!composeMedia) {
      toast.error('Pick media first');
      return;
    }
    try {
      await api.createStory({ mediaUrl: composeMedia, caption: composeCaption });
      toast.success('Story posted');
      setComposeOpen(false);
      setComposeMedia(null);
      setComposeCaption('');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [composeMedia, composeCaption, load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="stories-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) return <EmptyState title="Couldn't load stories" message={error} />;

  const isOwner = !!currentStory?.isOwner || !!currentStory?.self;

  return (
    <SafeAreaView style={styles.wrap} testID="stories-screen">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Stories</Text>
        <Pressable
          testID="stories-create"
          onPress={() => setComposeOpen(true)}
          style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>
      <ScrollView horizontal contentContainerStyle={styles.rings}>
        {myStories.length > 0 ? (
          <Pressable
            testID="story-mine"
            onPress={() => openViewer(myStories, 0)}
            style={styles.ring}>
            <View style={[styles.ringInner, styles.ringMine]} />
            <Text style={styles.ringLabel}>You</Text>
          </Pressable>
        ) : null}
        {stories.map((s: any) => (
          <Pressable
            key={s.id}
            testID={`story-${s.id}`}
            onPress={() => openViewer([s], 0)}
            style={styles.ring}>
            {s.mediaUrl ? (
              <Image source={{ uri: s.mediaUrl }} style={styles.ringInner} />
            ) : (
              <View style={styles.ringInner} />
            )}
            <Text style={styles.ringLabel} numberOfLines={1}>
              {s.author?.displayName ?? 'Someone'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {stories.length === 0 && myStories.length === 0 ? (
        <EmptyState
          title="No stories yet"
          message="Post the first one or wait for your matches."
        />
      ) : null}

      {/* Viewer */}
      <Modal
        visible={!!viewer}
        animationType="fade"
        transparent
        onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={advance}>
            {currentStory?.mediaUrl ? (
              <Image
                source={{ uri: currentStory.mediaUrl }}
                style={styles.viewerMedia}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.viewerMedia} />
            )}
            <View style={styles.viewerOverlayTop}>
              <Text style={styles.viewerAuthor}>
                {currentStory?.author?.displayName ?? 'You'}
              </Text>
              <Pressable
                testID="viewer-close"
                onPress={() => setViewer(null)}
                style={styles.viewerClose}>
                <Text style={styles.viewerCloseText}>✕</Text>
              </Pressable>
            </View>
            {currentStory?.caption ? (
              <Text style={styles.viewerCaption}>{currentStory.caption}</Text>
            ) : null}
          </Pressable>
          <View style={styles.viewerActions}>
            <Pressable testID="viewer-like" onPress={like} style={styles.viewerBtn}>
              <Text style={styles.viewerBtnText}>♥</Text>
            </Pressable>
            <Pressable
              testID="viewer-comments"
              onPress={openComments}
              style={styles.viewerBtn}>
              <Text style={styles.viewerBtnText}>💬</Text>
            </Pressable>
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              {REACTIONS.map(r => (
                <Pressable
                  key={r}
                  testID={`viewer-react-${r}`}
                  onPress={() => react(r)}
                  style={styles.viewerReact}>
                  <Text style={{ fontSize: 20 }}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {isOwner ? (
              <View style={styles.ownerActions}>
                <OwnerBtn
                  testID="viewer-viewers"
                  label="Viewers"
                  onPress={openViewers}
                />
                <OwnerBtn
                  testID="viewer-likes"
                  label="Likes"
                  onPress={openLikes}
                />
                <OwnerBtn
                  testID="viewer-to-feed"
                  label="To feed"
                  onPress={postToFeed}
                />
                <OwnerBtn
                  testID="viewer-delete"
                  label="Delete"
                  danger
                  onPress={() => setDeleteConfirm(currentStory)}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Comments */}
      <Modal
        visible={commentsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <FlatList
              data={comments}
              keyExtractor={(c: any) => c.id}
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentAuthor}>
                      {item.author?.displayName ?? 'Someone'}
                    </Text>
                    <Text style={styles.commentBody}>{item.content}</Text>
                  </View>
                  {item.canDelete ? (
                    <Pressable
                      testID={`delete-comment-${item.id}`}
                      onPress={() => deleteComment(item.id)}>
                      <Text style={styles.deleteX}>✕</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.meta}>No comments.</Text>}
            />
            <TextInput
              testID="story-comment-input"
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Add a comment…"
              placeholderTextColor="#888"
              style={styles.input}
              multiline
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setCommentsOpen(false)}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Close</Text>
              </Pressable>
              <Pressable
                testID="story-comment-submit"
                onPress={submitComment}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Viewers list */}
      <Modal
        visible={viewersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setViewersOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Viewers</Text>
            <FlatList
              data={viewers}
              keyExtractor={(v: any) => v.id ?? v.userId}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Text style={styles.rowName}>
                    {item.displayName ?? 'Someone'}
                  </Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.meta}>No viewers.</Text>}
            />
            <Pressable
              onPress={() => setViewersOpen(false)}
              style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
              <Text style={styles.sheetBtnPrimaryText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Likes list */}
      <Modal
        visible={likesOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLikesOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Likes</Text>
            <FlatList
              data={likes}
              keyExtractor={(v: any) => v.id ?? v.userId}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Text style={styles.rowName}>
                    {item.displayName ?? 'Someone'}
                  </Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.meta}>No likes.</Text>}
            />
            <Pressable
              onPress={() => setLikesOpen(false)}
              style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
              <Text style={styles.sheetBtnPrimaryText}>Close</Text>
            </Pressable>
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
            <Text style={styles.sheetTitle}>New story</Text>
            <MediaPicker
              onPicked={setComposeMedia}
              label={composeMedia ? 'Change media' : 'Pick media'}
            />
            <TextInput
              testID="story-caption"
              placeholder="Caption (optional)"
              placeholderTextColor="#888"
              value={composeCaption}
              onChangeText={setComposeCaption}
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
                testID="story-post"
                onPress={createStory}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!deleteConfirm}
        title="Delete story?"
        message="This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={deleteStory}
        onCancel={() => setDeleteConfirm(null)}
      />
    </SafeAreaView>
  );
}

function OwnerBtn({
  testID,
  label,
  onPress,
  danger,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.ownerBtn, danger && styles.ownerBtnDanger]}>
      <Text style={styles.ownerBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  newBtn: {
    backgroundColor: '#c92244',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: { color: '#fff', fontWeight: '700' },
  rings: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  ring: { alignItems: 'center', width: 76, marginRight: 8 },
  ringInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#ddd',
    borderWidth: 2,
    borderColor: '#c92244',
    marginBottom: 4,
  },
  ringMine: { borderColor: '#111' },
  ringLabel: { fontSize: 11, color: '#333', maxWidth: 72, textAlign: 'center' },
  viewerBackdrop: { flex: 1, backgroundColor: '#000' },
  viewerMedia: { flex: 1, width, backgroundColor: '#111' },
  viewerOverlayTop: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewerAuthor: { color: '#fff', fontWeight: '700' },
  viewerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseText: { color: '#fff' },
  viewerCaption: {
    position: 'absolute',
    bottom: 130,
    left: 20,
    right: 20,
    color: '#fff',
    fontSize: 14,
  },
  viewerActions: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 8,
  },
  viewerBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewerBtnText: { color: '#fff', fontSize: 18 },
  viewerReact: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  ownerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ownerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  ownerBtnDanger: { backgroundColor: '#c92222' },
  ownerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
    marginTop: 12,
    minHeight: 60,
    color: '#111',
    textAlignVertical: 'top',
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
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
  commentRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    alignItems: 'center',
  },
  commentAuthor: { fontWeight: '700', color: '#111', fontSize: 13 },
  commentBody: { fontSize: 14, color: '#333', marginTop: 2 },
  deleteX: { color: '#c92222', fontSize: 16, marginLeft: 8 },
  rowName: { color: '#111', fontWeight: '600' },
  meta: { color: '#666', textAlign: 'center', padding: 20 },
});
