import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "../src/state/authStore";

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const { hydrated, hydrate } = useAuthStore((s) => ({
    hydrated: s.hydrated,
    hydrate: s.hydrate,
  }));

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  return children;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthHydrator>
            <Stack
              screenOptions={{
                headerShown: true,
                title: "ansmall-auth",
              }}
            />
          </AuthHydrator>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
