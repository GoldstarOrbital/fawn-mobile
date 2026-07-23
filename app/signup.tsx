import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { Body, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { tokens } from "@/theme/tokens";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [isStudent, setIsStudent] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const requiredFieldsReady = email.trim() && password.length >= 8 && fullName.trim();

  async function handleSignup() {
    setError("");
    setLoading(true);
    try {
      await signUp(
        {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          is_student: isStudent
        },
        school.trim() || undefined
      );
      router.replace("/(tabs)/dashboard");
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unable to create account.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Title>Create your account.</Title>
      <Body>Name, email, password — that&rsquo;s it. No SSN, no credit check, ready in about a minute.</Body>
      <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={tokens.color.muted} value={fullName} onChangeText={setFullName} accessibilityLabel="Full name" />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={tokens.color.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" accessibilityLabel="Email" />
      <TextInput style={styles.input} placeholder="Password (at least 8 characters)" placeholderTextColor={tokens.color.muted} value={password} onChangeText={setPassword} secureTextEntry accessibilityLabel="Password" />
      <TextInput style={styles.input} placeholder="Phone (optional)" placeholderTextColor={tokens.color.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" accessibilityLabel="Phone, optional" />
      <TextInput style={styles.input} placeholder="School (optional)" placeholderTextColor={tokens.color.muted} value={school} onChangeText={setSchool} accessibilityLabel="School, optional" />
      <Pressable style={[styles.toggle, isStudent && styles.toggleActive]} onPress={() => setIsStudent(!isStudent)} accessibilityRole="button">
        <Text style={styles.toggleText}>{isStudent ? "I'm a current college student (free tier)" : "Not a student"}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.primary, (loading || !requiredFieldsReady) && styles.disabled]} onPress={handleSignup} disabled={loading || !requiredFieldsReady} accessibilityRole="button">
        <Text style={styles.primaryText}>{loading ? "Creating…" : "Create account"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.bg },
  content: { padding: tokens.space.lg, gap: tokens.space.md },
  input: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, color: tokens.color.text, padding: tokens.space.md, fontSize: 16 },
  toggle: { backgroundColor: tokens.color.surface2, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md },
  toggleActive: { borderColor: tokens.color.green, backgroundColor: "#053126" },
  toggleText: { color: tokens.color.text, fontWeight: "700" },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  disabled: { opacity: 0.6 },
  error: { color: tokens.color.danger, fontWeight: "700" },
  primaryText: { color: "#04100d", fontWeight: "800" }
});
