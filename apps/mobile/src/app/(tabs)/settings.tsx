import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { useAuth } from '@/context/auth-context';
import { colors, radii, spacing } from '@/theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(false);
    try {
      await signOut();
    } catch {
      setSignOutError(true);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen>
      <PageHeader
        title="Settings"
        description="Review your account and how MedInsight handles report data."
      />
      <View style={styles.section}>
        <SectionHeader title="Account" />
        <View style={styles.accountCard}>
          <View style={styles.accountDetails}>
            <AppText variant="label" color="textMuted">SIGNED IN AS</AppText>
            <AppText variant="bodyStrong">{user?.email ?? 'Authenticated user'}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: signingOut, disabled: signingOut }}
            disabled={signingOut}
            onPress={() => void handleSignOut()}
            style={({ pressed, hovered }) => [styles.signOutButton, (pressed || hovered) && styles.activeButton]}>
            {signingOut ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="bodyStrong" color="brand">Sign out</AppText>}
          </Pressable>
        </View>
        {signOutError ? <AppText accessibilityLiveRegion="polite" variant="caption" color="statusHigh">Unable to sign out right now. Please try again.</AppText> : null}
      </View>
      <View style={styles.section}>
        <SectionHeader title="Data & Privacy" />
        <View style={styles.list}>
          <InformationRow title="Structured results" description="Structured laboratory results are stored securely in your account." />
          <InformationRow title="Original reports" description="Original report files and full extracted text are not retained after processing." />
          <InformationRow title="Units" description="Measurements are shown using the units and reference ranges printed in each report." />
          <InformationRow title="AI explanations" description="Generated only when requested from structured results and not stored by MedInsight." last />
        </View>
      </View>
      <View style={styles.section}>
        <SectionHeader title="About" />
        <View style={styles.notice}>
        <AppText variant="section">MedInsight</AppText>
        <AppText variant="caption" color="textSecondary">MedInsight organizes laboratory reports into a longitudinal health record.</AppText>
        <AppText variant="caption" color="textMuted">
          MedInsight does not provide medical diagnosis or treatment.
        </AppText>
        </View>
      </View>
    </Screen>
  );
}

function InformationRow({ title, description, last = false }: { title: string; description: string; last?: boolean }) {
  return (
    <View style={[styles.informationRow, last && styles.lastRow]}>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="caption" color="textSecondary">{description}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', maxWidth: 900, gap: spacing.md },
  list: {
    paddingHorizontal: spacing.xl,
    borderTopWidth: 2,
    borderBottomWidth: 1,
    borderColor: colors.textPrimary,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  accountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.xl, borderTopWidth: 2, borderBottomWidth: 1, borderColor: colors.textPrimary, backgroundColor: colors.surface },
  accountDetails: { flex: 1, gap: spacing.xs },
  signOutButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md },
  activeButton: { opacity: 0.65 },
  informationRow: { gap: spacing.xs, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  notice: {
    gap: spacing.sm,
    maxWidth: 720,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
  },
});
