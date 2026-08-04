import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => (
  <View
    style={[
      styles.skeleton,
      { width: width as any, height, borderRadius },
      style,
    ]}
  />
);

export const HomeSkeleton: React.FC = () => (
  <View style={styles.container}>
    <SkeletonLoader height={44} />
    <SkeletonLoader height={36} style={{ marginTop: 12 }} />
    <View style={styles.catRow}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonLoader key={i} width={60} height={60} borderRadius={18} />
      ))}
    </View>
    <SkeletonLoader height={20} style={{ marginTop: 16 }} />
    <View style={styles.prodRow}>
      {[1, 2].map((i) => (
        <SkeletonLoader key={i} width={150} height={240} borderRadius={12} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 18 },
  catRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  prodRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  skeleton: {
    backgroundColor: colors.skeleton,
  },
});
