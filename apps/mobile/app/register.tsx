import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { register } from "../src/api/client";
import { CredentialsSchema } from "../src/schemas/auth";
import { useAuthStore } from "../src/state/authStore";
import { z } from "zod";

export default function Register() {
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
      const bundle = await register({ email, password });
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
      <Text style={styles.title}>Register</Text>

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

      <Button title={submitting ? "Registering..." : "Register"} onPress={onSubmit} disabled={submitting} />
      <View style={styles.spacer} />
      <Button title="Go to Login" onPress={() => router.replace("/login")} />

      <View style={styles.spacer} />
      <Button
        title="Need to test API response?"
        onPress={() => Alert.alert("Tip", "You can also use the gateway UI at http://localhost:3000")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10 },
  error: { color: "red" },
  spacer: { height: 8 },
});

