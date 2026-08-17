import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useAuth } from '@/context/auth-context';
import { colors, layout, radii, spacing } from '@/theme';

type AuthFormProps = { mode: 'sign-in' | 'sign-up' };

export function AuthForm({ mode }: AuthFormProps) {
  const { configurationError, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isSignUp = mode === 'sign-up';

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.requiresEmailConfirmation) {
          setMessage('Check your email to confirm your account, then sign in.');
        }
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.heading}>
          <AppText variant="metadata" color="brand">MEDINSIGHT</AppText>
          <AppText variant="title">{isSignUp ? 'Create your account' : 'Welcome back'}</AppText>
          <AppText color="textSecondary">
            {isSignUp
              ? 'Keep your laboratory history private and available across devices.'
              : 'Sign in to access your reports and biomarker history.'}
          </AppText>
        </View>
        <View style={styles.fields}>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>
        {configurationError ? <AppText color="statusHigh">{configurationError}</AppText> : null}
        {message ? <AppText color="textSecondary">{message}</AppText> : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy || Boolean(configurationError) || !email || !password}
          onPress={submit}
          style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}
        >
          {busy ? <ActivityIndicator color={colors.white} /> : (
            <AppText variant="bodyStrong" color="white">
              {isSignUp ? 'Create account' : 'Sign in'}
            </AppText>
          )}
        </Pressable>
        <AppText variant="caption" color="textMuted" style={styles.switchText}>
          {isSignUp ? 'Already have an account? ' : 'New to MedInsight? '}
          <Link
            href={(isSignUp ? '/(auth)/sign-in' : '/(auth)/sign-up') as Href}
            style={styles.link}
          >
            {isSignUp ? 'Sign in' : 'Create account'}
          </Link>
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  card: { width: '100%', maxWidth: Math.min(440, layout.contentMaxWidth), gap: spacing.xl, padding: spacing.xxl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  heading: { gap: spacing.sm },
  fields: { gap: spacing.md },
  input: { minHeight: 50, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, backgroundColor: colors.white, color: colors.textPrimary, fontSize: 15 },
  button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand },
  buttonPressed: { opacity: 0.72 },
  switchText: { textAlign: 'center' },
  link: { color: colors.brand, fontWeight: '600' },
});
