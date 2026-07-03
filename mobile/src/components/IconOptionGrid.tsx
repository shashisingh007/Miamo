// Miamo Mobile — IconOptionGrid.
// Ported from services/web/src/components/IconOptionGrid.tsx. Single-select
// grid of icon+label cards. Used for dating intent, drinking/smoking, etc.
import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// Options accept either `{key, label}` (canonical) or `{value, label}`
// (matches web-side convention). `description` is an optional secondary
// caption used by onboarding for intent descriptions.
export interface IconOption {
  key?: string;
  value?: string;
  label: string;
  icon?: string;
  description?: string;
}

interface Props {
  options: IconOption[];
  value: string | null;
  onChange: (v: string) => void;
  columns?: 2 | 3 | 4;
  style?: StyleProp<ViewStyle>;
  ariaLabel?: string;
  testID?: string;
}

function optKey(o: IconOption): string {
  return (o.key ?? o.value ?? o.label) as string;
}

const ROSE = '#e85d75';

export function IconOptionGrid({
  options,
  value,
  onChange,
  columns = 3,
  style,
  ariaLabel,
  testID,
}: Props) {
  return (
    <View accessibilityLabel={ariaLabel} accessibilityRole="radiogroup" style={style} testID={testID}>
      <View style={styles.grid}>
        {options.map((o) => {
          const k = optKey(o);
          const active = value === k;
          return (
            <Pressable
              key={k}
              onPress={() => onChange(k)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.cell,
                { width: `${100 / columns - 2}%` },
                active ? styles.cellActive : styles.cellIdle,
                pressed && styles.cellPressed,
              ]}
            >
              {o.icon ? (
                <Text style={[styles.icon, active && styles.iconActive]}>{o.icon}</Text>
              ) : null}
              <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  cellIdle: { borderColor: '#e5e5e5', backgroundColor: '#fff' },
  cellActive: { borderColor: ROSE, backgroundColor: 'rgba(232,93,117,0.10)' },
  cellPressed: { opacity: 0.85 },
  icon: { fontSize: 22, color: '#8a8a8a' },
  iconActive: { color: ROSE },
  label: { fontSize: 12, fontWeight: '500', color: '#666', textAlign: 'center' },
  labelActive: { color: ROSE },
});

export default IconOptionGrid;
