import { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { colors, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (err) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  }, [signOut]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Heading variant="h2" color="primary">Profile</Heading>
        </View>
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={80} color={colors.gray[500]} />
          <Text variant="h4" color="primary" style={styles.guestTitle}>
            Welcome to Dream Stream
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.guestSubtitle}>
            Sign in to save your favorites and track your dream journey
          </Text>
          <View style={styles.authButtons}>
            <Link href="/auth/login" asChild>
              <Button variant="primary" style={styles.authButton}>
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup" asChild>
              <Button variant="outline" style={styles.authButton}>
                Create Account
              </Button>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Heading variant="h2" color="primary">Profile</Heading>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <View style={styles.avatar}>
                <Text variant="h2" color="primary">
                  {(user.display_name || user.email)?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            ) : (
              <View style={styles.avatar}>
                <Text variant="h2" color="primary">
                  {(user?.display_name || user?.email)?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <Text variant="h4" color="primary" style={styles.userName}>
            {user?.display_name || 'Dream Explorer'}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {user?.email}
          </Text>
        </View>

        <View style={styles.menuSection}>
          <MenuRow icon="heart-outline" label="My Favorites" onPress={() => router.push('/(tabs)/favorites')} />
          <MenuRow icon="time-outline" label="Watch History" onPress={() => {}} />
          <View style={styles.themeRow}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={24} color={colors.gray[400]} />
            <Text variant="body" color="primary" style={styles.menuLabel}>
              Dark Mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.gray[600], true: colors.primary[500] }}
              thumbColor="#ffffff"
            />
          </View>
          <MenuRow icon="settings-outline" label="Settings" onPress={() => {}} />
          <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
        </View>

        <View style={styles.signOutSection}>
          <Button variant="ghost" onPress={handleSignOut}>
            <Text variant="body" color="error">Sign Out</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface MenuRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}

function MenuRow({ icon, label, onPress }: MenuRowProps) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={24} color={colors.gray[400]} />
      <Text variant="body" color="primary" style={styles.menuLabel}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={colors.gray[500]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  guestTitle: {
    marginTop: spacing.lg,
  },
  guestSubtitle: {
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  authButtons: {
    marginTop: spacing.xl,
    width: '100%',
    gap: spacing.md,
  },
  authButton: {
    width: '100%',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    marginBottom: spacing.xs,
  },
  menuSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#252542',
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuLabel: {
    flex: 1,
    marginLeft: spacing.md,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  signOutSection: {
    padding: spacing.xl,
    alignItems: 'center',
  },
});
