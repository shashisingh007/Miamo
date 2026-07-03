// Miamo Mobile — Settings › Delete account.
// Irreversible. Typed-confirm gate ("DELETE") plus optional exit-reason picker.
// After confirmation the user is signed out and returned to Auth.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import ConfirmDialog from '@components/ConfirmDialog';
import { toast } from '@components/Toast';
import { useAuth } from '@hooks/useAuth';

const EXIT_REASONS = [
  { value: 'found_someone', label: 'I found someone' },
  { value: 'taking_a_break', label: 'Taking a break' },
  { value: 'no_good_matches', label: "I didn't get good matches" },
  { value: 'safety', label: 'Safety concerns' },
  { value: 'privacy', label: 'Privacy concerns' },
  { value: 'other', label: 'Other' },
];

export default function DeleteAccountScreen() {
  const { logout } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const doDelete = useCallback(async () => {
    setBusy(true);
    try {
      await api.deleteAccount({
        confirm: 'DELETE',
        reason: reason ? `${reason}${details ? ' — ' + details : ''}` : undefined,
      });
      toast.success('Account deleted');
      await logout();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }, [reason, details, logout]);

  return (
    <SafeAreaView style={styles.wrap} testID="settings-delete">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Delete account</Text>
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>This cannot be undone</Text>
          <Text style={styles.warningBody}>
            All matches, chats, photos and Beats are permanently removed. If you might come back
            later, use Deactivate instead.
          </Text>
        </View>

        <Text style={styles.label}>Why are you leaving? (optional)</Text>
        <View style={styles.reasonList}>
          {EXIT_REASONS.map(r => (
            <Pressable
              key={r.value}
              testID={`delete-reason-${r.value}`}
              onPress={() => setReason(r.value === reason ? '' : r.value)}
              style={[styles.reason, reason === r.value && styles.reasonActive]}>
              <Text style={reason === r.value ? styles.reasonActiveText : styles.reasonText}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          testID="delete-details"
          value={details}
          onChangeText={setDetails}
          placeholder="Anything else to share? (optional)"
          multiline
          style={[styles.input, styles.multiline]}
        />

        <Pressable
          testID="delete-submit"
          disabled={busy}
          onPress={() => setConfirming(true)}
          style={[styles.btnDanger, busy && styles.btnDisabled]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Delete my account</Text>
          )}
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title="Delete your Miamo account?"
        message="This is permanent. All your data will be removed. Type DELETE to confirm."
        typedConfirm="DELETE"
        confirmLabel="Delete forever"
        cancelLabel="Never mind"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={doDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111' },
  warning: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff2f2',
    borderWidth: 1,
    borderColor: '#f5c5c5',
  },
  warningTitle: { fontWeight: '700', color: '#c92222', marginBottom: 4 },
  warningBody: { color: '#8a1c1c', fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, color: '#555', marginTop: 8 },
  reasonList: { gap: 6 },
  reason: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  reasonActive: { backgroundColor: '#111', borderColor: '#111' },
  reasonText: { color: '#111' },
  reasonActiveText: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  btnDanger: {
    backgroundColor: '#c92222',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700' },
});
