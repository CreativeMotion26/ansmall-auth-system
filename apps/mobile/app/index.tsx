import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuthStore } from "../src/state/authStore";

export default function Index() {
  const { hydrated, accessToken, refreshToken, hydrate } = useAuthStore(
    (s) => ({
      hydrated: s.hydrated,
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
      hydrate: s.hydrate,
    }),
  );

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (accessToken) return <Redirect href="/me" />;
  if (refreshToken) return <Redirect href="/refresh" />;
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

