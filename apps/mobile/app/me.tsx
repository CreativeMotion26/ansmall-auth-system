import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ApiError, me as meApi, refresh as refreshApi } from "../src/api/client";
import { useAuthStore } from "../src/state/authStore";
import { ScreenIntro } from "../src/ui/ScreenIntro";
import { shared } from "../src/ui/styles";

export default function Me() {
  const router = useRouter();
  const { hydrated, accessToken, refreshToken, hydrate, clearTokens } =
    useAuthStore((s) => ({
      hydrated: s.hydrated,
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
      hydrate: s.hydrate,
      clearTokens: s.clearTokens,
    }));

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const queryKey = useMemo(
    () => ["me", accessToken ?? "none"],
    [accessToken],
  );

  const meQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const state = useAuthStore.getState();
      const token = state.accessToken;
      if (!token) throw new Error("No access token");

      try {
        const res = await meApi(token);
        return res.user;
      } catch (e) {
        if (
          e instanceof ApiError &&
          e.status === 401 &&
          state.refreshToken
        ) {
          const bundle = await refreshApi({ refreshToken: state.refreshToken });
          await state.setTokens(bundle);
          const retry = await meApi(bundle.accessToken);
          return retry.user;
        }
        throw e;
      }
    },
    enabled: !!accessToken,
    retry: false,
  });

  const onLogout = async () => {
    await clearTokens();
    router.replace("/logout");
  };

  if (!accessToken) {
    return (
      <ScrollView contentContainerStyle={shared.screen}>
        <ScreenIntro title="Not authenticated" subtitle="Log in or register first." />
        <Button title="Go to Login" onPress={() => router.replace("/login")} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={shared.screen}>
      <ScreenIntro
        title="GET /api/me"
        subtitle="Bearer access token. On 401, this screen auto-rotates refresh when possible."
      />

      <View style={shared.card}>
        {meQuery.isLoading && <Text>Loading...</Text>}

        {!meQuery.isLoading && meQuery.data && (
          <>
            <Text style={shared.ok}>User ID: {meQuery.data.id}</Text>
            <Text style={shared.ok}>Email: {meQuery.data.email}</Text>
          </>
        )}

        {!meQuery.isLoading && meQuery.error && (
          <>
            <Text style={shared.error}>Error: {String(meQuery.error)}</Text>

            {meQuery.error instanceof ApiError &&
              meQuery.error.status === 401 &&
              refreshToken && (
                <>
                  <Text style={shared.hint}>
                    Auto-refresh failed. Try manual refresh:
                  </Text>
                  <Button
                    title="POST /api/refresh"
                    onPress={() => router.replace("/refresh")}
                  />
                </>
              )}

            {meQuery.error instanceof ApiError &&
              meQuery.error.status === 401 &&
              !refreshToken && (
                <Button
                  title="Log in again"
                  onPress={() => router.replace("/login")}
                />
              )}
          </>
        )}
      </View>

      <Button title="POST /api/logout" onPress={onLogout} />
      <Button title="Manual refresh" onPress={() => router.replace("/refresh")} />
    </ScrollView>
  );
}
