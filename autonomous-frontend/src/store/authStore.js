import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  operatorId: null,
  authenticate: (id) => set({ isAuthenticated: true, operatorId: id }),
  terminateSession: () => set({ isAuthenticated: false, operatorId: null }),
}));
