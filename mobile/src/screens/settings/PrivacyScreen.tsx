// Miamo Mobile — Settings › Privacy.
// Boolean toggles matching services/web privacy panel: profile visibility,
// discoverability, family-brief access, screenshot warnings, and the
// personalization-consent trio (mood inference, behavioural ranking, cross-user
// signals). All fields optimistically update via api.updatePrivacy — errors
// revert local state.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import { toast } from '@components/Toast';
import EmptyState from '@components/EmptyState';

interface PrivacyState {
  profileVisibility?: 'public' | 'matches' | 'private';
  showOnlineStatus?: boolean;
  showReadReceipts?: boolean;
  discoverableInSearch?: boolean;
  hidePassed?: boolean;
  verifiedOnly?: boolean;
  screenshotWarning?: boolean;
  replayConfirm?: boolean;
  blockChatScreenshots?: boolean;
  consentBehaviouralRanking?: boolean;
  consentMoodInference?: boolean;
  consentCrossUserInference?: boolean;
  familyBriefAccess?: 'anyone' | 'matched' | 'granted' | 'off';
}

export default function PrivacyScreen() {
  const [state, setState] = useState<PrivacyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      setState((res as any)?.data ?? {});
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<PrivacyState>) => {
      const prev = state;
      setState(cur => ({ ...(cur || {}), ...patch }));
      try {
        await api.updatePrivacy(patch as any);
      } catch (err) {
        setState(prev);
        toast.error((err as Error).message);
      }
    },
    [state],
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  if (error)
    return <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />;

  const s = state ?? {};
  return (
    <SafeAreaView style={styles.wrap} testID="settings-privacy">
      <ScrollView>
        <Text style={styles.title}>Privacy & visibility</Text>

        <Text style={styles.sectionLabel}>Who can see your profile</Text>
        <View style={styles.chipRow}>
          {(['public', 'matches', 'private'] as const).map(v => (
            <Pressable
              key={v}
              testID={`priv-vis-${v}`}
              onPress={() => update({ profileVisibility: v })}
              style={[styles.pill, s.profileVisibility === v && styles.pillActive]}>
              <Text style={s.profileVisibility === v ? styles.pillActiveText : styles.pillText}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>

        <ToggleRow
          testID="priv-online"
          label="Show online status"
          desc="Others see a green dot when you're active."
          value={!!s.showOnlineStatus}
          onChange={v => update({ showOnlineStatus: v })}
        />
        <ToggleRow
          testID="priv-read-receipts"
          label="Read receipts"
          desc="Share when you've seen a message."
          value={!!s.showReadReceipts}
          onChange={v => update({ showReadReceipts: v })}
        />
        <ToggleRow
          testID="priv-discover-search"
          label="Discoverable in search"
          desc="Let people find you by name or handle."
          value={!!s.discoverableInSearch}
          onChange={v => update({ discoverableInSearch: v })}
        />
        <ToggleRow
          testID="priv-hide-passed"
          label="Hide people I've passed"
          value={!!s.hidePassed}
          onChange={v => update({ hidePassed: v })}
        />
        <ToggleRow
          testID="priv-verified-only"
          label="Verified profiles only"
          desc="Only show me profiles that have been verified."
          value={!!s.verifiedOnly}
          onChange={v => update({ verifiedOnly: v })}
        />

        <Text style={styles.sectionLabel}>Screenshots & replay</Text>
        <ToggleRow
          testID="priv-screenshot-warn"
          label="Warn me on screenshots"
          value={!!s.screenshotWarning}
          onChange={v => update({ screenshotWarning: v })}
        />
        <ToggleRow
          testID="priv-replay-confirm"
          label="Confirm before replay"
          desc="Ask before replaying an ephemeral Beat."
          value={!!s.replayConfirm}
          onChange={v => update({ replayConfirm: v })}
        />
        <ToggleRow
          testID="priv-block-screenshots"
          label="Block chat screenshots"
          desc="On supported devices."
          value={!!s.blockChatScreenshots}
          onChange={v => update({ blockChatScreenshots: v })}
        />

        <Text style={styles.sectionLabel}>Personalization consent (v3.6)</Text>
        <ToggleRow
          testID="priv-behavioural"
          label="Behavioural ranking"
          desc="Use my swipe / chat behaviour to rank feeds."
          value={!!s.consentBehaviouralRanking}
          onChange={v => update({ consentBehaviouralRanking: v })}
        />
        <ToggleRow
          testID="priv-mood"
          label="Mood inference"
          desc="Infer my mood from my activity to time notifications."
          value={!!s.consentMoodInference}
          onChange={v => update({ consentMoodInference: v })}
        />
        <ToggleRow
          testID="priv-cross-user"
          label="Cross-user inference"
          desc="Compare my patterns with similar users to rank matches."
          value={!!s.consentCrossUserInference}
          onChange={v => update({ consentCrossUserInference: v })}
        />

        <Text style={styles.sectionLabel}>DTM Family Brief access</Text>
        <View style={styles.chipRow}>
          {(['anyone', 'matched', 'granted', 'off'] as const).map(v => (
            <Pressable
              key={v}
              testID={`priv-brief-${v}`}
              onPress={() => update({ familyBriefAccess: v })}
              style={[styles.pill, s.familyBriefAccess === v && styles.pillActive]}>
              <Text style={s.familyBriefAccess === v ? styles.pillActiveText : styles.pillText}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  testID,
  label,
  desc,
  value,
  onChange,
}: {
  testID?: string;
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.label}>{label}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}
      </View>
      <Switch testID={testID} value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', padding: 16 },
  sectionLabel: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  label: { fontSize: 15, color: '#111' },
  desc: { fontSize: 12, color: '#666', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff', fontWeight: '600' },
});
