import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { createCustodialWallet, getMe, getWalletBalance } from "@/api/client";
import { tokens } from "@/theme/tokens";

export default function ReceiveScreen() {
  const { token, isBootstrapping } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [walletMissing, setWalletMissing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const me = await getMe(token);
      setUsername(me.username || null);
      if (!me.wallet_initialized) {
        setWalletMissing(true);
        setAddress(null);
        return;
      }
      setWalletMissing(false);
      if (me.crypto_wallet_address) {
        setAddress(me.crypto_wallet_address);
      } else {
        const bal = await getWalletBalance(token);
        setAddress(bal.wallet_address || null);
      }
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Unable to load your wallet.";
      setError(message);
    }
  }, [token]);

  useEffect(() => {
    if (!isBootstrapping) void load();
  }, [isBootstrapping, load]);

  async function onCreateWallet() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      await createCustodialWallet(token);
      await load();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Could not create your wallet.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!address) return;
    try {
      await Share.share({
        message: `Send me USDC on Polygon: ${address}${username ? ` (or @${username} inside FAWN)` : ""}`
      });
    } catch {}
  }

  if (!token) {
    return (
      <Screen>
        <Title>Receive money</Title>
        <Body>Log in to see your USDC deposit address.</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Receive money.</Title>
      {walletMissing ? (
        <>
          <Panel>
            <Body>Create your USDC wallet first — one tap, no KYC, and you get a real on-chain address.</Body>
          </Panel>
          <Pressable style={styles.primary} onPress={onCreateWallet} disabled={busy} accessibilityRole="button">
            {busy ? <ActivityIndicator color={tokens.color.bg} /> : <Text style={styles.primaryText}>Create wallet (instant)</Text>}
          </Pressable>
        </>
      ) : (
        <>
          {username ? (
            <Panel>
              <Text style={styles.label}>From FAWN friends</Text>
              <Text style={styles.handle} selectable accessibilityLabel={`Your FAWN username is @${username}`}>@{username}</Text>
              <Body>Friends on FAWN can send to your @username — $0.01 fee, instant.</Body>
            </Panel>
          ) : null}
          <Panel>
            <Text style={styles.label}>From any wallet or exchange</Text>
            <Text style={styles.address} selectable accessibilityLabel="Your USDC deposit address">
              {address || "…"}
            </Text>
            <Body>Send USDC on Polygon to this address. Deposits are detected on-chain automatically and usually credit within a minute.</Body>
          </Panel>
          <Pressable style={styles.primary} onPress={onShare} disabled={!address} accessibilityRole="button">
            <Text style={styles.primaryText}>Share address</Text>
          </Pressable>
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>⚠ USDC on Polygon only. Tokens sent on other networks may be unrecoverable.</Text>
          </View>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: tokens.color.muted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  handle: { color: tokens.color.green, fontSize: 26, fontWeight: "900" },
  address: { color: tokens.color.text, fontFamily: "monospace", fontSize: 15, lineHeight: 22 },
  warnBox: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md },
  warnText: { color: tokens.color.muted, fontSize: 12, lineHeight: 18 },
  error: { color: tokens.color.danger, fontWeight: "700" },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  primaryText: { color: tokens.color.bg, fontWeight: "800", fontSize: 16 }
});
