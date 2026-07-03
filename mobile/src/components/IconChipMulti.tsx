// Miamo Mobile — IconChipMulti.
// Ported from services/web/src/components/IconChipMulti.tsx. Grid of toggle
// chips for multi-select (interests etc.). `max` caps the number of picks;
// once reached, unselected chips become no-ops until the user removes one.
import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// Options accept either `{key, label}` (canonical) or `{value, label}`
// (matches web-side convention).
export interface IconChipOption {
  key?: string;
  value?: string;
  label?: string;
  icon?: string;
}

interface Props {
  options: IconChipOption[];
  /** Canonical picked-list. */
  selected?: string[];
  /** Alias for `selected` — matches web-side onboarding convention. */
  value?: string[];
  onChange: (next: string[]) => void;
  max?: number;
  style?: StyleProp<ViewStyle>;
  ariaLabel?: string;
  testID?: string;
}

const ROSE = '#e85d75';

function chipKey(o: IconChipOption): string {
  return (o.key ?? o.value ?? o.label ?? '') as string;
}

export function IconChipMulti({ options, selected, value, onChange, max, style, ariaLabel, testID }: Props) {
  const picked = selected ?? value ?? [];
  const has = (v: string) => picked.includes(v);
  const toggle = (v: string) => {
    if (has(v)) {
      onChange(picked.filter((x) => x !== v));
    } else if (!max || picked.length < max) {
      onChange([...picked, v]);
    }
  };

  return (
    <View accessibilityLabel={ariaLabel} style={style} testID={testID}>
      <View style={styles.wrap}>
        {options.map((o) => {
          const k = chipKey(o);
          const active = has(k);
          return (
            <Pressable
              key={k}
              onPress={() => toggle(k)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : styles.chipIdle,
                pressed && styles.chipPressed,
              ]}
            >
              {o.icon ? (
                <Text style={[styles.chipIcon, active && styles.chipIconActive]}>{o.icon}</Text>
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {o.label ?? k}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {max ? (
        <Text style={styles.counter}>
          {picked.length}/{max} picked
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipIdle: { borderColor: '#e5e5e5', backgroundColor: '#fff' },
  chipActive: { borderColor: ROSE, backgroundColor: 'rgba(232,93,117,0.10)' },
  chipPressed: { opacity: 0.85 },
  chipIcon: { fontSize: 14, color: '#8a8a8a' },
  chipIconActive: { color: ROSE },
  chipText: { fontSize: 12, fontWeight: '500', color: '#666' },
  chipTextActive: { color: ROSE },
  counter: { marginTop: 6, fontSize: 11, color: '#9a9a9a' },
});

export default IconChipMulti;
