import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { ApiError, logout } from "../src/api/client";
import { useAuthStore } from "../src/state/authStore";
import { ScreenIntro } from "../src/ui/ScreenIntro";
import { shared } from "../src/ui/styles";

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
    <ScrollView contentContainerStyle={shared.screen}>
      <ScreenIntro
        title="POST /api/logout"
        subtitle="Revokes the refresh token server-side, then clears secure storage."
      />

      <View style={shared.card}>
        {!!error && <Text style={shared.error}>{error}</Text>}

        <Button
          title={submitting ? "Logging out..." : "Confirm logout"}
          onPress={onLogout}
          disabled={submitting}
        />
      </View>

      <Button title="Back to Me" onPress={() => router.replace("/me")} />
    </ScrollView>
  );
}
