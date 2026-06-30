import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { login as loginRequest, register as registerRequest } from "@/api/client";

const TOKEN_KEY = "fawn_access_token";

type AuthContextValue = {
  token: string | null;
  isBootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((savedToken) => {
        if (mounted) setToken(savedToken);
      })
      .finally(() => {
        if (mounted) setIsBootstrapping(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    isBootstrapping,
    async signIn(email, password) {
      const result = await loginRequest(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, result.access_token);
      setToken(result.access_token);
    },
    async signUp(payload) {
      const result = await registerRequest(payload);
      await SecureStore.setItemAsync(TOKEN_KEY, result.access_token);
      setToken(result.access_token);
    },
    async signOut() {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
    }
  }), [isBootstrapping, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
