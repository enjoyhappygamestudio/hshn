import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform, ActivityIndicator, View } from 'react-native';
import { RootStackParamList } from '../types';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { VideoTabScreen } from '../screens/VideoTabScreen';
import { CartScreen } from '../screens/CartScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { SuccessScreen } from '../screens/SuccessScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { OrderListScreen } from '../screens/OrderListScreen';
import { AddressScreen } from '../screens/AddressScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import { UserVouchersScreen } from '../screens/UserVouchersScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { VideoPlayerScreen } from '../screens/VideoPlayerScreen';
import { VideoFeedScreen } from '../screens/VideoFeedScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { colors } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9AA7AB',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
        tabBarShowLabel: true,
        lazy: true,
        animation: 'none',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.6 }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="VideoTab"
        component={VideoTabScreen}
        options={{
          tabBarLabel: 'Video',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.6 }}>🎬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrderListScreen}
        options={{
          tabBarLabel: 'Đơn hàng',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.6 }}>🧾</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.6 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { token, isReady, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'simple_push',
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'none' }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Success" component={SuccessScreen} />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
            <Stack.Screen name="OrderList" component={OrderListScreen} />
            <Stack.Screen name="AddressList" component={AddressScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="UserVouchers" component={UserVouchersScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
            <Stack.Screen name="VideoFeed" component={VideoFeedScreen} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'none' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
