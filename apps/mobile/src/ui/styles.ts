import { StyleSheet } from "react-native";

export const colors = {
  border: "rgba(127, 127, 127, 0.35)",
  card: "rgba(127, 127, 127, 0.08)",
  muted: "#666",
  error: "#b00020",
  ok: "#0a7a2f",
};

export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.card,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  error: {
    color: colors.error,
  },
  ok: {
    color: colors.ok,
    fontSize: 16,
  },
  hint: {
    color: colors.muted,
  },
  spacer: {
    height: 8,
  },
});
