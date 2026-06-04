import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, ScrollView, Text, TextInput, View } from "react-native";
import { register } from "../src/api/client";
import { CredentialsSchema } from "../src/schemas/auth";
import { useAuthStore } from "../src/state/authStore";
import { ScreenIntro } from "../src/ui/ScreenIntro";
import { shared } from "../src/ui/styles";
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
    <ScrollView contentContainerStyle={shared.screen}>
      <ScreenIntro
        title="Register"
        subtitle="POST /api/register — same response shape as login"
      />

      <View style={shared.card}>
        <TextInput
          style={shared.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={shared.input}
          placeholder="Password (min 8 chars)"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />

        {!!error && <Text style={shared.error}>{error}</Text>}

        <Button
          title={submitting ? "Registering..." : "Register"}
          onPress={onSubmit}
          disabled={submitting}
        />
      </View>

      <Button title="Go to Login" onPress={() => router.replace("/login")} />
    </ScrollView>
  );
}
