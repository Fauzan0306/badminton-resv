'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';


export type CartItem = {
  id: string;          // courtId-date-slotId
  courtId: string;
  courtName: string;
  date: string;        // YYYY-MM-DD
  slotLabel: string;   // "07:00 – 08:00"
  price: number;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        if (get().items.some(i => i.id === item.id)) return;
        set({ items: [...get().items, item] });
      },
      remove: (id) => set({ items: get().items.filter(i => i.id !== id) }),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, i) => s + i.price, 0),
      count: () => get().items.length,
    }),
    { name: 'badminton-cart' }
  )
);
