import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Body, Screen, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { tokens } from "@/theme/tokens";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [location, setLocation] = useState("");
  const [military, setMilitary] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  async function handleSignup() {
    setError("");
    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        school: school.trim(),
        location: location.trim(),
        military_status: military ? "military_veteran_or_rotc" : "none"
      });
      router.replace("/(tabs)/dashboard");
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unable to create account.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Open your account.</Title>
      <Body>Tell FAWN where you are, where you study, and whether military benefits should be part of your setup.</Body>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={tokens.color.muted} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={tokens.color.muted} value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="School" placeholderTextColor={tokens.color.muted} value={school} onChangeText={setSchool} />
      <TextInput style={styles.input} placeholder="City / campus location" placeholderTextColor={tokens.color.muted} value={location} onChangeText={setLocation} />
      <Pressable style={[styles.toggle, military && styles.toggleActive]} onPress={() => setMilitary(!military)}>
        <Text style={styles.toggleText}>{military ? "Military / veteran benefits on" : "Military / veteran benefits off"}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.primary, loading && styles.disabled]} onPress={handleSignup} disabled={loading || !email || !password}>
        <Text style={styles.primaryText}>{loading ? "Creating..." : "Create account"}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, color: tokens.color.text, padding: tokens.space.md, fontSize: 16 },
  toggle: { backgroundColor: tokens.color.surface2, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md },
  toggleActive: { borderColor: tokens.color.green, backgroundColor: "#053126" },
  toggleText: { color: tokens.color.text, fontWeight: "700" },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  disabled: { opacity: 0.6 },
  error: { color: tokens.color.danger, fontWeight: "700" },
  primaryText: { color: "#04100d", fontWeight: "800" }
});
