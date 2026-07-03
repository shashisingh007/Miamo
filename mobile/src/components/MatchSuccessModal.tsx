// Miamo Mobile — MatchSuccessModal. Fires from Discover after `/discover/like`
// returns `isMutual: true`. First-match users see a lightweight confetti
// animation (fades in/out via reanimated).
// Web parity: services/web/src/components/MatchSuccessModal.tsx.
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

export interface MatchSuccessModalProps {
  visible: boolean;
  otherName?: string;
  isFirstMatch?: boolean;
  onSendMove: () => void;
  onKeepBrowsing: () => void;
}

export default function MatchSuccessModal({
  visible,
  otherName,
  isFirstMatch,
  onSendMove,
  onKeepBrowsing,
}: MatchSuccessModalProps) {
  const scale = useSharedValue(0.6);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(1.15, { duration: 260 }),
        withTiming(1, { duration: 220 }),
      );
      if (isFirstMatch) {
        spin.value = withRepeat(withTiming(360, { duration: 3200 }), -1, false);
      }
    }
  }, [visible, isFirstMatch, scale, spin]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const confettiStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <Modal transparent animationType="fade" visible={visible} testID="match-success-modal">
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, style]}>
          {isFirstMatch ? (
            <Animated.View style={[styles.confetti, confettiStyle]}>
              <Text style={styles.confettiText}>✨</Text>
            </Animated.View>
          ) : null}
          <Text style={styles.header}>It's a match!</Text>
          {otherName ? (
            <Text style={styles.body}>You and {otherName} liked each other.</Text>
          ) : (
            <Text style={styles.body}>You both liked each other.</Text>
          )}
          <View style={styles.actions}>
            <Pressable
              testID="match-send-move"
              accessibilityRole="button"
              onPress={onSendMove}
              style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Send a Move</Text>
            </Pressable>
            <Pressable
              testID="match-keep-browsing"
              accessibilityRole="button"
              onPress={onKeepBrowsing}
              style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Keep browsing</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center' },
  confetti: { position: 'absolute', top: -30 },
  confettiText: { fontSize: 40 },
  header: { fontSize: 24, fontWeight: '800', marginBottom: 8, color: '#111' },
  body: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 20 },
  actions: { width: '100%', gap: 12 },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#111' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#eee' },
  btnGhostText: { color: '#111', fontWeight: '600' },
});
