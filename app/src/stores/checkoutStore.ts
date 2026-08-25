import { create } from 'zustand';
import { PaymentMethod, DeliveryState } from '../types';

interface CheckoutStore {
  delivery: DeliveryState;
  paymentMethod: PaymentMethod | null;
  note: string;
  customShipFee: number | null;

  setDeliveryMode: (mode: 'hoatoc' | 'express2h' | 'appointment') => void;
  setDeliveryDate: (date: string | null) => void;
  setDeliveryTimeSlot: (slot: string | null) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  setNote: (note: string) => void;
  setCustomShipFee: (fee: number) => void;

  deliveryIsValid: () => boolean;
  currentShipFee: () => number;
  reset: () => void;
}

const initialDelivery: DeliveryState = {
  mode: 'express2h',
  date: null,
  timeSlot: null,
};

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  delivery: { ...initialDelivery },
  paymentMethod: 'cod',
  note: '',
  customShipFee: null,

  setDeliveryMode: (mode) => {
    if (mode === 'hoatoc' || mode === 'express2h') {
      set({ delivery: { mode, date: null, timeSlot: null } });
    } else {
      const today = new Date().toISOString().split('T')[0];
      set({ delivery: { mode: 'appointment', date: today, timeSlot: null } });
    }
  },

  setDeliveryDate: (date) => {
    set({ delivery: { ...get().delivery, date } });
  },

  setDeliveryTimeSlot: (timeSlot) => {
    set({ delivery: { ...get().delivery, timeSlot } });
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setNote: (note) => set({ note }),

  setCustomShipFee: (fee) => set({ customShipFee: fee }),

  deliveryIsValid: () => {
    const d = get().delivery;
    if (d.mode === 'hoatoc' || d.mode === 'express2h') return true;
    if (d.mode === 'appointment') return !!(d.date && d.timeSlot);
    return false;
  },

  currentShipFee: () => {
    const custom = get().customShipFee;
    if (custom !== null) return custom;
    return 0;
  },

  reset: () => {
    set({
      delivery: { ...initialDelivery },
      paymentMethod: 'cod',
      note: '',
      customShipFee: null,
    });
  },
}));
