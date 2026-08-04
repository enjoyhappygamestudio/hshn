import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface BackButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
  style?: any;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  color = colors.navy,
  size = 20,
  style,
}) => (
  <TouchableOpacity
    style={[styles.btn, style]}
    onPress={onPress}
    activeOpacity={0.6}
  >
    <Feather name="arrow-left" size={size} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
