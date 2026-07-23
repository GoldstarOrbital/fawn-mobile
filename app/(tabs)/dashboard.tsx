import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { createCustodialWallet, getMe, getWalletBalance, type Me } from "@/api/client";
import { transferHistory, type TransferHistoryItem } from "@/api/p2p";
import { tokens } from "@/theme/tokens";

function formatMoney(value?: number | null) {
  if (typeof value !== "number") return "--";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function shortAddr(addr?: string | null) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export default function DashboardScreen() {
  const { token, isBootstrapping } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<TransferHistoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const profile = await getMe(token);
      setMe(profile);
      if (profile.wallet_initialized) {
        const [bal, history] = await Promise.all([
          getWalletBalance(token),
          transferHistory(token, 5).catch(() => [] as TransferHistoryItem[])
        ]);
        setBalance(bal.usdc_balance);
        setWalletAddress(bal.wallet_address || profile.crypto_wallet_address || null);
        setTransfers(history);
      } else {
        setBalance(0);
        setWalletAddress(null);
        setTransfers([]);
      }
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unable to load your account.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isBootstrapping) void loadDashboard();
  }, [isBootstrapping, loadDashboard]);

  async function onCreateWallet() {
    if (!token) return;
    setCreating(true);
    setError("");
    try {
      await createCustodialWallet(token);
      await loadDashboard();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Could not create your wallet.";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen>
      <Title>{me ? `Hey, ${me.full_name.split(" ")[0]}.` : "Your FAWN account."}</Title>
      <Panel>
        <Text style={styles.label}>USDC balance</Text>
        <Text style={styles.balance} accessibilityLabel={`Balance ${formatMoney(balance)}`}>
          {loading && balance === null ? "…" : formatMoney(balance)}
        </Text>
        {walletAddress ? (
          <Body>Wallet {shortAddr(walletAddress)} · secured by FAWN (encrypted custody)</Body>
        ) : me && !me.wallet_initialized ? (
          <Body>Create your USDC wallet to start sending and receiving — it takes one tap, no KYC.</Body>
        ) : null}
      </Panel>
      {me && !me.wallet_initialized ? (
        <Pressable style={styles.primary} onPress={onCreateWallet} disabled={creating} accessibilityRole="button">
          {creating ? <ActivityIndicator color={tokens.color.bg} /> : <Text style={styles.primaryText}>Create wallet (instant)</Text>}
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Panel>
        <Text style={styles.cardTitle}>Recent activity</Text>
        {transfers.length === 0 ? (
          <Body>{me?.wallet_initialized ? "No transfers yet — send your first dollar from the Send tab." : "Your transfers will show up here."}</Body>
        ) : (
          <View style={styles.txList}>
            {transfers.map((t) => (
              <View key={t.transfer_id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txName}>
                    {t.type === "send" ? "Sent to" : "Received from"} {shortAddr(t.counterparty) || t.counterparty}
                  </Text>
                  <Text style={styles.txMeta}>
                    {(t.created_at || "").split("T")[0]}{t.chain ? ` · ${t.chain}` : ""} · {t.status}
                  </Text>
                </View>
                <Text style={[styles.txAmount, t.type === "receive" && styles.txCredit]}>
                  {t.type === "send" ? "-" : "+"}{formatMoney(t.type === "send" ? t.amount + t.fee : t.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Panel>
      <Pressable style={styles.secondary} onPress={loadDashboard} disabled={!token || loading} accessibilityRole="button">
        <Text style={styles.secondaryText}>{loading ? "Refreshing…" : "Refresh"}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: tokens.color.muted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  balance: { color: tokens.color.text, fontSize: 44, fontWeight: "900" },
  cardTitle: { color: tokens.color.text, fontSize: 18, fontWeight: "800" },
  error: { color: tokens.color.danger, fontWeight: "700" },
  txList: { gap: tokens.space.sm },
  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  txLeft: { flexShrink: 1, paddingRight: tokens.space.sm },
  txName: { color: tokens.color.text, fontWeight: "700", fontSize: 14 },
  txMeta: { color: tokens.color.muted, fontSize: 12 },
  txAmount: { color: tokens.color.text, fontWeight: "800" },
  txCredit: { color: tokens.color.green },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  primaryText: { color: tokens.color.bg, fontWeight: "800", fontSize: 16 },
  secondary: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  secondaryText: { color: tokens.color.text, fontWeight: "800" }
});
