import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DesktopHeader } from '@/components/desktop-header';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, layout, spacing } from '@/theme';

export function Screen({ children }: PropsWithChildren) {
  const { isDesktop } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {isDesktop ? <DesktopHeader /> : null}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, isDesktop && styles.desktopContent]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: spacing.huge + spacing.lg },
  content: { alignSelf: 'stretch', minWidth: 0, maxWidth: layout.contentMaxWidth, marginHorizontal: layout.mobileGutter, gap: spacing.xxxl },
  desktopContent: { alignSelf: 'center', width: '100%', marginHorizontal: 0, paddingHorizontal: layout.desktopGutter, gap: spacing.xxxl },
});
