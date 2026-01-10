import { ScrollView, View, StyleSheet, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading, MonoText } from '@/components/ui/Text';
import { colors, spacing, borderRadius } from '@/theme/tokens';

export default function AboutScreen() {
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'About',
          headerShown: true,
          headerStyle: { backgroundColor: colors.gray[950] },
          headerTintColor: colors.gray[100],
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.gray[100]} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <Heading variant="h1" color="primary">
            dream_stream
          </Heading>
          <MonoText color="accent" style={styles.tagline}>
            // guided lucid dreaming
          </MonoText>
        </View>

        <View style={styles.section}>
          <Heading variant="h3" color="primary" style={styles.sectionTitle}>
            What is DreamStream?
          </Heading>
          <Text variant="body" color="secondary" style={styles.paragraph}>
            DreamStream guides you into vivid, conscious dreams through immersive audio journeys.
            Each experience weaves gentle narration with peaceful silences, creating space for your
            imagination to awaken within your dreams.
          </Text>
        </View>

        <View style={styles.section}>
          <Heading variant="h3" color="primary" style={styles.sectionTitle}>
            How to Use
          </Heading>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="body" weight="bold" color="primary">
                  1
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="body" weight="semibold" color="primary">
                  Browse & Preview
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Explore dreams by category. Tap any dream to hear a preview and read the
                  description.
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="body" weight="bold" color="primary">
                  2
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="body" weight="semibold" color="primary">
                  Prepare for Sleep
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Get comfortable in bed. Set your phone nearby with the volume at a gentle level.
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="body" weight="bold" color="primary">
                  3
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="body" weight="semibold" color="primary">
                  Play Full Experience
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Start the dream audio. The narration will guide you through imagery with pauses
                  for your mind to wander and create.
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="body" weight="bold" color="primary">
                  4
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="body" weight="semibold" color="primary">
                  Drift Off
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Let the audio fade as you fall asleep. The suggestions may carry into your dreams,
                  enhancing awareness and creativity.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Heading variant="h3" color="primary" style={styles.sectionTitle}>
            About Lucid Dreaming
          </Heading>
          <Text variant="body" color="secondary" style={styles.paragraph}>
            Lucid dreaming is the experience of becoming aware that you're dreaming while still in
            the dream. This awareness can allow you to explore, create, and even direct your dream
            experiences.
          </Text>
          <Text variant="body" color="secondary" style={styles.paragraph}>
            Our audio guides include gentle reality-check prompts and awareness cues designed to
            increase the likelihood of lucid dreams. The [PAUSE] markers in each script provide
            silent periods for your subconscious to process and respond to the suggestions.
          </Text>
        </View>

        <View style={styles.section}>
          <Heading variant="h3" color="primary" style={styles.sectionTitle}>
            Tips for Best Results
          </Heading>
          <View style={styles.tipList}>
            <View style={styles.tip}>
              <Ionicons name="moon-outline" size={20} color={colors.primary[400]} />
              <Text variant="bodySmall" color="secondary" style={styles.tipText}>
                Use during your natural sleep time, not naps
              </Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="volume-low-outline" size={20} color={colors.primary[400]} />
              <Text variant="bodySmall" color="secondary" style={styles.tipText}>
                Keep volume low enough to be soothing, not distracting
              </Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="repeat-outline" size={20} color={colors.primary[400]} />
              <Text variant="bodySmall" color="secondary" style={styles.tipText}>
                Consistency helps - use the same dreams multiple nights
              </Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="journal-outline" size={20} color={colors.primary[400]} />
              <Text variant="bodySmall" color="secondary" style={styles.tipText}>
                Keep a dream journal to improve recall over time
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Heading variant="h3" color="primary" style={styles.sectionTitle}>
            Credits
          </Heading>
          <Text variant="body" color="secondary" style={styles.paragraph}>
            DreamStream is an open-source project from the Contextual Dynamics Lab at Dartmouth
            College.
          </Text>
          <Pressable
            style={styles.linkButton}
            onPress={() => openLink('https://github.com/ContextLab/dream-stream')}
          >
            <Ionicons name="logo-github" size={20} color={colors.primary[400]} />
            <Text variant="body" color="accent" style={styles.linkText}>
              View on GitHub
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <MonoText color="muted" style={styles.footerText}>
            v1.0.0 | Made with care for dreamers everywhere
          </MonoText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[950],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  tagline: {
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  paragraph: {
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  stepContainer: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  tipList: {
    gap: spacing.sm,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tipText: {
    flex: 1,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  linkText: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  footerText: {
    fontSize: 12,
  },
});
