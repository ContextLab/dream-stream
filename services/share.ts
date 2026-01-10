import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { APP_CONFIG } from '@/lib/constants';
import type { Dream } from '@/types/database';

export function generateDreamUrl(dreamId: string): string {
  return Linking.createURL(`dream/${dreamId}`, {
    scheme: APP_CONFIG.scheme,
  });
}

export function generateWebUrl(dreamId: string): string {
  return `https://dreamstream.app/dream/${dreamId}`;
}

export interface ShareContent {
  title: string;
  message: string;
  url: string;
}

export function generateShareContent(dream: Dream): ShareContent {
  const url = generateWebUrl(dream.id);
  const title = dream.title;
  const message = `Check out "${dream.title}" on Dream Stream`;

  return {
    title,
    message,
    url,
  };
}

export async function shareDream(dream: Dream): Promise<boolean> {
  const { title, message, url } = generateShareContent(dream);

  try {
    const result = await Share.share(
      Platform.select({
        ios: {
          title,
          message: `${message}\n\n${url}`,
        },
        android: {
          title,
          message: `${message}\n\n${url}`,
        },
        default: {
          title,
          message: `${message}\n\n${url}`,
        },
      })!
    );

    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

export async function shareDreamUrl(dreamId: string, title: string): Promise<boolean> {
  const url = generateWebUrl(dreamId);
  const message = `Check out "${title}" on Dream Stream\n\n${url}`;

  try {
    const result = await Share.share({
      title,
      message,
    });

    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

export function parseDreamIdFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    
    if (parsed.path?.startsWith('dream/')) {
      return parsed.path.replace('dream/', '');
    }
    
    if (parsed.queryParams?.dreamId) {
      return parsed.queryParams.dreamId as string;
    }
    
    const webMatch = url.match(/dreamstream\.app\/dream\/([a-zA-Z0-9-]+)/);
    if (webMatch) {
      return webMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}
