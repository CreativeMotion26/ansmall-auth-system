import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { ApiError, logout } from "../src/api/client";
import { useAuthStore } from "../src/state/authStore";

export default function Logout() {
  const router = useRouter();
  const { hydrated, refreshToken, hydrate, clearTokens } = useAuthStore(
    (s) => ({
      hydrated: s.hydrated,
      refreshToken: s.refreshToken,
      hydrate: s.hydrate,
      clearTokens: s.clearTokens,
    }),
  );

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const onLogout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (refreshToken) {
        await logout({ refreshToken });
      }
      await clearTokens();
      router.replace("/login");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`Logout failed (${e.status}): ${e.message}`);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Request failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logout</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={submitting ? "Logging out..." : "Confirm logout"}
        onPress={onLogout}
        disabled={submitting}
      />

      <View style={styles.spacer} />
      <Button title="Back to Me" onPress={() => router.replace("/me")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  error: { color: "red", marginBottom: 12 },
  spacer: { height: 12 },
});

