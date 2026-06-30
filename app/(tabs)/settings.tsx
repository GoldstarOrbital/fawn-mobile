import { Pressable, StyleSheet, Text } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { tokens } from "@/theme/tokens";

export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <Screen>
      <Title>Settings.</Title>
      <Panel><Text style={styles.item}>Profile</Text><Body>Name, email, phone, and verification state.</Body></Panel>
      <Panel><Text style={styles.item}>Personalization</Text><Body>School, city, military status, and campus deal preferences.</Body></Panel>
      <Pressable style={styles.danger} onPress={signOut}><Text style={styles.dangerText}>Log out</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { color: tokens.color.text, fontSize: 18, fontWeight: "800" },
  danger: { borderColor: tokens.color.danger, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  dangerText: { color: tokens.color.danger, fontWeight: "800" }
});
