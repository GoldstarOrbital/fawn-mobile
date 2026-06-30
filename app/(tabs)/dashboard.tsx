import { StyleSheet, Text, View } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { tokens } from "@/theme/tokens";

export default function DashboardScreen() {
  return (
    <Screen>
      <Title>Your FAWN command center.</Title>
      <Panel>
        <Text style={styles.label}>Available balance</Text>
        <Text style={styles.balance}>$25.00</Text>
        <Body>Founding member credit placeholder: 25 bucks or 25 Class A shares, pending eligibility and final terms.</Body>
      </Panel>
      <View style={styles.grid}>
        <Panel><Text style={styles.cardTitle}>Cards</Text><Body>Virtual card controls, freeze state, and spend limits.</Body></Panel>
        <Panel><Text style={styles.cardTitle}>P2P</Text><Body>Send, request, and split once backend routes are wired.</Body></Panel>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: tokens.color.muted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  balance: { color: tokens.color.text, fontSize: 44, fontWeight: "900" },
  grid: { gap: tokens.space.md },
  cardTitle: { color: tokens.color.text, fontSize: 18, fontWeight: "800" }
});
