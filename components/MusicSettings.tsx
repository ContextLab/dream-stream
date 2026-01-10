import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import { storage } from '@/lib/storage';
import type { MusicStyle } from '@/types/database';

interface MusicSettingsProps {
  onComplete?: () => void;
  showHeader?: boolean;
}

interface MusicOption {
  id: MusicStyle;
  name: string;
  description: string;
  icon: string;
}

const MUSIC_OPTIONS: MusicOption[] = [
  {
    id: 'ambient',
    name: 'Ambient Pads',
    description: 'Soft, evolving synthesizer textures',
    icon: 'musical-notes',
  },
  {
    id: 'nature',
    name: 'Nature Sounds',
    description: 'Rain, ocean waves, forest ambience',
    icon: 'leaf',
  },
  {
    id: 'binaural',
    name: 'Binaural Beats',
    description: 'Frequency entrainment for lucid dreaming',
    icon: 'pulse',
  },
  {
    id: 'cosmic',
    name: 'Cosmic Drones',
    description: 'Deep space-inspired soundscapes',
    icon: 'planet',
  },
  {
    id: 'piano',
    name: 'Soft Piano',
    description: 'Gentle piano melodies',
    icon: 'musical-note',
  },
  {
    id: 'silence',
    name: 'Voice Only',
    description: 'No background music, just narration',
    icon: 'volume-mute',
  },
];

export function MusicSettings({ onComplete, showHeader = true }: MusicSettingsProps) {
  const [selectedStyle, setSelectedStyle] = useState<MusicStyle>('ambient');
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [enableMusic, setEnableMusic] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const prefs = await storage.getPreferences();
    setSelectedStyle(prefs.defaultMusicStyle);
    setMusicVolume(prefs.musicVolume);
    setEnableMusic(prefs.enableMusic);
    setIsLoading(false);
  };

  const handleSelectStyle = async (style: MusicStyle) => {
    setSelectedStyle(style);
    setEnableMusic(style !== 'silence');
    await storage.setPreferences({
      defaultMusicStyle: style,
      enableMusic: style !== 'silence',
    });
  };

  const handleComplete = () => {
    onComplete?.();
  };

  if (isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Ionicons name="musical-notes" size={32} color={colors.primary[400]} />
          <Text variant="h4" weight="bold" color="primary" style={styles.title}>
            Background Music
          </Text>
          <Text variant="bodySmall" color="secondary" align="center">
            Choose ambient sounds to accompany your dream narration
          </Text>
        </View>
      )}

      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {MUSIC_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            style={[
              styles.optionCard,
              selectedStyle === option.id && styles.optionCardSelected,
            ]}
            onPress={() => handleSelectStyle(option.id)}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name={option.icon as any}
                size={24}
                color={selectedStyle === option.id ? colors.primary[400] : colors.gray[400]}
              />
            </View>
            <View style={styles.optionContent}>
              <Text
                variant="body"
                weight="semibold"
                style={selectedStyle === option.id ? styles.selectedText : undefined}
              >
                {option.name}
              </Text>
              <Text variant="caption" color="muted">
                {option.description}
              </Text>
            </View>
            {selectedStyle === option.id && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary[400]} />
            )}
          </Pressable>
        ))}
      </ScrollView>

      {onComplete && (
        <View style={styles.footer}>
          <Button variant="primary" onPress={handleComplete}>
            Done
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.sm,
  },
  optionsList: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[800],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  selectedText: {
    color: colors.primary[400],
  },
  footer: {
    marginTop: spacing.lg,
  },
});
