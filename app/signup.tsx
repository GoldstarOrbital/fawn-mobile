import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Body, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { tokens } from "@/theme/tokens";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ssn, setSsn] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [school, setSchool] = useState("");
  const [location, setLocation] = useState("");
  const [military, setMilitary] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const requiredFieldsReady = email && password && fullName && phone && dateOfBirth && ssn && street && city && state && postalCode;

  async function handleSignup() {
    setError("");
    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim(),
        date_of_birth: dateOfBirth.trim(),
        ssn: ssn.trim(),
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          postal_code: postalCode.trim(),
          country: "US"
        },
        is_student: true,
        occupation: "Student",
        school: school.trim() || null,
        location: location.trim() || city.trim(),
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Title>Open your account.</Title>
      <Body>FAWN needs the same identity details as the web signup so the API can start Unit onboarding.</Body>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={tokens.color.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={tokens.color.muted} value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Full legal name" placeholderTextColor={tokens.color.muted} value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={tokens.color.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Date of birth (YYYY-MM-DD)" placeholderTextColor={tokens.color.muted} value={dateOfBirth} onChangeText={setDateOfBirth} />
      <TextInput style={styles.input} placeholder="SSN" placeholderTextColor={tokens.color.muted} value={ssn} onChangeText={setSsn} keyboardType="number-pad" secureTextEntry />
      <View style={styles.group}>
        <TextInput style={styles.input} placeholder="Street address" placeholderTextColor={tokens.color.muted} value={street} onChangeText={setStreet} />
        <TextInput style={styles.input} placeholder="City" placeholderTextColor={tokens.color.muted} value={city} onChangeText={setCity} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.state]} placeholder="State" placeholderTextColor={tokens.color.muted} value={state} onChangeText={setState} autoCapitalize="characters" maxLength={2} />
          <TextInput style={[styles.input, styles.zip]} placeholder="ZIP" placeholderTextColor={tokens.color.muted} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />
        </View>
      </View>
      <TextInput style={styles.input} placeholder="School (optional)" placeholderTextColor={tokens.color.muted} value={school} onChangeText={setSchool} />
      <TextInput style={styles.input} placeholder="Campus / local area" placeholderTextColor={tokens.color.muted} value={location} onChangeText={setLocation} />
      <Pressable style={[styles.toggle, military && styles.toggleActive]} onPress={() => setMilitary(!military)}>
        <Text style={styles.toggleText}>{military ? "Military / veteran benefits on" : "Military / veteran benefits off"}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.primary, (loading || !requiredFieldsReady) && styles.disabled]} onPress={handleSignup} disabled={loading || !requiredFieldsReady}>
        <Text style={styles.primaryText}>{loading ? "Creating..." : "Create account"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.bg },
  content: { padding: tokens.space.lg, gap: tokens.space.md },
  group: { gap: tokens.space.sm },
  row: { flexDirection: "row", gap: tokens.space.sm },
  state: { flex: 0.35 },
  zip: { flex: 0.65 },
  input: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, color: tokens.color.text, padding: tokens.space.md, fontSize: 16 },
  toggle: { backgroundColor: tokens.color.surface2, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md },
  toggleActive: { borderColor: tokens.color.green, backgroundColor: "#053126" },
  toggleText: { color: tokens.color.text, fontWeight: "700" },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  disabled: { opacity: 0.6 },
  error: { color: tokens.color.danger, fontWeight: "700" },
  primaryText: { color: "#04100d", fontWeight: "800" }
});
