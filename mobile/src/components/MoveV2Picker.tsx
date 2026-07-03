// Miamo Mobile — Move v2 picker.
// Renders the 5 ranked suggestions from `getMoveV2Suggestions()`. Web parity:
// services/web/src/components/deferred/MoveV2Picker.tsx.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@lib/api';

export interface MoveV2Suggestion {
  text: string;
  tone: string;
  slotIndex: number;
  hookCategory: string;
  hookText?: string;
  rightNowMatched?: boolean;
}

export interface MoveV2PickerProps {
  itemId: string;
  onSelect: (suggestion: MoveV2Suggestion) => void;
}

export default function MoveV2Picker({ itemId, onSelect }: MoveV2PickerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MoveV2Suggestion[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getMoveV2Suggestions(itemId, { n: 5 })
      .then(res => {
        if (!alive) return;
        setSuggestions(res?.suggestions ?? []);
        setLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        setError(err.message || 'Failed to load moves');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [itemId]);

  if (loading) return <ActivityIndicator testID="move-v2-loading" />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (suggestions.length === 0)
    return <Text style={styles.empty}>No suggestions yet — check back later.</Text>;

  return (
    <View testID="move-v2-picker">
      {suggestions.map((s, i) => (
        <Pressable
          key={`${s.slotIndex}-${i}`}
          testID={`move-v2-option-${i}`}
          accessibilityRole="button"
          onPress={() => onSelect(s)}
          style={styles.option}>
          <Text style={styles.tone}>
            {s.tone} · {s.hookCategory}
            {s.rightNowMatched ? ' · right-now' : ''}
          </Text>
          <Text style={styles.text}>{s.text}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  option: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tone: { fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  text: { fontSize: 15, color: '#111' },
  empty: { padding: 16, color: '#666', textAlign: 'center' },
  error: { padding: 16, color: '#c92222', textAlign: 'center' },
});
