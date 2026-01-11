import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { SleepDebugPanel } from '@/components/SleepDebugPanel';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const [showSleepDebug, setShowSleepDebug] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Heading variant="h2" color="primary">
            Settings
          </Heading>
        </View>

        <View style={styles.menuSection}>
          <MenuRow
            icon="heart-outline"
            label="My Favorites"
            onPress={() => router.push('/(tabs)/favorites')}
          />
          <MenuRow icon="volume-medium-outline" label="Volume & Audio" onPress={() => {}} />
          <MenuRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
          <Link href={'/about' as any} asChild>
            <Pressable style={styles.menuRow}>
              <Ionicons name="information-circle-outline" size={24} color={colors.gray[400]} />
              <Text variant="body" color="primary" style={styles.menuLabel}>
                About DreamStream
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[500]} />
            </Pressable>
          </Link>
        </View>

        <View style={styles.debugSection}>
          <MenuRow
            icon="bug-outline"
            label="Sleep Detection Debug"
            onPress={() => setShowSleepDebug(!showSleepDebug)}
          />
          {showSleepDebug && <SleepDebugPanel />}
        </View>

        <View style={styles.versionSection}>
          <Text variant="caption" color="muted">
            Version 1.0.0
          </Text>
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
  versionSection: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  debugSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#252542',
  },
});
