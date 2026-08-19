import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AppText } from '@/components/app-text';
import { useAuth } from '@/context/auth-context';
import { useManualMeasurementDialog } from '@/context/manual-measurement-context';
import { useReportUploadDialog } from '@/context/report-upload-context';
import { colors, layout, radii, spacing, typography } from '@/theme';

const navigation: { label: string; href?: Href }[] = [
  { label: 'Overview', href: '/' },
  { label: 'Reports', href: '/reports' },
  { label: 'Biomarkers', href: '/biomarkers' },
  { label: 'Doctor Brief', href: '/brief' as Href },
];

export function DesktopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { openReportUpload } = useReportUploadDialog();
  const { openManualMeasurement } = useManualMeasurementDialog();
  const { user } = useAuth();
  const accountInitial = user?.email?.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.leading}>
          <AppText variant="section" style={styles.wordmark}>MedInsight</AppText>
          <View accessibilityRole="tablist" style={styles.navigation}>
            {navigation.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname === item.href;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole={item.href ? 'link' : undefined}
                  accessibilityState={{ disabled: !item.href, selected: active }}
                  disabled={!item.href}
                  onPress={() => item.href && router.push(item.href)}
                  style={({ hovered, pressed }) => [
                    styles.navItem,
                    active && styles.navItemActive,
                    (hovered || pressed) && item.href && styles.navItemHovered,
                  ]}>
                  <AppText
                    variant="label"
                    color={active ? 'textPrimary' : item.href ? 'textSecondary' : 'textFaint'}
                    style={styles.navLabel}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add laboratory measurement" onPress={openManualMeasurement} style={({ hovered, pressed }) => [styles.secondaryAction, (hovered || pressed) && styles.actionHovered]}>
            <Feather color={colors.brand} name="plus" size={15} />
            <AppText variant="label" color="brand">Add measurement</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Upload report" onPress={openReportUpload} style={({ hovered, pressed }) => [styles.outlineAction, (hovered || pressed) && styles.actionHovered]}>
            <Feather color={colors.white} name="upload" size={15} />
            <AppText variant="label" color="white">Upload report</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open account settings"
            onPress={() => router.push('/settings')}
            style={({ hovered, pressed }) => [styles.avatar, (hovered || pressed) && styles.actionHovered]}>
            <AppText variant="caption" style={styles.avatarText}>{accountInitial}</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: layout.contentMaxWidth, height: 64, paddingHorizontal: layout.desktopGutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxxl },
  wordmark: { fontSize: 19, fontWeight: '700', letterSpacing: -0.35 },
  navigation: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xl, height: '100%' },
  navItem: { justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingTop: 2 },
  navLabel: { fontSize: 13, fontWeight: '600' },
  navItemActive: { borderBottomColor: colors.textPrimary },
  navItemHovered: { opacity: 0.72 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  secondaryAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  outlineAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.brand },
  actionHovered: { opacity: 0.76 },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.pill, backgroundColor: colors.surface },
  avatarText: { color: colors.textPrimary, fontWeight: typography.bodyStrong.fontWeight },
});
