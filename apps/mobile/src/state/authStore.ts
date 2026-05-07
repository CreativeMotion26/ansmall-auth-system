import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { TokenBundleSchema, type TokenBundle } from "../schemas/auth";

type AuthUser = TokenBundle["user"];

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

type AuthState = {
  hydrated: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;

  hydrate: () => Promise<void>;
  setTokens: (bundle: TokenBundle) => Promise<void>;
  clearTokens: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  accessToken: undefined,
  refreshToken: undefined,
  user: undefined,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);

      set({
        hydrated: true,
        accessToken: accessToken ?? undefined,
        refreshToken: refreshToken ?? undefined,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setTokens: async (bundle) => {
    const parsed = TokenBundleSchema.parse(bundle);
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, parsed.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, parsed.refreshToken),
    ]);

    set({
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user,
    });
  },

  clearTokens: async () => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
    set({ accessToken: undefined, refreshToken: undefined, user: undefined });
  },
}));

