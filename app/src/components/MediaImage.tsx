import React from 'react';
import { Image, ImageProps } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps['contentFit'];
  recyclingKey?: string;
};

/**
 * Cached image (memory + disk). RN Image re-downloads every mount;
 * expo-image keeps decoded bitmaps and HTTP cache across screens.
 */
export function MediaImage({ uri, style, contentFit = 'cover', recyclingKey }: Props) {
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={120}
      recyclingKey={recyclingKey || uri}
    />
  );
}

export async function prefetchMedia(urls: Array<string | null | undefined>) {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  await Promise.allSettled(unique.map((u) => Image.prefetch(u, 'memory-disk')));
}
