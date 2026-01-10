import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  iconColor?: string;
  iconSize?: number;
}

export function EmptyState({
  icon = 'cloud-outline',
  title,
  message,
  iconColor = colors.gray[500],
  iconSize = 64,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.icon} />
      <Text variant="h4" color="muted" align="center" style={styles.title}>
        {title}
      </Text>
      {message && (
        <Text variant="bodySmall" color="muted" align="center" style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
  icon: {
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  title: {
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 280,
  },
});
