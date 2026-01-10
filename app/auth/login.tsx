import { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Stack, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail, validatePassword } from '@/services/auth';
import { colors, spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateForm = useCallback(() => {
    const errors: typeof fieldErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSignIn = useCallback(async () => {
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    try {
      await signIn({ email, password });
      router.replace('/(tabs)/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  }, [email, password, signIn, router, validateForm]);

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
            <Heading variant="h1" color="primary">Welcome Back</Heading>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Sign in to continue your journey
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              secureTextEntry
              autoCapitalize="none"
            />

            <Button
              onPress={handleSignIn}
              isLoading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
            >
              Sign In
            </Button>
          </View>

          <View style={styles.footer}>
            <Text variant="bodySmall" color="muted">
              Don't have an account?{' '}
            </Text>
            <Link href="/auth/signup" asChild>
              <Pressable>
                <Text variant="bodySmall" color="primary" weight="semibold">
                  Sign Up
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
