// Miamo Mobile — CityAutocomplete.
// Ported from services/web/src/components/CityAutocomplete.tsx. Debounced
// (150ms) TextInput that hits /api/v1/cities/search and renders results in a
// FlatList below the input. `onSelect` fires with the chosen city.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { api } from '../lib/api';

export interface City {
  name: string;
  region: string;
  country: string;
  display: string;
  lat?: number;
  lng?: number;
  population?: number;
}

interface Props {
  value?: string;
  /**
   * Fires on every keystroke AND on pick. Two-arg form:
   *   `onChange(display, cityId?)` — cityId is populated only when a
   *   dropdown result is picked, so callers can persist the canonical id.
   */
  onChange?: (text: string, id?: string) => void;
  /** Fires only on a dropdown pick — receives the full City object. Optional. */
  onSelect?: (city: City) => void;
  placeholder?: string;
  required?: boolean;
  testID?: string;
}

export function CityAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Start typing your city…',
  required,
  testID,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = (query || '').trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (trimmed.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await api.searchCities(trimmed);
        setResults(r.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const choose = (c: City) => {
    setQuery(c.display);
    setOpen(false);
    // City has no explicit id in the DTO — use `${name}::${region}::${country}`
    // as a stable synthetic key that survives round-trip.
    const cityId = `${c.name}::${c.region}::${c.country}`;
    onChange?.(c.display, cityId);
    onSelect?.(c);
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.inputWrap}>
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            onChange?.(t);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="City"
          accessibilityHint="Start typing to search"
        />
        {loading ? (
          <ActivityIndicator size="small" style={styles.spinner} />
        ) : null}
      </View>
      {required && !query ? (
        <Text style={styles.helper}>Required</Text>
      ) : null}
      {open && results.length > 0 ? (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(c, i) => `${c.name}-${c.region}-${c.country}-${i}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => choose(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>
                  {' '}
                  · {item.region ? `${item.region}, ` : ''}
                  {item.country}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  inputWrap: { position: 'relative' },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 14,
    paddingRight: 34,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  spinner: { position: 'absolute', right: 12, top: 12 },
  helper: { color: '#9a9a9a', fontSize: 11, marginTop: 4 },
  dropdown: {
    marginTop: 4,
    maxHeight: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 14, paddingVertical: 10 },
  rowPressed: { backgroundColor: 'rgba(232,93,117,0.08)' },
  rowTitle: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  rowSubtitle: { fontSize: 13, color: '#8a8a8a' },
});

export default CityAutocomplete;
