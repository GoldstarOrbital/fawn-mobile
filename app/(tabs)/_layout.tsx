import { Tabs } from "expo-router";
import { tokens } from "@/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: tokens.color.bg },
      headerTintColor: tokens.color.text,
      tabBarStyle: { backgroundColor: tokens.color.surface, borderTopColor: tokens.color.border },
      tabBarActiveTintColor: tokens.color.green,
      tabBarInactiveTintColor: tokens.color.muted
    }}>
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="send" options={{ title: "Send" }} />
      <Tabs.Screen name="campus" options={{ title: "Campus" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
