import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { login } from "../src/api/client";
import { CredentialsSchema } from "../src/schemas/auth";
import { useAuthStore } from "../src/state/authStore";
import { z } from "zod";

export default function Login() {
  const router = useRouter();
  const { setTokens } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      CredentialsSchema.parse({ email, password });
      const bundle = await login({ email, password });
      await setTokens(bundle);
      router.replace("/me");
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.issues[0]?.message ?? "Invalid input");
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
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password (min 8 chars)"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={submitting ? "Logging in..." : "Login"}
        onPress={onSubmit}
        disabled={submitting}
      />

      <View style={styles.spacer} />
      <Button title="Go to Register" onPress={() => router.replace("/register")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10, marginBottom: 10 },
  error: { color: "red", marginBottom: 10 },
  spacer: { height: 8 },
});

