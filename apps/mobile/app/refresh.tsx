import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { refresh as refreshApi } from "../src/api/client";
import { RefreshRequestSchema } from "../src/schemas/auth";
import { useAuthStore } from "../src/state/authStore";
import { ApiError } from "../src/api/client";
import { z } from "zod";

export default function Refresh() {
  const router = useRouter();
  const { hydrated, refreshToken, setTokens, clearTokens, hydrate } =
    useAuthStore((s) => ({
      hydrated: s.hydrated,
      refreshToken: s.refreshToken,
      setTokens: s.setTokens,
      clearTokens: s.clearTokens,
      hydrate: s.hydrate,
    }));

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const onRefresh = async () => {
    setError(null);
    if (!refreshToken) {
      setError("No refresh token available.");
      return;
    }
    setSubmitting(true);
    try {
      RefreshRequestSchema.parse({ refreshToken });
      const bundle = await refreshApi({ refreshToken });
      await setTokens(bundle);
      router.replace("/me");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`Refresh failed (${e.status}): ${e.message}`);
      } else if (e instanceof z.ZodError) {
        setError(e.issues[0]?.message ?? "Invalid refresh request");
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Request failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onLogout = async () => {
    await clearTokens();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Refresh token</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={submitting ? "Refreshing..." : "Refresh"}
        onPress={onRefresh}
        disabled={submitting}
      />

      <View style={styles.spacer} />
      <Button title="Log in with another account" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  error: { color: "red", marginBottom: 12 },
  spacer: { height: 12 },
});

