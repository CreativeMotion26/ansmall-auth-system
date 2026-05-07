import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ApiError, me as meApi } from "../src/api/client";
import { useAuthStore } from "../src/state/authStore";

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
      if (!accessToken) throw new Error("No access token");
      const res = await meApi(accessToken);
      return res.user;
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
      <View style={styles.container}>
        <Text style={styles.title}>Not authenticated</Text>
        <Button title="Go to Login" onPress={() => router.replace("/login")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GET /api/me</Text>

      {meQuery.isLoading && <Text>Loading...</Text>}

      {!meQuery.isLoading && meQuery.data && (
        <>
          <Text style={styles.ok}>User ID: {meQuery.data.id}</Text>
          <Text style={styles.ok}>Email: {meQuery.data.email}</Text>
        </>
      )}

      {!meQuery.isLoading && meQuery.error && (
        <>
          <Text style={styles.error}>Error: {String(meQuery.error)}</Text>

          {meQuery.error instanceof ApiError &&
            meQuery.error.status === 401 &&
            refreshToken && (
              <>
                <Text style={styles.hint}>
                  Access token rejected. Try refreshing:
                </Text>
                <Button
                  title="Go to Refresh"
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

      <View style={styles.spacer} />
      <Button title="Logout" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  ok: { fontSize: 16 },
  error: { color: "red", marginBottom: 8 },
  hint: { color: "#444", marginBottom: 8 },
  spacer: { height: 12 },
});

