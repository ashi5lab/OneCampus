import { create } from 'zustand';

export const useTopbarStore = create((set) => ({
  config: null,
  setConfig: (config) => set({ config }),
  clearConfig: () => set({ config: null })
}));
