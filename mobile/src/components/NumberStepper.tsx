// Miamo Mobile — NumberStepper.
// Ported from services/web/src/components/NumberStepper.tsx. `−  N  +` control
// with configurable min/max/step and an optional label + suffix.
import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
  ariaLabel?: string;
}

const ROSE = '#e85d75';

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  suffix,
  style,
  ariaLabel,
}: Props) {
  const v = typeof value === 'number' && !isNaN(value) ? value : min;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const decDisabled = v <= min;
  const incDisabled = v >= max;

  return (
    <View style={style} accessibilityLabel={ariaLabel ?? label}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(clamp(v - step))}
          disabled={decDisabled}
          accessibilityRole="button"
          accessibilityLabel="Decrease"
          style={({ pressed }) => [
            styles.btn,
            decDisabled && styles.btnDisabled,
            pressed && !decDisabled && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <View style={styles.readout}>
          <Text style={styles.value}>
            {v}
            {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
          </Text>
        </View>
        <Pressable
          onPress={() => onChange(clamp(v + step))}
          disabled={incDisabled}
          accessibilityRole="button"
          accessibilityLabel="Increase"
          style={({ pressed }) => [
            styles.btn,
            incDisabled && styles.btnDisabled,
            pressed && !incDisabled && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.bounds}>
        <Text style={styles.bound}>
          {min}
          {suffix ?? ''}
        </Text>
        <Text style={styles.bound}>
          {max}
          {suffix ?? ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '500', color: '#666', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  btnPressed: { backgroundColor: 'rgba(232,93,117,0.15)' },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontSize: 18, color: '#333', fontWeight: '600' },
  readout: { flex: 1, alignItems: 'center' },
  value: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  suffix: { fontSize: 12, fontWeight: '400', color: '#999' },
  bounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 4,
  },
  bound: { fontSize: 10, color: '#9a9a9a' },
});

export default NumberStepper;
