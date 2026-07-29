import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { useAuth } from "@/auth/AuthProvider";
import {
  createTapCredential,
  createAppleWalletPass,
  createGoogleWalletPass,
  getClosedLoopCard,
  issueClosedLoopCard,
  updateClosedLoopCard,
  type ClosedLoopCard,
  type TapCredential
} from "@/api/client";
import { Body, Panel, Title } from "@/components/Primitives";
import { tokens } from "@/theme/tokens";

function messageOf(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "Something went wrong.";
}

export default function CardScreen() {
  const params = useLocalSearchParams<{ checkout?: string }>();
  const { token } = useAuth();
  const [card, setCard] = useState<ClosedLoopCard | null>(null);
  const [tap, setTap] = useState<TapCredential | null>(null);
  const [checkoutInput, setCheckoutInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setCard(await getClosedLoopCard(token));
    } catch (err) {
      const message = messageOf(err);
      if (!/404|No FAWN closed-loop card/i.test(message)) setError(message);
      setCard(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (typeof params.checkout === "string" && params.checkout.trim()) {
      setCheckoutInput(params.checkout.trim());
    }
  }, [params.checkout]);
  useEffect(() => {
    if (!tap) return;
    const delay = Math.max(0, new Date(tap.expires_at).getTime() - Date.now());
    const timer = setTimeout(() => setTap(null), delay);
    return () => clearTimeout(timer);
  }, [tap]);

  async function issue() {
    if (!token) return;
    setBusy(true); setError("");
    try { setCard(await issueClosedLoopCard(token)); }
    catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  async function toggleFreeze() {
    if (!token || !card) return;
    setBusy(true); setError(""); setTap(null);
    try { setCard(await updateClosedLoopCard(card.status === "frozen" ? "active" : "frozen", token)); }
    catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  async function readyToTap() {
    if (!token || !card) return;
    const checkoutToken = checkoutInput.trim().match(/[?&]checkout=([A-Za-z0-9_-]+)/)?.[1] || checkoutInput.trim();
    if (!checkoutToken) { setError("Paste the merchant checkout link or token first."); return; }
    setBusy(true); setError("");
    try { setTap(await createTapCredential(checkoutToken, token)); }
    catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  async function addToGoogleWallet() {
    if (!token) return;
    setBusy(true); setError("");
    try {
      const pass = await createGoogleWalletPass(token);
      await Linking.openURL(pass.add_url);
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  async function addToAppleWallet() {
    if (!token) return;
    setBusy(true); setError("");
    try {
      const pass = await createAppleWalletPass(token);
      await Linking.openURL(pass.add_url);
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View><Text style={styles.kicker}>FAWN phone wallet</Text><Title>Balance card.</Title></View>
      {loading ? <ActivityIndicator color={tokens.color.green} /> : !card ? (
        <Panel>
          <Text style={styles.panelTitle}>Issue your FAWN-only card</Text>
          <Body>Spend cleared FAWN balance at participating FAWN merchants. You pay 1¢ and the merchant pays 1¢ per completed purchase.</Body>
          <Pressable style={styles.primary} onPress={issue} disabled={busy}><Text style={styles.primaryText}>{busy ? "Issuing…" : "Issue my card"}</Text></Pressable>
        </Panel>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.cardTop}><Text style={styles.brand}>FAWN</Text><Text style={styles.balance}>BALANCE</Text></View>
            <View><Text style={styles.cardLabel}>FAWN-only credential</Text><Text style={styles.number}>FAWN •••• {card.last_four}</Text></View>
            <View style={styles.cardTop}><Text style={styles.cardLabel}>CLOSED LOOP</Text><Text style={[styles.state, card.status === "frozen" && styles.frozen]}>{card.status.toUpperCase()}</Text></View>
          </View>
          <Panel>
            <Text style={styles.panelTitle}>Phone credential</Text>
            <Body>Paste the merchant checkout link, confirm the merchant and total, then create a rotating single-use credential. It expires after 60 seconds.</Body>
            <TextInput
              value={checkoutInput}
              onChangeText={setCheckoutInput}
              placeholder="Merchant checkout link or token"
              placeholderTextColor={tokens.color.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            {tap ? <Text style={styles.confirm}>Locked to {tap.merchant_name} · ${(tap.payer_total_cents / 100).toFixed(2)} total</Text> : null}
            {tap ? <View style={styles.qr}><QRCode value={tap.qr_payload} size={210} backgroundColor="#ffffff" color="#07110d" /></View> : null}
            <View style={styles.actions}>
              <Pressable style={[styles.primary, card.status !== "active" && styles.disabled]} onPress={readyToTap} disabled={busy || card.status !== "active"}><Text style={styles.primaryText}>{busy ? "Preparing…" : tap ? "Refresh credential" : "Ready to tap"}</Text></Pressable>
              <Pressable style={styles.secondary} onPress={toggleFreeze} disabled={busy}><Text style={styles.secondaryText}>{card.status === "frozen" ? "Unfreeze" : "Freeze"}</Text></Pressable>
            </View>
            {card.phone_wallet?.google_wallet_pass_available ? <Pressable style={styles.walletButton} onPress={addToGoogleWallet} disabled={busy}><Text style={styles.secondaryText}>Add visual pass to Google Wallet</Text></Pressable> : null}
            {Platform.OS === "ios" && card.phone_wallet?.apple_wallet_pass_available ? <Pressable style={styles.walletButton} onPress={addToAppleWallet} disabled={busy}><Text style={styles.secondaryText}>Add visual pass to Apple Wallet</Text></Pressable> : null}
          </Panel>
          <Body>This credential works only inside FAWN-controlled checkout. It is not an Apple Pay, Google Pay, Visa, or Mastercard credential.</Body>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: tokens.color.bg, padding: tokens.space.lg, gap: tokens.space.md },
  kicker: { color: tokens.color.green, fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
  card: { minHeight: 205, backgroundColor: "#111814", borderColor: "rgba(0,200,150,.38)", borderWidth: 1, borderRadius: tokens.radius.xl, padding: tokens.space.lg, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: tokens.color.text, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  balance: { color: tokens.color.gold, fontSize: 12, fontWeight: "800" },
  cardLabel: { color: tokens.color.muted, fontSize: 11, fontWeight: "700" },
  number: { color: tokens.color.text, fontSize: 21, fontWeight: "700", letterSpacing: 2, marginTop: 7 },
  state: { color: tokens.color.green, fontSize: 11, fontWeight: "900" },
  frozen: { color: tokens.color.danger },
  panelTitle: { color: tokens.color.text, fontSize: 18, fontWeight: "800" },
  qr: { alignSelf: "center", backgroundColor: "#fff", padding: 12, borderRadius: 14, marginVertical: 10 },
  input: { color: tokens.color.text, backgroundColor: tokens.color.surface2, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: 13 },
  confirm: { color: tokens.color.green, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  actions: { flexDirection: "row", gap: tokens.space.sm, marginTop: tokens.space.sm },
  primary: { flex: 1, backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: 14, alignItems: "center" },
  primaryText: { color: tokens.color.bg, fontWeight: "900" },
  secondary: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: 14, alignItems: "center" },
  secondaryText: { color: tokens.color.text, fontWeight: "800" },
  walletButton: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: 14, alignItems: "center", marginTop: tokens.space.sm },
  disabled: { opacity: .45 },
  error: { color: tokens.color.danger, lineHeight: 20 }
});
