// Miamo Mobile — Videos (short vertical clips).
// Web parity: services/web/src/app/(main)/videos/page.tsx.
//
// Renders a vertical FlatList of short videos. Each video row supports
// play, view-tracking, react, and comment. A "+" FAB opens the create sheet.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import MediaPicker from '@components/MediaPicker';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

const { height } = Dimensions.get('window');

export default function VideosScreen() {
  useTrackPageView('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMedia, setComposeMedia] = useState<string | null>(null);
  const [composeTitle, setComposeTitle] = useState('');
  const enteredAt = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.getVideos();
      setVideos(res?.data ?? []);
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

  const onViewable = useRef(({ viewableItems }: any) => {
    const now = Date.now();
    (viewableItems || []).forEach((v: any) => {
      const id = v.item?.id;
      if (id && !enteredAt.current[id]) {
        enteredAt.current[id] = now;
      }
    });
    Object.entries(enteredAt.current).forEach(([id, t]) => {
      const stillVisible = (viewableItems || []).some(
        (v: any) => v.item?.id === id,
      );
      if (!stillVisible) {
        delete enteredAt.current[id];
        api.viewVideo(id).catch(() => undefined);
      }
    });
  }).current;

  const react = useCallback(async (v: any, type: string) => {
    try {
      await (api as any).reactToVideo?.(v.id, type);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const openComments = useCallback(async (v: any) => {
    setCommentsFor(v);
    try {
      const res: any = await (api as any).getVideoComments?.(v.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const submitComment = useCallback(async () => {
    if (!commentsFor || !commentDraft.trim()) return;
    try {
      await (api as any).commentOnVideo?.(commentsFor.id, commentDraft.trim());
      setCommentDraft('');
      const res: any = await (api as any).getVideoComments?.(commentsFor.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [commentsFor, commentDraft]);

  const createVideo = useCallback(async () => {
    if (!composeMedia) {
      toast.error('Pick media first');
      return;
    }
    try {
      await (api as any).createVideo?.({
        mediaUrl: composeMedia,
        title: composeTitle,
      });
      toast.success('Video posted');
      setComposeOpen(false);
      setComposeMedia(null);
      setComposeTitle('');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [composeMedia, composeTitle, load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="videos-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) return <EmptyState title="Couldn't load videos" message={error} />;
  if (videos.length === 0) return <EmptyState title="No videos yet" />;

  return (
    <SafeAreaView style={styles.wrap} testID="videos-screen">
      <FlatList
        data={videos}
        keyExtractor={(v: any) => v.id}
        pagingEnabled
        snapToInterval={height - 120}
        decelerationRate="fast"
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 55 }}
        renderItem={({ item }) => (
          <View style={styles.card} testID={`video-${item.id}`}>
            {item.thumbnailUrl || item.mediaUrl ? (
              <Image
                source={{ uri: item.thumbnailUrl ?? item.mediaUrl }}
                style={styles.media}
              />
            ) : (
              <View style={styles.media} />
            )}
            <View style={styles.info}>
              <Text style={styles.title}>{item.title ?? 'Untitled'}</Text>
              <Text style={styles.meta}>
                {item.viewCount ?? 0} views · {item.reactionCount ?? 0} reactions
              </Text>
              <View style={styles.actions}>
                <Pressable
                  testID={`video-like-${item.id}`}
                  onPress={() => react(item, 'like')}
                  style={styles.chip}>
                  <Text style={styles.chipText}>♥ Like</Text>
                </Pressable>
                <Pressable
                  testID={`video-comment-${item.id}`}
                  onPress={() => openComments(item)}
                  style={styles.chip}>
                  <Text style={styles.chipText}>💬 Comment</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
      <Pressable
        testID="videos-create"
        onPress={() => setComposeOpen(true)}
        style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Comments */}
      <Modal
        visible={!!commentsFor}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentsFor(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <FlatList
              data={comments}
              keyExtractor={(c: any) => c.id}
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Text style={styles.commentAuthor}>
                    {item.author?.displayName ?? 'Someone'}
                  </Text>
                  <Text style={styles.commentBody}>{item.content}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.metaCenter}>No comments.</Text>}
            />
            <TextInput
              testID="video-comment-input"
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
                testID="video-comment-submit"
                onPress={submitComment}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Compose */}
      <Modal
        visible={composeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New video</Text>
            <MediaPicker
              onPicked={setComposeMedia}
              label={composeMedia ? 'Change media' : 'Pick media'}
            />
            <TextInput
              testID="video-title"
              value={composeTitle}
              onChangeText={setComposeTitle}
              placeholder="Title"
              placeholderTextColor="#888"
              style={styles.input}
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setComposeOpen(false)}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="video-post"
                onPress={createVideo}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { height: height - 120, backgroundColor: '#111' },
  media: { flex: 1, backgroundColor: '#222' },
  info: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  title: { color: '#fff', fontWeight: '800', fontSize: 15 },
  meta: { color: '#ccc', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  commentAuthor: { fontWeight: '700', color: '#111', fontSize: 13 },
  commentBody: { fontSize: 14, color: '#333', marginTop: 4 },
  metaCenter: { color: '#666', textAlign: 'center', padding: 20 },
});
