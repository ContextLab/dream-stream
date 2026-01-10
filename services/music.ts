import { Audio, AVPlaybackStatus } from 'expo-av';
import type { MusicStyle } from '@/types/database';

export interface MusicTrack {
  style: MusicStyle;
  url: string;
  name: string;
  durationSeconds: number;
}

const MUSIC_LIBRARY: Record<MusicStyle, MusicTrack[]> = {
  ambient: [
    {
      style: 'ambient',
      url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      name: 'Ambient Dreams',
      durationSeconds: 180,
    },
  ],
  nature: [
    {
      style: 'nature',
      url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
      name: 'Forest Rain',
      durationSeconds: 180,
    },
  ],
  cosmic: [
    {
      style: 'cosmic',
      url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3',
      name: 'Space Drift',
      durationSeconds: 180,
    },
  ],
  piano: [
    {
      style: 'piano',
      url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3',
      name: 'Gentle Keys',
      durationSeconds: 180,
    },
  ],
  binaural: [
    {
      style: 'binaural',
      url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3',
      name: 'Theta Waves',
      durationSeconds: 180,
    },
  ],
  silence: [],
};

export interface MusicPlayerState {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  volume: number;
  intensity: number;
}

class MusicService {
  private sound: Audio.Sound | null = null;
  private currentStyle: MusicStyle = 'ambient';
  private volume: number = 0.3;
  private intensity: number = 0.5;
  private isLooping: boolean = true;

  async initialize(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  async loadTrack(style: MusicStyle): Promise<void> {
    if (style === 'silence') {
      await this.stop();
      return;
    }

    const tracks = MUSIC_LIBRARY[style];
    if (!tracks || tracks.length === 0) {
      console.warn(`No tracks available for style: ${style}`);
      return;
    }

    const track = tracks[Math.floor(Math.random() * tracks.length)];

    await this.unload();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        {
          shouldPlay: false,
          isLooping: this.isLooping,
          volume: this.volume * this.intensity,
        }
      );
      
      this.sound = sound;
      this.currentStyle = style;
    } catch (error) {
      console.error('Failed to load music track:', error);
    }
  }

  async play(): Promise<void> {
    if (this.sound) {
      await this.sound.playAsync();
    }
  }

  async pause(): Promise<void> {
    if (this.sound) {
      await this.sound.pauseAsync();
    }
  }

  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.setPositionAsync(0);
    }
  }

  async unload(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.sound) {
      await this.sound.setVolumeAsync(this.volume * this.intensity);
    }
  }

  async setIntensity(intensity: number): Promise<void> {
    this.intensity = Math.max(0, Math.min(1, intensity));
    if (this.sound) {
      await this.sound.setVolumeAsync(this.volume * this.intensity);
    }
  }

  async fadeToIntensity(targetIntensity: number, durationMs: number = 2000): Promise<void> {
    const startIntensity = this.intensity;
    const steps = 20;
    const stepDuration = durationMs / steps;
    const intensityStep = (targetIntensity - startIntensity) / steps;

    for (let i = 0; i <= steps; i++) {
      await this.setIntensity(startIntensity + intensityStep * i);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
  }

  async fadeIn(durationMs: number = 3000): Promise<void> {
    await this.setIntensity(0);
    await this.play();
    await this.fadeToIntensity(0.5, durationMs);
  }

  async fadeOut(durationMs: number = 3000): Promise<void> {
    await this.fadeToIntensity(0, durationMs);
    await this.pause();
  }

  getCurrentStyle(): MusicStyle {
    return this.currentStyle;
  }

  isLoaded(): boolean {
    return this.sound !== null;
  }
}

export const musicService = new MusicService();

export function getStyleForSegmentType(segmentType: 'narration' | 'pause'): number {
  return segmentType === 'pause' ? 0.7 : 0.3;
}

export function getMoodIntensity(text: string): number {
  const calmWords = ['peace', 'calm', 'gentle', 'soft', 'quiet', 'still', 'rest', 'float'];
  const intenseWords = ['bright', 'powerful', 'vast', 'infinite', 'energy', 'vibrant', 'alive'];
  
  const lowerText = text.toLowerCase();
  let calmScore = 0;
  let intenseScore = 0;

  calmWords.forEach(word => {
    if (lowerText.includes(word)) calmScore++;
  });

  intenseWords.forEach(word => {
    if (lowerText.includes(word)) intenseScore++;
  });

  const totalScore = calmScore + intenseScore;
  if (totalScore === 0) return 0.4;

  return 0.2 + (intenseScore / totalScore) * 0.5;
}
