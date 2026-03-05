import { create } from "zustand";

export type Screen = "overview" | "monthly-close" | "drivers" | "timeline" | "snapshot" | "corrections" | "data" | "settings";

interface AppState {
  screen: Screen;
  horizonMonths: number;
  selectedMonth: string;
  setScreen: (screen: Screen) => void;
  setHorizonMonths: (horizon: number) => void;
  setSelectedMonth: (month: string) => void;
}

const now = new Date();
const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

export const useAppStore = create<AppState>((set) => ({
  screen: "overview",
  horizonMonths: 24,
  selectedMonth: defaultMonth,
  setScreen: (screen) => set({ screen }),
  setHorizonMonths: (horizonMonths) => set({ horizonMonths }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
}));
