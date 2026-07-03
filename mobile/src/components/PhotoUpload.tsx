// Miamo Mobile — PhotoUpload.
// RN-only helper that wraps expo-image-picker + api.uploadPhoto. The picker
// is loaded dynamically so the app still boots if the package isn't
// installed yet — in that case pressing the button surfaces a friendly
// error. On success, `onUpload({ url, id })` fires with the server response.
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, StyleSheet, Alert } from 'react-native';

import { api, ApiError } from '../lib/api';

export interface PhotoUploadResult {
  url: string;
  id: string;
}

export interface PhotoEntry {
  id?: string;
  url: string;
}

interface Props {
  /** Fires once per successful upload. */
  onUpload?: (result: PhotoUploadResult) => void;
  /** Alias for `onUpload` — used by Onboarding/ProfileEdit. */
  onUploaded?: (result: PhotoEntry) => void;
  onError?: (err: Error) => void;
  maxSizeMB?: number;
  /** Optional custom label for the picker button. */
  label?: string;
  /** Optional preview URI. When present, shown above the button. */
  previewUri?: string | null;
  /** Optional gallery preview. */
  photos?: PhotoEntry[];
  /** Callback invoked when the user removes an existing photo. */
  onRemove?: (id?: string) => void | Promise<void>;
  /** Cap on gallery size. Advisory — the picker button becomes a no-op when reached. */
  max?: number;
  /** Single-photo mode (e.g. selfie verification). */
  single?: boolean;
}

const DEFAULT_MAX_MB = 5;

function tryRequire<T = any>(name: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(name) as T;
  } catch {
    return null;
  }
}

export function PhotoUpload({
  onUpload,
  onUploaded,
  onError,
  maxSizeMB = DEFAULT_MAX_MB,
  label = 'Choose photo',
  previewUri,
  photos,
  onRemove,
  max,
  single,
}: Props) {
  void single; // reserved for future single-shot camera flow
  const galleryFull = !!(max && photos && photos.length >= max);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const pickAndUpload = async () => {
    setError(null);
    const ImagePicker = tryRequire<any>('expo-image-picker');
    if (!ImagePicker) {
      const msg = 'expo-image-picker is not installed';
      setError(msg);
      onError?.(new Error(msg));
      Alert.alert('Cannot pick photo', 'Please install expo-image-picker.');
      return;
    }

    // ─── Permission ───────────────────────────────
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm?.status && perm.status !== 'granted') {
        const msg = 'Photo library permission denied';
        setError(msg);
        onError?.(new Error(msg));
        return;
      }
    } catch (e) {
      // Permission request unavailable — assume granted and let the picker
      // itself gate the flow.
    }

    // ─── Launch picker ────────────────────────────
    let result: any;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
    } catch (e) {
      const msg = (e as Error).message || 'Photo picker failed';
      setError(msg);
      onError?.(new Error(msg));
      return;
    }
    if (result?.canceled) return;

    const asset = result?.assets?.[0] ?? result; // handle both new + legacy shapes
    const uri: string | undefined = asset?.uri;
    if (!uri) {
      const msg = 'No photo selected';
      setError(msg);
      return;
    }

    // ─── Size guard ───────────────────────────────
    if (asset?.fileSize && maxSizeMB && asset.fileSize > maxSizeMB * 1024 * 1024) {
      const msg = `Photo is larger than ${maxSizeMB}MB`;
      setError(msg);
      onError?.(new Error(msg));
      return;
    }

    setLocalPreview(uri);
    setBusy(true);

    // ─── FormData upload ──────────────────────────
    try {
      const name = uri.split('/').pop() || `upload-${Date.now()}.jpg`;
      const extMatch = /\.([a-zA-Z0-9]+)$/.exec(name);
      const ext = (extMatch?.[1] || 'jpg').toLowerCase();
      const mime =
        asset?.mimeType ||
        (ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg');
      const fd = new FormData();
      // RN FormData accepts { uri, name, type } — the fetch layer streams it
      // as multipart/form-data with a boundary set automatically. TS's DOM
      // FormData typing doesn't know about this RN extension, so we cast.
      fd.append('photo', { uri, name, type: mime } as unknown as Blob);

      const res: any = await api.uploadPhoto(fd);
      // Server response shape varies; tolerate a few common shapes.
      const url = res?.data?.url || res?.url || res?.data?.photo?.url || res?.photo?.url;
      const id = res?.data?.id || res?.id || res?.data?.photo?.id || res?.photo?.id;
      if (!url || !id) throw new Error('Upload returned no url/id');
      onUpload?.({ url, id });
      onUploaded?.({ url, id });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message || 'Upload failed';
      setError(msg);
      onError?.(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const displayPreview = localPreview || previewUri;
  const showGallery = Array.isArray(photos);
  const btnDisabled = busy || galleryFull;
  const btnLabel = galleryFull
    ? `Max ${max} photos`
    : busy
      ? 'Uploading…'
      : label;

  return (
    <View style={styles.wrap}>
      {showGallery ? (
        <View style={styles.gallery}>
          {photos!.map((p) => (
            <View key={p.id ?? p.url} style={styles.thumbWrap}>
              <Image source={{ uri: p.url }} style={styles.thumb} resizeMode="cover" />
              {onRemove ? (
                <Pressable
                  onPress={() => onRemove(p.id)}
                  accessibilityLabel="Remove photo"
                  style={styles.thumbRemove}
                  hitSlop={8}
                >
                  <Text style={styles.thumbRemoveText}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : displayPreview ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: displayPreview }} style={styles.preview} resizeMode="cover" />
          {busy ? (
            <View style={styles.previewOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={pickAndUpload}
        disabled={btnDisabled}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, btnDisabled && styles.btnBusy]}
        accessibilityRole="button"
        accessibilityState={{ disabled: btnDisabled, busy }}
      >
        {busy ? (
          <>
            <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
            <Text style={styles.btnText}>{btnLabel}</Text>
          </>
        ) : (
          <Text style={styles.btnText}>{btnLabel}</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const ROSE = '#e85d75';

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  previewWrap: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
    position: 'relative',
  },
  preview: { width: '100%', height: '100%' },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: ROSE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnBusy: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  spinner: { marginRight: 8 },
  error: { color: '#e11d48', fontSize: 12 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
});

export default PhotoUpload;
