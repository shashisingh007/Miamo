// Miamo Mobile — Family Brief share.
// Fetches a signed link from `/dtm/family-brief/generate` and hands it to
// the native Share sheet. Web parity uses the browser Share API; mobile
// uses React Native's `Share` module which routes to WhatsApp/Messages/etc.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { api } from '@lib/api';

export interface FamilyBriefProps {
  disabled?: boolean;
  onShared?: (url: string) => void;
}

export default function FamilyBrief({ disabled, onShared }: FamilyBriefProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateFamilyBrief({ format: 'image', trackViews: false });
      const url = res?.url;
      if (!url) throw new Error('No URL returned');
      await Share.share({
        message: `Hey — this is my Miamo family brief: ${url}`,
        url,
      });
      onShared?.(url);
    } catch (err) {
      setError((err as Error).message || 'Failed to share');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View testID="family-brief">
      <Pressable
        testID="family-brief-share"
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={handleShare}
        style={[styles.btn, (disabled || loading) && styles.btnDisabled]}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Share family brief</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c92222', marginTop: 8, textAlign: 'center' },
});
