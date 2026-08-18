import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useAuth } from '@/context/auth-context';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, layout, radii, spacing } from '@/theme';

type AuthFormProps = { mode: 'sign-in' | 'sign-up' };

function authenticationErrorMessage(error: unknown, isSignUp: boolean) {
  const detail = error instanceof Error ? error.message.toLocaleLowerCase('en-US') : '';
  if (detail.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (detail.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (detail.includes('already registered') || detail.includes('already been registered')) return 'An account already exists for this email.';
  if (detail.includes('rate') || detail.includes('too many')) return 'Too many attempts. Please wait and try again.';
  if (detail.includes('fetch') || detail.includes('network')) return 'Unable to reach the sign-in service. Check your connection and try again.';
  return isSignUp ? 'Unable to create your account right now.' : 'Unable to sign in right now.';
}

export function AuthForm({ mode }: AuthFormProps) {
  const { isDesktop } = useResponsiveLayout();
  const { configurationError, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isSignUp = mode === 'sign-up';

  const submit = async () => {
    if (busy || configurationError) return;
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const result = await signUp(normalizedEmail, password);
        if (result.requiresEmailConfirmation) {
          setMessage('Check your email to confirm your account, then sign in.');
        }
      } else {
        await signIn(normalizedEmail, password);
      }
    } catch (error) {
      setMessage(authenticationErrorMessage(error, isSignUp));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.page, isDesktop && styles.desktopPage]}>
      {isDesktop ? (
        <View style={styles.introduction}>
          <AppText variant="metadata" color="brand">MEDINSIGHT</AppText>
          <AppText variant="display" style={styles.statement}>Your laboratory history, understood over time.</AppText>
          <AppText color="textSecondary" style={styles.introCopy}>A private, structured record for reviewing reports, measurements, reference ranges, and changes across time.</AppText>
          <View style={styles.introRule} />
          <AppText variant="caption" color="textMuted">Report-based context · Deterministic trends · No diagnosis</AppText>
        </View>
      ) : null}
      <View style={[styles.card, isDesktop && styles.desktopCard]}>
        <View style={styles.heading}>
          {!isDesktop ? <AppText variant="metadata" color="brand">MEDINSIGHT</AppText> : null}
          <AppText variant="title">{isSignUp ? 'Create your account' : 'Welcome back'}</AppText>
          <AppText color="textSecondary">
            {isSignUp
              ? 'Keep your laboratory history private and available across devices.'
              : 'Sign in to access your reports and biomarker history.'}
          </AppText>
        </View>
        <View style={styles.fields}>
          <View style={styles.field}>
          <AppText variant="label" color="textSecondary">Email address</AppText>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            onChangeText={setEmail}
            editable={!busy}
            placeholder="Email address"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            value={email}
          />
          </View>
          <View style={styles.field}>
          <AppText variant="label" color="textSecondary">Password</AppText>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            onChangeText={setPassword}
            editable={!busy}
            onSubmitEditing={() => void submit()}
            placeholder="Password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          </View>
        </View>
        {configurationError ? <AppText accessibilityLiveRegion="polite" color="statusHigh">Sign-in configuration is unavailable.</AppText> : null}
        {message ? <AppText accessibilityLiveRegion="polite" color="textSecondary">{message}</AppText> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy || Boolean(configurationError) || !email.trim() || !password }}
          disabled={busy || Boolean(configurationError) || !email.trim() || !password}
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
  desktopPage: { flexDirection: 'row', gap: spacing.huge, paddingHorizontal: spacing.xxxl },
  introduction: { width: '45%', maxWidth: 520, gap: spacing.lg },
  statement: { maxWidth: 510 },
  introCopy: { maxWidth: 470, fontSize: 16, lineHeight: 25 },
  introRule: { width: 72, height: 2, marginTop: spacing.md, backgroundColor: colors.brand },
  card: { width: '100%', maxWidth: Math.min(440, layout.contentMaxWidth), gap: spacing.xl, padding: spacing.xl, borderTopWidth: 2, borderTopColor: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  desktopCard: { width: 430, padding: spacing.xxl },
  heading: { gap: spacing.sm },
  fields: { gap: spacing.lg }, field: { gap: spacing.sm },
  input: { minHeight: 50, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, backgroundColor: colors.white, color: colors.textPrimary, fontSize: 15 },
  button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.brand },
  buttonPressed: { opacity: 0.72 },
  switchText: { textAlign: 'center' },
  link: { color: colors.brand, fontWeight: '600' },
});
