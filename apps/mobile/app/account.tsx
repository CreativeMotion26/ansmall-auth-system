import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Button, ScrollView, Text, TextInput, View } from "react-native";
import { ApiError, changePassword, deleteAccount, logoutAll } from "../src/api/client";
import { ChangePasswordSchema, DeleteAccountSchema } from "../src/schemas/auth";
import { useAuthStore } from "../src/state/authStore";
import { ScreenIntro } from "../src/ui/ScreenIntro";
import { shared } from "../src/ui/styles";
import { z } from "zod";

export default function Account() {
  const router = useRouter();
  const { accessToken, refreshToken, clearTokens } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const onChangePassword = async () => {
    if (!accessToken) return;
    setSubmitting("password");
    setError(null);
    setMessage(null);
    try {
      ChangePasswordSchema.parse({ currentPassword, newPassword });
      const res = await changePassword(accessToken, {
        currentPassword,
        newPassword,
      });
      setMessage(res.message);
      setCurrentPassword("");
      setNewPassword("");
      await clearTokens();
      router.replace("/login");
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else if (e instanceof z.ZodError) setError(e.issues[0]?.message ?? "Invalid input");
      else if (e instanceof Error) setError(e.message);
      else setError("Request failed");
    } finally {
      setSubmitting(null);
    }
  };

  const onLogoutAll = async () => {
    if (!accessToken) return;
    setSubmitting("logout-all");
    setError(null);
    setMessage(null);
    try {
      const res = await logoutAll(accessToken);
      setMessage(`${res.message} (${res.revoked} revoked)`);
      await clearTokens();
      router.replace("/login");
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else if (e instanceof Error) setError(e.message);
      else setError("Request failed");
    } finally {
      setSubmitting(null);
    }
  };

  const onDeleteAccount = async () => {
    if (!accessToken) return;
    setSubmitting("delete");
    setError(null);
    setMessage(null);
    try {
      DeleteAccountSchema.parse({ password: deletePassword });
      const res = await deleteAccount(accessToken, { password: deletePassword });
      setMessage(res.message);
      await clearTokens();
      router.replace("/login");
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else if (e instanceof z.ZodError) setError(e.issues[0]?.message ?? "Invalid input");
      else if (e instanceof Error) setError(e.message);
      else setError("Request failed");
    } finally {
      setSubmitting(null);
    }
  };

  if (!accessToken) {
    return (
      <ScrollView contentContainerStyle={shared.screen}>
        <ScreenIntro title="Not authenticated" subtitle="Log in first." />
        <Button title="Go to Login" onPress={() => router.replace("/login")} />
      </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Account" }} />
      <ScrollView contentContainerStyle={shared.screen}>
      <ScreenIntro
        title="Account"
        subtitle="PATCH /api/me/password, POST /api/logout-all, DELETE /api/me"
      />

      <View style={shared.card}>
        <Text style={shared.hint}>Change password (revokes all refresh tokens)</Text>
        <TextInput
          style={shared.input}
          placeholder="Current password"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          style={shared.input}
          placeholder="New password (min 8 chars)"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Button
          title={submitting === "password" ? "Updating..." : "Change password"}
          onPress={onChangePassword}
          disabled={submitting !== null}
        />
      </View>

      <View style={shared.card}>
        <Text style={shared.hint}>Sign out on every device</Text>
        <Button
          title={submitting === "logout-all" ? "Revoking..." : "Logout everywhere"}
          onPress={onLogoutAll}
          disabled={submitting !== null}
        />
      </View>

      <View style={shared.card}>
        <Text style={shared.hint}>Permanently delete this account</Text>
        <TextInput
          style={shared.input}
          placeholder="Confirm password"
          secureTextEntry
          value={deletePassword}
          onChangeText={setDeletePassword}
        />
        <Button
          title={submitting === "delete" ? "Deleting..." : "Delete account"}
          onPress={onDeleteAccount}
          disabled={submitting !== null}
        />
      </View>

      {!!message && <Text style={shared.ok}>{message}</Text>}
      {!!error && <Text style={shared.error}>{error}</Text>}

      <Button title="Back to Me" onPress={() => router.replace("/me")} />
      <Button
        title="Logout this device"
        onPress={() => router.replace(refreshToken ? "/logout" : "/login")}
      />
    </ScrollView>
    </>
  );
}
