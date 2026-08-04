import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { BackButton } from '../components/BackButton';

interface PlaceholderScreenProps {
  navigation: any;
  route: any;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ navigation, route }) => {
  const { icon, title } = route.params || {};
  return (
    <SafeAreaView style={commonStyles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{title || ''}</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.icon}>{icon || '📄'}</Text>
        <Text style={styles.desc}>Tính năng đang phát triển</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { fontSize: 64, marginBottom: 16, opacity: 0.5 },
  desc: { fontSize: 14, color: colors.muted },
});
