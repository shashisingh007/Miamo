// Miamo Mobile — Toast. Non-blocking success/error announcer.
// Screens render <Toast /> at the root and call `Toast.show(...)`. In this
// minimal port we expose an imperative API via a singleton bus + a hook.
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type ToastMsg = { id: number; text: string; variant: 'info' | 'error' | 'success' };
type Listener = (msg: ToastMsg) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export const toast = {
  info(text: string) {
    listeners.forEach(l => l({ id: nextId++, text, variant: 'info' }));
  },
  success(text: string) {
    listeners.forEach(l => l({ id: nextId++, text, variant: 'success' }));
  },
  error(text: string) {
    listeners.forEach(l => l({ id: nextId++, text, variant: 'error' }));
  },
};

export default function Toast() {
  const [current, setCurrent] = React.useState<ToastMsg | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const l: Listener = msg => {
      setCurrent(msg);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setCurrent(null));
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [opacity]);

  if (!current) return null;
  const bg =
    current.variant === 'error' ? '#c92222' : current.variant === 'success' ? '#1a8a34' : '#333';
  return (
    <Animated.View
      pointerEvents="none"
      testID="toast"
      style={[styles.wrap, { opacity, backgroundColor: bg }]}>
      <View>
        <Text style={styles.text}>{current.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 96,
    left: 24,
    right: 24,
    padding: 12,
    borderRadius: 10,
    zIndex: 100,
  },
  text: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
