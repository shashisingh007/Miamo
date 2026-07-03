// Miamo Mobile — LocationPicker.
// Uses expo-location to read the current position, then calls
// api.nearestCity() to convert coords → the app's city record. The parent
// receives { city, lat, lng }. If the user denies location we surface the
// error string and don't throw.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import * as Location from 'expo-location';
import { api } from '@lib/api';

export interface LocationPickerProps {
  onPicked: (payload: { city: string; lat: number; lng: number }) => void;
}

export default function LocationPicker({ onPicked }: LocationPickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      let city = '';
      try {
        const res = await api.nearestCity(latitude, longitude);
        city = res?.data?.name ?? res?.data?.city ?? '';
      } catch {
        // Fallback: no nearest-city match, still forward coords.
      }
      onPicked({ city, lat: latitude, lng: longitude });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [onPicked]);

  return (
    <Pressable
      testID="location-picker"
      onPress={pick}
      disabled={busy}
      style={[styles.btn, busy && styles.disabled]}>
      {busy ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.text}>{error ?? 'Use current location'}</Text>
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
