import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import {
  authorizeNfcCheckout,
  createMerchantAccount,
  createMerchantCheckout,
  createNfcChallenge,
  getMyMerchant,
  type MerchantAccount,
  type MerchantCheckout,
  type NfcChallenge
} from "@/api/client";
import { Body, Panel, Title } from "@/components/Primitives";
import { tokens } from "@/theme/tokens";
import FawnNfc, { type HceResponseEvent } from "../../modules/fawn-nfc";

function messageOf(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "Something went wrong.";
}

type ReaderSession = { checkout: MerchantCheckout; challenge: NfcChallenge };

export default function MerchantScreen() {
  const { token } = useAuth();
  const [merchant, setMerchant] = useState<MerchantAccount | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [checkout, setCheckout] = useState<MerchantCheckout | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<ReaderSession | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    try { setMerchant(await getMyMerchant(token)); }
    catch (err) {
      if (/404|No merchant account/i.test(messageOf(err))) setMerchant(null);
      else setError(messageOf(err));
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!FawnNfc || !token) return;
    const response = FawnNfc.addListener("onHceResponse", async ({ deviceId, signatureB64 }: HceResponseEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      setBusy(true); setError(""); setStatus("Verifying device signature and settling…");
      try {
        const paid = await authorizeNfcCheckout(session.checkout.checkout_token, {
          device_id: deviceId,
          challenge_b64: session.challenge.challenge_b64,
          signature_b64: signatureB64
        }, token);
        setCheckout(paid);
        setStatus(`Paid ${(paid.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} through FAWN phone tap.`);
        sessionRef.current = null;
      } catch (err) { setError(messageOf(err)); setStatus(""); }
      finally { setBusy(false); }
    });
    const failure = FawnNfc.addListener("onHceError", ({ message }: { message: string }) => {
      setError(message); setStatus(""); setBusy(false); sessionRef.current = null;
    });
    return () => { response.remove(); failure.remove(); };
  }, [token]);

  async function apply() {
    if (!token) return;
    setBusy(true); setError("");
    try {
      const account = await createMerchantAccount({
        business_name: businessName.trim(),
        display_name: displayName.trim(),
        support_email: supportEmail.trim()
      }, token);
      setMerchant(account);
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  async function startPhoneTap() {
    if (!token || !FawnNfc) return;
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 2 || amountCents > 10_000) {
      setError("Phone-tap checkout must be between $0.02 and $100.00."); return;
    }
    setBusy(true); setError(""); setStatus("Creating a checkout-bound NFC challenge…");
    try {
      const created = await createMerchantCheckout(amountCents, reference.trim() || null, token);
      const challenge = await createNfcChallenge(created.checkout_token, token);
      sessionRef.current = { checkout: created, challenge };
      setCheckout(created);
      setStatus(`Ready for ${(created.payer_total_cents / 100).toFixed(2)} total. Ask the customer to unlock and tap their FAWN Android phone.`);
      await FawnNfc.startReaderAsync(challenge.challenge_b64);
    } catch (err) { setError(messageOf(err)); setStatus(""); sessionRef.current = null; }
    finally { setBusy(false); }
  }

  const nativeReaderReady = Platform.OS === "android" && Boolean(FawnNfc?.isSupported()) && Boolean(FawnNfc?.isNfcEnabled());

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View><Text style={styles.kicker}>FAWN merchant</Text><Title>Accept money.</Title></View>
      {!merchant ? <Panel>
        <Text style={styles.panelTitle}>Join the FAWN loop</Text>
        <Body>Link your existing custodial FAWN account to a merchant profile. Review is required before checkout turns on. Every completed sale costs the merchant 1¢ and the customer 1¢.</Body>
        <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Legal business name" placeholderTextColor={tokens.color.muted} />
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Checkout display name" placeholderTextColor={tokens.color.muted} />
        <TextInput style={styles.input} value={supportEmail} onChangeText={setSupportEmail} placeholder="Support email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={tokens.color.muted} />
        <Pressable style={styles.primary} onPress={apply} disabled={busy}><Text style={styles.primaryText}>{busy ? "Submitting…" : "Create merchant profile"}</Text></Pressable>
      </Panel> : merchant.status !== "active" ? <Panel>
        <Text style={styles.panelTitle}>{merchant.display_name}</Text>
        <Body>Your merchant profile is {merchant.status.replace("_", " ")}. Checkout and NFC acceptance turn on after review.</Body>
        <Text style={styles.fee}>Merchant fee: exactly 1¢ per completed sale</Text>
      </Panel> : <>
        <Panel>
          <Text style={styles.panelTitle}>{merchant.display_name} terminal</Text>
          <Body>Create the exact checkout amount first. The customer sees the amount on this screen, unlocks their FAWN phone, and taps. The challenge expires after 30 seconds and cannot be reused.</Body>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Amount, up to $100" keyboardType="decimal-pad" placeholderTextColor={tokens.color.muted} />
          <TextInput style={styles.input} value={reference} onChangeText={setReference} placeholder="Order reference (optional)" placeholderTextColor={tokens.color.muted} />
          <View style={styles.feeRows}><Text style={styles.fee}>Customer fee</Text><Text style={styles.fee}>$0.01</Text></View>
          <View style={styles.feeRows}><Text style={styles.fee}>Merchant fee</Text><Text style={styles.fee}>$0.01</Text></View>
          <Pressable style={[styles.primary, !nativeReaderReady && styles.disabled]} onPress={startPhoneTap} disabled={busy || !nativeReaderReady}>
            <Text style={styles.primaryText}>{busy ? "Listening…" : "Start FAWN phone tap"}</Text>
          </Pressable>
          {!nativeReaderReady ? <Body>This terminal requires an NFC-capable Android FAWN build. Expo Go and browsers cannot read ISO-DEP phone credentials.</Body> : null}
        </Panel>
        {checkout ? <Panel><Text style={styles.panelTitle}>Checkout {checkout.status}</Text><Body>{(checkout.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} sale · merchant receives {((checkout.amount_cents - 1) / 100).toFixed(2)}</Body></Panel> : null}
      </>}
      {status ? <Text style={styles.success}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: tokens.color.bg, padding: tokens.space.lg, gap: tokens.space.md },
  kicker: { color: tokens.color.green, fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
  panelTitle: { color: tokens.color.text, fontSize: 18, fontWeight: "800" },
  input: { color: tokens.color.text, backgroundColor: tokens.color.surface2, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: 13 },
  primary: { backgroundColor: tokens.color.green, borderRadius: tokens.radius.md, padding: 14, alignItems: "center" },
  primaryText: { color: tokens.color.bg, fontWeight: "900" },
  feeRows: { flexDirection: "row", justifyContent: "space-between" },
  fee: { color: tokens.color.muted, fontSize: 13, fontWeight: "700" },
  success: { color: tokens.color.green, fontSize: 14, fontWeight: "800", lineHeight: 21 },
  error: { color: tokens.color.danger, lineHeight: 20 },
  disabled: { opacity: .45 }
});
