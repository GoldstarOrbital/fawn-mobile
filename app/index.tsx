import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { tokens } from "@/theme/tokens";

export default function WelcomeScreen() {
  return (
    <Screen>
      <Text style={styles.kicker}>FAWN mobile</Text>
      <Title>Banking that feels built for your campus, city, and path.</Title>
      <Body>Create an account, set your school and location, and bring the campus savings layer with you.</Body>
      <Panel>
        <Text style={styles.panelTitle}>Launch focus</Text>
        <Text style={styles.panelText}>Signup, login, dashboard, campus deals, card controls, and P2P become the first native tabs.</Text>
      </Panel>
      <View style={styles.actions}>
        <Link href="/signup" asChild><Pressable style={styles.primary}><Text style={styles.primaryText}>Create account</Text></Pressable></Link>
        <Link href="/login" asChild><Pressable style={styles.secondary}><Text style={styles.secondaryText}>Log in</Text></Pressable></Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: tokens.color.green, fontSize: 14, fontWeight: "800", textTransform: "uppercase" },
  panelTitle: { color: tokens.color.text, fontSize: 18, fontWeight: "800" },
  panelText: { color: tokens.color.muted, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: "row", gap: tokens.space.sm },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: tokens.space.md, flex: 1, alignItems: "center" },
  primaryText: { color: "#04100d", fontWeight: "800" },
  secondary: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md, flex: 1, alignItems: "center" },
  secondaryText: { color: tokens.color.text, fontWeight: "800" }
});
