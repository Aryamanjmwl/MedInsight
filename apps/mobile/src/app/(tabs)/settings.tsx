import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { deleteMyAccount, deleteMyHealthData } from '@/api/account';
import { AppText } from '@/components/app-text';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { useAuth } from '@/context/auth-context';
import { colors, radii, spacing } from '@/theme';

export default function SettingsScreen() {
  const { user, signOut, clearLocalSession } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const [dataDeletionArmed, setDataDeletionArmed] = useState(false);
  const [accountDeletionArmed, setAccountDeletionArmed] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

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

  const handleDeleteData = async () => {
    if (deletingData) return;
    setDeletingData(true);
    setPrivacyMessage(null);
    setPrivacyError(null);
    try {
      const result = await deleteMyHealthData();
      setPrivacyMessage(
        `Deleted ${result.reports_deleted} report${result.reports_deleted === 1 ? '' : 's'} and ${result.biomarkers_deleted} saved measurement${result.biomarkers_deleted === 1 ? '' : 's'}.`,
      );
      setDataDeletionArmed(false);
    } catch (error) {
      setPrivacyError(error instanceof Error ? error.message : 'Unable to delete your health data right now.');
    } finally {
      setDeletingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setPrivacyMessage(null);
    setPrivacyError(null);
    try {
      await deleteMyAccount();
      await clearLocalSession();
    } catch (error) {
      setPrivacyError(error instanceof Error ? error.message : 'Unable to delete your account right now.');
      setDeletingAccount(false);
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
          <InformationRow title="Structured results" description="Structured laboratory results are stored in your authenticated account." />
          <InformationRow title="Original reports" description="Original report files and full extracted text are not retained by MedInsight after processing." />
          <InformationRow title="Units" description="Measurements are shown using the units and reference ranges printed in each report." />
          <InformationRow title="AI explanations" description="Generated only when requested from a limited structured result context and not stored by MedInsight." last />
        </View>

        <View style={styles.privacyActions}>
          <View style={styles.privacyActionRow}>
            <View style={styles.actionCopy}>
              <AppText variant="bodyStrong">Delete health data</AppText>
              <AppText variant="caption" color="textSecondary">Permanently removes your saved reports and measurements while keeping your sign-in account.</AppText>
            </View>
            {!dataDeletionArmed ? (
              <Pressable
                accessibilityRole="button"
                disabled={deletingAccount}
                onPress={() => {
                  setDataDeletionArmed(true);
                  setAccountDeletionArmed(false);
                  setPrivacyMessage(null);
                  setPrivacyError(null);
                }}
                style={({ pressed, hovered }) => [styles.dangerButton, (pressed || hovered) && styles.activeButton]}>
                <AppText variant="bodyStrong" color="statusHigh">Delete health data</AppText>
              </Pressable>
            ) : null}
          </View>
          {dataDeletionArmed ? (
            <ConfirmationPanel
              message="This cannot be undone. Your account will remain active, but all MedInsight report and biomarker records owned by it will be permanently deleted."
              busy={deletingData}
              confirmLabel="Delete data permanently"
              onCancel={() => setDataDeletionArmed(false)}
              onConfirm={() => void handleDeleteData()}
            />
          ) : null}

          <View style={styles.divider} />

          <View style={styles.privacyActionRow}>
            <View style={styles.actionCopy}>
              <AppText variant="bodyStrong">Delete account</AppText>
              <AppText variant="caption" color="textSecondary">Permanently removes your MedInsight health data and authentication account.</AppText>
            </View>
            {!accountDeletionArmed ? (
              <Pressable
                accessibilityRole="button"
                disabled={deletingData}
                onPress={() => {
                  setAccountDeletionArmed(true);
                  setDataDeletionArmed(false);
                  setPrivacyMessage(null);
                  setPrivacyError(null);
                }}
                style={({ pressed, hovered }) => [styles.dangerButton, (pressed || hovered) && styles.activeButton]}>
                <AppText variant="bodyStrong" color="statusHigh">Delete account</AppText>
              </Pressable>
            ) : null}
          </View>
          {accountDeletionArmed ? (
            <ConfirmationPanel
              message="This permanently deletes your saved health data and MedInsight sign-in account. You will be signed out immediately after deletion."
              busy={deletingAccount}
              confirmLabel="Delete account permanently"
              onCancel={() => setAccountDeletionArmed(false)}
              onConfirm={() => void handleDeleteAccount()}
            />
          ) : null}
        </View>

        {privacyMessage ? <AppText accessibilityLiveRegion="polite" variant="caption" color="brand">{privacyMessage}</AppText> : null}
        {privacyError ? <AppText accessibilityLiveRegion="polite" variant="caption" color="statusHigh">{privacyError}</AppText> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="About" />
        <View style={styles.notice}>
          <AppText variant="section">MedInsight</AppText>
          <AppText variant="caption" color="textSecondary">MedInsight organizes laboratory reports into a longitudinal health record.</AppText>
          <AppText variant="caption" color="textMuted">MedInsight does not provide medical diagnosis or treatment.</AppText>
        </View>
      </View>
    </Screen>
  );
}

function ConfirmationPanel({
  message,
  busy,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  message: string;
  busy: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.confirmationPanel}>
      <AppText variant="caption" color="statusHigh">{message}</AppText>
      <View style={styles.confirmationActions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={({ pressed, hovered }) => [styles.secondaryButton, (pressed || hovered) && styles.activeButton]}>
          <AppText variant="bodyStrong">Cancel</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onConfirm} style={({ pressed, hovered }) => [styles.confirmDangerButton, (pressed || hovered) && styles.activeButton]}>
          {busy ? <ActivityIndicator size="small" color={colors.statusHigh} /> : <AppText variant="bodyStrong" color="statusHigh">{confirmLabel}</AppText>}
        </Pressable>
      </View>
    </View>
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
  privacyActions: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, padding: spacing.xl, gap: spacing.lg },
  privacyActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.lg },
  actionCopy: { flex: 1, minWidth: 240, gap: spacing.xs },
  dangerButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.statusHigh, borderRadius: radii.md },
  confirmationPanel: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.statusHigh, borderRadius: radii.md },
  confirmationActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  secondaryButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md },
  confirmDangerButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.statusHigh, borderRadius: radii.md, minWidth: 180, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  notice: {
    gap: spacing.sm,
    maxWidth: 720,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
  },
});
