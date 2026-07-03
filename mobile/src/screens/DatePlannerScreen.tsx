// Miamo Mobile — Date planner (per-match).
// Web parity: services/web/src/app/(main)/date-planner/page.tsx.
// No dedicated /date-planner backend endpoint yet — mirrors the web MVP.
import React, { useState } from 'react';
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
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function DatePlannerScreen() {
  useTrackPageView('date-planner');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    // Placeholder — a future endpoint will accept /date-planner/plans.
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    toast.success('Plan saved (local)');
  }

  return (
    <SafeAreaView style={styles.wrap} testID="date-planner-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Plan a date</Text>
        <TextInput
          testID="date-planner-when"
          value={when}
          onChangeText={setWhen}
          placeholder="When? e.g. Sat 7pm"
          style={styles.input}
        />
        <TextInput
          testID="date-planner-where"
          value={where}
          onChangeText={setWhere}
          placeholder="Where? e.g. Blue Tokai, Indiranagar"
          style={styles.input}
        />
        <Pressable
          testID="date-planner-save"
          accessibilityRole="button"
          onPress={save}
          disabled={saving || !when || !where}
          style={[styles.btn, (saving || !when || !where) && styles.btnDisabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save plan</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  btn: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700' },
});
