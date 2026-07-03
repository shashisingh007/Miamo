// Miamo Mobile — Feed (posts).
// Web parity: services/web/src/app/(main)/feed/page.tsx.
//
// - Pull-to-refresh feed of posts (api.getFeed).
// - Per-post: react, comment, edit-own (inline), delete-own (ConfirmDialog).
// - Compose FAB → api.createPost with optional media (MediaPicker).
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import ConfirmDialog from '@components/ConfirmDialog';
import MediaPicker from '@components/MediaPicker';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

type PostVisibility = 'public' | 'matches' | 'friends';
const VISIBILITY: PostVisibility[] = ['public', 'matches', 'friends'];

export default function FeedScreen() {
  useTrackPageView('feed');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsFor, setCommentsFor] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingFor, setEditingFor] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeMedia, setComposeMedia] = useState<string | null>(null);
  const [composeVis, setComposeVis] = useState<PostVisibility>('public');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.getFeed();
      setPosts(res?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const react = useCallback(async (post: any) => {
    try {
      await api.reactToPost(post.id, 'like');
      setPosts(prev =>
        prev.map(p =>
          p.id === post.id
            ? { ...p, reactionCount: (p.reactionCount ?? 0) + 1 }
            : p,
        ),
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const openComments = useCallback(async (post: any) => {
    setCommentsFor(post);
    try {
      const res: any = await api.getPostComments(post.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const submitComment = useCallback(async () => {
    if (!commentsFor || !commentDraft.trim()) return;
    try {
      await api.commentOnPost(commentsFor.id, commentDraft.trim());
      setCommentDraft('');
      const res: any = await api.getPostComments(commentsFor.id);
      setComments(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [commentsFor, commentDraft]);

  const submitEdit = useCallback(async () => {
    if (!editingFor || !editDraft.trim()) return;
    try {
      await api.editPost(editingFor.id, { content: editDraft.trim() });
      toast.success('Updated');
      setEditingFor(null);
      setEditDraft('');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [editingFor, editDraft, load]);

  const submitDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await api.deletePost(deleteConfirm.id);
      toast.success('Deleted');
      setPosts(prev => prev.filter(p => p.id !== deleteConfirm.id));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm]);

  const submitCompose = useCallback(async () => {
    if (!composeText.trim() && !composeMedia) {
      toast.error('Say something first');
      return;
    }
    try {
      await api.createPost({
        content: composeText.trim(),
        mediaUrl: composeMedia ?? undefined,
        visibility: composeVis,
      });
      toast.success('Posted');
      setComposeOpen(false);
      setComposeText('');
      setComposeMedia(null);
      setComposeVis('public');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [composeText, composeMedia, composeVis, load]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.center} testID="feed-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Couldn't load feed"
        message={error}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  return (
    <SafeAreaView style={styles.wrap} testID="feed-screen">
      <FlatList
        data={posts}
        keyExtractor={(p: any) => p.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        ListEmptyComponent={
          <EmptyState
            title="No posts yet"
            actionLabel="Refresh"
            onAction={load}
          />
        }
        renderItem={({ item }: any) => (
          <View style={styles.card} testID={`feed-post-${item.id}`}>
            <View style={styles.headerRow}>
              <View style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.author}>
                  {item.author?.displayName ?? 'Someone'}
                </Text>
                <Text style={styles.timestamp}>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : ''}
                </Text>
              </View>
              {item.canEdit ? (
                <Pressable
                  testID={`feed-edit-${item.id}`}
                  onPress={() => {
                    setEditingFor(item);
                    setEditDraft(item.content ?? '');
                  }}
                  style={styles.chipGhost}>
                  <Text style={styles.chipGhostText}>Edit</Text>
                </Pressable>
              ) : null}
              {item.canDelete ? (
                <Pressable
                  testID={`feed-delete-${item.id}`}
                  onPress={() => setDeleteConfirm(item)}
                  style={[styles.chipGhost, { marginLeft: 6 }]}>
                  <Text style={styles.chipGhostText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.content}>{item.content}</Text>
            {item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={styles.media} />
            ) : null}
            <View style={styles.actionsRow}>
              <Pressable
                testID={`feed-like-${item.id}`}
                onPress={() => react(item)}
                style={styles.chip}>
                <Text style={styles.chipText}>
                  ♥ {item.reactionCount ?? 0}
                </Text>
              </Pressable>
              <Pressable
                testID={`feed-comment-${item.id}`}
                onPress={() => openComments(item)}
                style={styles.chip}>
                <Text style={styles.chipText}>
                  💬 {item.commentCount ?? 0}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Pressable
        testID="feed-create"
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
              ListEmptyComponent={
                <Text style={styles.metaCenter}>No comments.</Text>
              }
            />
            <TextInput
              testID="feed-comment-input"
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
                testID="feed-comment-submit"
                onPress={submitComment}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit */}
      <Modal
        visible={!!editingFor}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingFor(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Edit post</Text>
            <TextInput
              testID="feed-edit-input"
              value={editDraft}
              onChangeText={setEditDraft}
              style={styles.input}
              multiline
            />
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setEditingFor(null)}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="feed-edit-submit"
                onPress={submitEdit}
                style={[styles.sheetBtn, styles.sheetBtnPrimary]}>
                <Text style={styles.sheetBtnPrimaryText}>Save</Text>
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
            <Text style={styles.sheetTitle}>New post</Text>
            <TextInput
              testID="feed-compose-text"
              value={composeText}
              onChangeText={setComposeText}
              placeholder="What's on your mind?"
              placeholderTextColor="#888"
              style={styles.input}
              multiline
            />
            <MediaPicker
              onPicked={setComposeMedia}
              label={composeMedia ? 'Change photo' : 'Add photo (optional)'}
            />
            <Text style={styles.section}>Visibility</Text>
            <View style={styles.pillRow}>
              {VISIBILITY.map(v => (
                <Pressable
                  key={v}
                  testID={`feed-vis-${v}`}
                  onPress={() => setComposeVis(v)}
                  style={[
                    styles.pill,
                    composeVis === v && styles.pillActive,
                  ]}>
                  <Text
                    style={
                      composeVis === v
                        ? styles.pillActiveText
                        : styles.pillText
                    }>
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setComposeOpen(false)}
                style={[styles.sheetBtn, styles.sheetBtnGhost]}>
                <Text style={styles.sheetBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="feed-post"
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
        onConfirm={submitDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f7f7f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ddd',
  },
  author: { fontSize: 14, fontWeight: '700', color: '#111' },
  timestamp: { fontSize: 11, color: '#888', marginTop: 2 },
  content: { fontSize: 14, color: '#111', lineHeight: 20 },
  media: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#ddd',
  },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  chipText: { color: '#111', fontWeight: '600', fontSize: 12 },
  chipGhost: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipGhostText: { color: '#333', fontWeight: '600', fontSize: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
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
  section: { fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 6, color: '#333' },
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
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff' },
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
  commentAuthor: { fontWeight: '700', color: '#111', fontSize: 13 },
  commentBody: { fontSize: 14, color: '#333', marginTop: 4 },
  metaCenter: { color: '#666', textAlign: 'center', padding: 20 },
});
