import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

export function Screen({ children }: PropsWithChildren) {
  return <View style={styles.screen}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children }: PropsWithChildren) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Panel({ children }: PropsWithChildren) {
  return <View style={styles.panel}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.bg,
    padding: tokens.space.lg,
    justifyContent: "center",
    gap: tokens.space.md
  },
  title: {
    color: tokens.color.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0
  },
  body: {
    color: tokens.color.muted,
    fontSize: 16,
    lineHeight: 24
  },
  panel: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    gap: tokens.space.sm
  }
});
