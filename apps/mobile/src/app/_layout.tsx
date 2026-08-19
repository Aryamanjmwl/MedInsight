import { DefaultTheme, Redirect, Stack, ThemeProvider, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { HealthDataRefreshProvider } from '@/context/health-data-refresh-context';
import { ManualMeasurementProvider } from '@/context/manual-measurement-context';
import { ReportUploadProvider } from '@/context/report-upload-context';
import { colors } from '@/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
  },
};

function AppNavigation() {
  const { loading, session } = useAuth();
  const segments = useSegments();
  const inAuthGroup = (segments as string[])[0] === '(auth)';

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!session && !inAuthGroup) return <Redirect href={'/(auth)/sign-in' as Href} />;
  if (session && inAuthGroup) return <Redirect href="/" />;

  const stack = (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );

  if (!session) return stack;
  return (
    <HealthDataRefreshProvider key={session.user.id}>
      <ReportUploadProvider>
        <ManualMeasurementProvider>{stack}</ManualMeasurementProvider>
      </ReportUploadProvider>
    </HealthDataRefreshProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
