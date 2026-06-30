import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Screen, Title, Body } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { tokens } from "@/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)/dashboard");
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unable to log in.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Welcome back.</Title>
      <Body>Sign in to reach your FAWN dashboard.</Body>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={tokens.color.muted} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={tokens.color.muted} value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.primary, loading && styles.disabled]} onPress={handleLogin} disabled={loading || !email || !password}>
        <Text style={styles.primaryText}>{loading ? "Logging in..." : "Log in"}</Text>
      </Pressable>
      <Link href="/signup" style={styles.link}>Create an account</Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, color: tokens.color.text, padding: tokens.space.md, fontSize: 16 },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#04100d", fontWeight: "800" },
  error: { color: tokens.color.danger, fontWeight: "700" },
  link: { color: tokens.color.green, textAlign: "center", fontWeight: "700" }
});
