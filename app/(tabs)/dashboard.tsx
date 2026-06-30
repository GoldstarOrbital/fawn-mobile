import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { getDashboard, type DashboardResponse } from "@/api/client";
import { tokens } from "@/theme/tokens";

function formatMoney(value?: number, currency = "USD") {
  if (typeof value !== "number") return "--";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export default function DashboardScreen() {
  const { token, isBootstrapping } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadDashboard() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setDashboard(await getDashboard(token));
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unable to load dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isBootstrapping) void loadDashboard();
  }, [isBootstrapping, token]);

  const available = dashboard?.balance?.available;
  const currency = dashboard?.balance?.currency || "USD";

  return (
    <Screen>
      <Title>Your FAWN command center.</Title>
      <Panel>
        <Text style={styles.label}>Available balance</Text>
        <Text style={styles.balance}>{loading && !dashboard ? "Loading..." : formatMoney(available, currency)}</Text>
        <Body>
          {dashboard?.account_active
            ? "Your account is active. Recent activity and controls will appear here."
            : dashboard?.application_pending
              ? "Your account application is being reviewed. FAWN will unlock banking controls after approval."
              : "Create or finish account onboarding to unlock balance, cards, P2P, and campus savings."}
        </Body>
      </Panel>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        <Panel><Text style={styles.cardTitle}>Cards</Text><Body>Virtual card controls will connect after account activation.</Body></Panel>
        <Panel><Text style={styles.cardTitle}>P2P</Text><Body>Send, request, and split once your FAWN account is active.</Body></Panel>
      </View>
      <Pressable style={styles.secondary} onPress={loadDashboard} disabled={!token || loading}>
        <Text style={styles.secondaryText}>{loading ? "Refreshing..." : "Refresh"}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: tokens.color.muted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  balance: { color: tokens.color.text, fontSize: 44, fontWeight: "900" },
  grid: { gap: tokens.space.md },
  cardTitle: { color: tokens.color.text, fontSize: 18, fontWeight: "800" },
  error: { color: tokens.color.danger, fontWeight: "700" },
  secondary: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  secondaryText: { color: tokens.color.text, fontWeight: "800" }
});
