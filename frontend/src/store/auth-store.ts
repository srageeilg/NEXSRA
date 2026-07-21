import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
  businessId?: string | null;
  business?: { name: string; logoUrl?: string | null; status: string } | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  currency: string;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
  setCurrency: (currency: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isHydrated: false,
  currency: "NPR",
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null, currency: "NPR" }),
  setHydrated: (value) => set({ isHydrated: value }),
  setCurrency: (currency) => set({ currency }),
}));
