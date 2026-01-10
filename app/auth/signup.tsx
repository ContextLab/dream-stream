import { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Stack, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail, validatePassword, validateDisplayName } from '@/services/auth';
import { colors, spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    displayName?: string;
  }>({});

  const validateForm = useCallback(() => {
    const errors: typeof fieldErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;
    
    const nameError = validateDisplayName(displayName);
    if (nameError) errors.displayName = nameError;
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password, displayName]);

  const handleSignUp = useCallback(async () => {
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    try {
      await signUp({ email, password, displayName: displayName || undefined });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    }
  }, [email, password, displayName, signUp, router, validateForm]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>

          <View style={styles.header}>
            <Heading variant="h1" color="primary">Create Account</Heading>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Join Dream Stream to save your favorites
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text variant="bodySmall" color="error" style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Display Name (optional)"
              placeholder="How should we call you?"
              value={displayName}
              onChangeText={setDisplayName}
              error={fieldErrors.displayName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              secureTextEntry
              autoCapitalize="none"
            />

            <Button
              onPress={handleSignUp}
              isLoading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
            >
              Create Account
            </Button>
          </View>

          <View style={styles.footer}>
            <Text variant="bodySmall" color="muted">
              Already have an account?{' '}
            </Text>
            <Link href="/auth/login" asChild>
              <Pressable>
                <Text variant="bodySmall" color="primary" weight="semibold">
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  errorText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  form: {
    gap: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
