// Miamo Mobile — PhoneInput.
// India-first phone entry: country code prefix (fixed +91 for the MVP) and
// a 10-digit body. Emits the concatenated E.164 string on change and
// exposes `isValid` for the parent to gate submit buttons.
import React, { useCallback } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { isIndianPhone } from '@lib/utils';

export interface PhoneInputProps {
  value: string;
  onChange: (v: string) => void;
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChange,
  onValidityChange,
  placeholder,
}: PhoneInputProps) {
  const digits = value.replace(/^\+?91/, '').replace(/[^0-9]/g, '');

  const handle = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 10);
      const e164 = `+91${cleaned}`;
      onChange(e164);
      onValidityChange?.(isIndianPhone(e164));
    },
    [onChange, onValidityChange],
  );

  return (
    <View style={styles.wrap} testID="phone-input">
      <View style={styles.prefix}>
        <Text style={styles.prefixText}>+91</Text>
      </View>
      <TextInput
        testID="phone-input-field"
        value={digits}
        onChangeText={handle}
        placeholder={placeholder ?? '10-digit mobile'}
        keyboardType="phone-pad"
        maxLength={10}
        style={styles.field}
        autoComplete="tel"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f7f7f7',
  },
  prefixText: { fontWeight: '700', color: '#111' },
  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
});
