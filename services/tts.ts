import type { MusicStyle } from '@/types/database';

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TTSConfig {
  voice: TTSVoice;
  speed: number;
  model: 'tts-1' | 'tts-1-hd';
}

export interface GeneratedAudio {
  url: string;
  durationSeconds: number;
  segments: AudioSegment[];
}

export interface AudioSegment {
  type: 'narration' | 'pause';
  startTime: number;
  endTime: number;
  text?: string;
}

const DEFAULT_CONFIG: TTSConfig = {
  voice: 'nova',
  speed: 0.85,
  model: 'tts-1-hd',
};

const PAUSE_DURATION_SECONDS = 45;
const WORDS_PER_MINUTE = 150;

function parseContentWithPauses(content: string): { segments: string[]; pauseIndices: number[] } {
  const parts = content.split('[PAUSE]');
  const segments: string[] = [];
  const pauseIndices: number[] = [];

  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (trimmed) {
      segments.push(trimmed);
      if (index < parts.length - 1) {
        pauseIndices.push(segments.length - 1);
      }
    }
  });

  return { segments, pauseIndices };
}

function estimateSegmentDuration(text: string, speed: number): number {
  const wordCount = text.split(/\s+/).length;
  const baseMinutes = wordCount / WORDS_PER_MINUTE;
  return (baseMinutes * 60) / speed;
}

export function buildAudioTimeline(
  content: string,
  config: TTSConfig = DEFAULT_CONFIG
): AudioSegment[] {
  const { segments, pauseIndices } = parseContentWithPauses(content);
  const timeline: AudioSegment[] = [];
  let currentTime = 0;

  segments.forEach((segment, index) => {
    const duration = estimateSegmentDuration(segment, config.speed);
    
    timeline.push({
      type: 'narration',
      startTime: currentTime,
      endTime: currentTime + duration,
      text: segment,
    });
    
    currentTime += duration;

    if (pauseIndices.includes(index)) {
      timeline.push({
        type: 'pause',
        startTime: currentTime,
        endTime: currentTime + PAUSE_DURATION_SECONDS,
      });
      currentTime += PAUSE_DURATION_SECONDS;
    }
  });

  return timeline;
}

export function getTotalDuration(timeline: AudioSegment[]): number {
  if (timeline.length === 0) return 0;
  return timeline[timeline.length - 1].endTime;
}

export async function generateTTSAudio(
  text: string,
  config: TTSConfig = DEFAULT_CONFIG
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenAI API key not configured, using mock audio');
    return getMockAudioUrl();
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        input: text,
        voice: config.voice,
        speed: config.speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS API error: ${error}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('TTS generation failed:', error);
    return getMockAudioUrl();
  }
}

export async function generateDreamAudio(
  dreamId: string,
  content: string,
  config: TTSConfig = DEFAULT_CONFIG
): Promise<GeneratedAudio> {
  const timeline = buildAudioTimeline(content, config);
  const totalDuration = getTotalDuration(timeline);

  const narrationSegments = timeline.filter(s => s.type === 'narration');
  const fullText = narrationSegments.map(s => s.text).join('\n\n');

  const url = await generateTTSAudio(fullText, config);

  return {
    url,
    durationSeconds: totalDuration,
    segments: timeline,
  };
}

function getMockAudioUrl(): string {
  return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
}

export function isWebSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakWithWebSpeech(
  text: string,
  options: { rate?: number; pitch?: number; voice?: string } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isWebSpeechAvailable()) {
      reject(new Error('Web Speech API not available'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.85;
    utterance.pitch = options.pitch ?? 0.9;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('karen') ||
      v.name.toLowerCase().includes('female')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}

export function stopWebSpeech(): void {
  if (isWebSpeechAvailable()) {
    window.speechSynthesis.cancel();
  }
}

export function getRecommendedVoice(musicStyle: MusicStyle): TTSVoice {
  const voiceMap: Record<MusicStyle, TTSVoice> = {
    ambient: 'nova',
    nature: 'shimmer',
    cosmic: 'echo',
    piano: 'alloy',
    binaural: 'onyx',
    silence: 'nova',
  };
  return voiceMap[musicStyle];
}

export function getRecommendedSpeed(playbackMode: 'preview' | 'full' | 'dream'): number {
  const speedMap = {
    preview: 1.0,
    full: 0.85,
    dream: 0.75,
  };
  return speedMap[playbackMode];
}

export const ttsService = {
  generateTTSAudio,
  generateDreamAudio,
  buildAudioTimeline,
  getTotalDuration,
  getRecommendedVoice,
  getRecommendedSpeed,
};
