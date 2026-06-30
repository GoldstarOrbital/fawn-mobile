import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { tokens } from "@/theme/tokens";

const schools = [
  { name: "Arizona State", color: "#8c1d40", deal: "Game-day food map and student discount watchlist." },
  { name: "UCLA", color: "#2774ae", deal: "Westwood coffee, transit, and essentials radar." },
  { name: "Ohio State", color: "#bb0000", deal: "Columbus campus savings and bookstore alerts." }
];

export default function CampusScreen() {
  const [school, setSchool] = useState(schools[0]);

  return (
    <Screen>
      <Title>Campus savings.</Title>
      <Body>School colors, location, and student context become the deal layer.</Body>
      <View style={styles.tabs}>{schools.map((item) => (
        <Pressable key={item.name} style={[styles.tab, school.name === item.name && { borderColor: item.color }]} onPress={() => setSchool(item)}>
          <Text style={styles.tabText}>{item.name}</Text>
        </Pressable>
      ))}</View>
      <Panel>
        <View style={[styles.swatch, { backgroundColor: school.color }]} />
        <Text style={styles.school}>{school.name}</Text>
        <Body>{school.deal}</Body>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: tokens.space.sm },
  tab: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md, backgroundColor: tokens.color.surface },
  tabText: { color: tokens.color.text, fontWeight: "800" },
  swatch: { height: 8, borderRadius: 4 },
  school: { color: tokens.color.text, fontSize: 24, fontWeight: "900" }
});
