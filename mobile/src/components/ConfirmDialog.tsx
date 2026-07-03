// Miamo Mobile — ConfirmDialog primitive.
// Web parity: services/web/src/components/ui/ConfirmDialog.tsx replaces every
// native alert/confirm/prompt. On mobile the equivalent risk is
// `Alert.alert` — it works, but it's platform-inconsistent and blocks the
// JS thread. We instead render an in-app Modal so animations + a11y are
// unified with the rest of the UI.
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Text the user must type to confirm — mirrors the web typed-confirm gate. */
  typedConfirm?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  typedConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [entered, setEntered] = React.useState('');
  const gated = !!typedConfirm && entered.trim() !== typedConfirm;
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
      testID="confirm-dialog">
      <View style={styles.backdrop}>
        <View style={styles.card} accessible accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {typedConfirm ? (
            <View style={styles.typedBlock}>
              <Text style={styles.typedHint}>Type {typedConfirm} to confirm:</Text>
              <TextInput
                value={entered}
                onChangeText={setEntered}
                style={styles.input}
                autoCapitalize="characters"
                testID="confirm-typed-input"
              />
            </View>
          ) : null}
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.btn, styles.btnCancel]}
              testID="confirm-cancel">
              <Text style={styles.btnCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={gated}
              onPress={() => {
                if (gated) return;
                onConfirm();
              }}
              style={[
                styles.btn,
                danger ? styles.btnDanger : styles.btnPrimary,
                gated && styles.btnDisabled,
              ]}
              testID="confirm-ok">
              <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
  message: { fontSize: 14, color: '#333', marginBottom: 12 },
  typedBlock: { marginBottom: 12 },
  typedHint: { fontSize: 12, color: '#555', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, color: '#111' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnCancel: { backgroundColor: '#eee' },
  btnPrimary: { backgroundColor: '#111' },
  btnDanger: { backgroundColor: '#c92222' },
  btnDisabled: { opacity: 0.4 },
  btnCancelText: { color: '#111', fontWeight: '600' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
});
