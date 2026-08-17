import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
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
                    color={active ? 'textPrimary' : item.href ? 'textMuted' : 'textFaint'}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityLabel="Search" style={({ hovered }) => [styles.outlineAction, hovered && styles.actionHovered]}>
            <AppText variant="caption" color="textMuted">⌕  Search</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Upload report" onPress={openReportUpload} style={({ hovered, pressed }) => [styles.outlineAction, (hovered || pressed) && styles.actionHovered]}>
            <AppText variant="caption" color="textSecondary">Upload report</AppText>
          </Pressable>
          <Pressable accessibilityLabel="Open profile" style={styles.avatar}>
            <AppText variant="caption" style={styles.avatarText}>A</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: layout.contentMaxWidth, height: 58, paddingHorizontal: layout.desktopGutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxxl },
  wordmark: { fontWeight: '600' },
  navigation: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xl, height: '100%' },
  navItem: { justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingTop: 2 },
  navItemActive: { borderBottomColor: colors.textPrimary },
  navItemHovered: { opacity: 0.72 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  outlineAction: { minHeight: 34, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xs },
  actionHovered: { borderColor: colors.textMuted },
  avatar: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.textPrimary },
  avatarText: { color: colors.surface, fontWeight: typography.bodyStrong.fontWeight },
});
