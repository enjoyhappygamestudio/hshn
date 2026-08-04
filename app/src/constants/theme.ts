import { StyleSheet, Platform } from 'react-native';

export const colors = {
  primary: '#078C86',
  primaryDark: '#066B66',
  navy: '#123A4A',
  coral: '#FF7A59',
  coralDark: '#F0623E',
  white: '#FFFFFF',
  cream: '#FAF8F3',
  mint: '#EAF8F7',
  line: '#E7ECEA',
  muted: '#6B7A80',
  danger: '#D64545',
  overlay: 'rgba(18,58,74,0.45)',
  skeleton: '#EDEFEF',
  skeletonHighlight: '#F6F7F7',
};

export const fonts = {
  display: Platform.select({ ios: 'Be Vietnam Pro', android: 'BeVietnamPro' }),
  numeric: Platform.select({ ios: 'Inter', android: 'Inter' }),
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
};

export const shadows = StyleSheet.create({
  card: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  safeBottom: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
});
