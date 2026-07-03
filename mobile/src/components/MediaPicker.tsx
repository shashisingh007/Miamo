// Miamo Mobile — MediaPicker.
// Thin wrapper around expo-image-picker. Presents a button that opens the
// system media library and, on success, hands the local URI back to the
// parent. Upload happens elsewhere (profile-edit or verify screen). Kept
// permission-agnostic — expo-image-picker prompts on iOS/Android as needed.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface MediaPickerProps {
  onPicked: (uri: string) => void;
  label?: string;
}

export default function MediaPicker({ onPicked, label }: MediaPickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Photo permission denied');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ('Images' as any),
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        onPicked(result.assets[0].uri);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [onPicked]);

  return (
    <Pressable
      testID="media-picker"
      onPress={pick}
      disabled={busy}
      style={[styles.btn, busy && styles.disabled]}>
      {busy ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.text}>{error ?? label ?? 'Pick a photo'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  disabled: { opacity: 0.5 },
  text: { color: '#111', fontWeight: '600' },
});
