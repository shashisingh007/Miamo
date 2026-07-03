// Miamo Mobile — OtpInput.
// 6-digit OTP field. Uses a single hidden TextInput so autofill / paste
// still works, and renders 6 visible boxes on top. This mirrors the pattern
// used by many production RN apps and avoids per-cell autofill flakiness.
import React, { useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  /** Fires when the user completes the full length. Passed the final value. */
  onComplete?: (code: string) => void | Promise<void>;
  length?: number;
  autoFocus?: boolean;
}

export default function OtpInput({ value, onChange, onComplete, length = 6, autoFocus = true }: OtpInputProps) {
  const ref = useRef<TextInput>(null);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  return (
    <View style={styles.wrap} testID="otp-input">
      <TextInput
        ref={ref}
        testID="otp-input-hidden"
        value={value}
        onChangeText={t => {
          const cleaned = t.replace(/[^0-9]/g, '').slice(0, length);
          onChange(cleaned);
          if (cleaned.length === length) void onComplete?.(cleaned);
        }}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        maxLength={length}
        style={styles.hidden}
        // iOS SMS one-time-code autofill:
        textContentType="oneTimeCode"
        // Android SMS Retriever:
        autoComplete="sms-otp"
      />
      <View style={styles.row}>
        {digits.map((d, i) => (
          <View
            key={i}
            style={[styles.cell, i === value.length && styles.cellActive]}
            onTouchEnd={() => ref.current?.focus()}
            testID={`otp-cell-${i}`}>
            <Text style={styles.cellText}>{d}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  cell: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cellActive: { borderColor: '#111' },
  cellText: { fontSize: 22, fontWeight: '700' },
});
