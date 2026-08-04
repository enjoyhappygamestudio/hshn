import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Customer } from '../types';
import { login as apiLogin, register as apiRegister, setApiToken } from '../services/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthStore {
  customer: Customer | null;
  token: string | null;
  isLoading: boolean;
  isReady: boolean;

  init: () => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCustomer: (updates: Partial<Customer>) => Promise<void>;
}

async function saveToken(token: string) {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function saveCustomer(customer: Customer) {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(customer));
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function getCustomer(): Promise<Customer | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function clearStorage() {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {}
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  customer: null,
  token: null,
  isLoading: false,
  isReady: false,

  init: async () => {
    const [token, customer] = await Promise.all([getToken(), getCustomer()]);
    setApiToken(token);
    set({ token, customer, isReady: true });
  },

  login: async (phone, password) => {
    set({ isLoading: true });
    try {
      const res = await apiLogin(phone, password);
      const { customer, token } = res as { customer: Customer; token: string };
      setApiToken(token);
      await Promise.all([saveToken(token), saveCustomer(customer)]);
      set({ customer, token, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (name, phone, password, email) => {
    set({ isLoading: true });
    try {
      const res = await apiRegister(name, phone, password, email);
      const { customer, token } = res as { customer: Customer; token: string };
      setApiToken(token);
      await Promise.all([saveToken(token), saveCustomer(customer)]);
      set({ customer, token, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    setApiToken(null);
    await clearStorage();
    set({ customer: null, token: null });
  },

  updateCustomer: async (updates) => {
    const current = get().customer;
    if (!current) return;
    const updated = { ...current, ...updates };
    await saveCustomer(updated);
    set({ customer: updated });
  },
}));
