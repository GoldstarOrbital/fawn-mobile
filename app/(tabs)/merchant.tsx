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
import FawnNfc, { type HceErrorEvent, type HceResponseEvent } from "../../modules/fawn-nfc";

function messageOf(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "Something went wrong.";
}

type ReaderSession = { checkout: MerchantCheckout; challenge: NfcChallenge; challengeCreatedAtMs: number };

type TapTestReport = {
  checkoutId: string;
  deviceIdSuffix: string;
  amountCents: number;
  payerBalanceCents: number;
  merchantBalanceCents: number;
  readerWaitMs: number;
  apduRoundTripMs: number;
  challengeAgeMs: number;
  tagTechnologies: string[];
  signatureBytes: number;
  backendSignatureAccepted: boolean;
  settlementCompleted: boolean;
  exactFees: boolean;
  replayBlocked: boolean | null;
  replayMessage: string | null;
  completedAt: string;
};

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
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [testReport, setTestReport] = useState<TapTestReport | null>(null);
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
    const response = FawnNfc.addListener("onHceResponse", async (event: HceResponseEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      // Claim the reader session before any network await so duplicate native
      // events cannot race two settlement requests for the same checkout.
      sessionRef.current = null;
      const responseReceivedAtMs = Date.now();
      setBusy(true); setError(""); setStatus("Verifying device signature and settling…");
      try {
        const paid = await authorizeNfcCheckout(session.checkout.checkout_token, {
          device_id: event.deviceId,
          challenge_b64: session.challenge.challenge_b64,
          signature_b64: event.signatureB64
        }, token);
        let replayBlocked: boolean | null = null;
        let replayMessage: string | null = null;
        if (diagnosticMode) {
          setStatus("Settlement complete. Verifying replay protection…");
          try {
            await authorizeNfcCheckout(session.checkout.checkout_token, {
              device_id: event.deviceId,
              challenge_b64: session.challenge.challenge_b64,
              signature_b64: event.signatureB64
            }, token);
            replayBlocked = false;
            replayMessage = "The signed response was unexpectedly accepted twice.";
          } catch (replayError) {
            replayMessage = messageOf(replayError);
            replayBlocked = /open|completed|already|expired|used/i.test(replayMessage);
          }
        }
        const exactFees = paid.user_fee_cents === 1
          && paid.merchant_fee_cents === 1
          && paid.merchant_net_cents === paid.amount_cents - 1;
        setTestReport({
          checkoutId: paid.id,
          deviceIdSuffix: event.deviceId.slice(-8),
          amountCents: paid.amount_cents,
          payerBalanceCents: paid.payer_balance_cents,
          merchantBalanceCents: paid.merchant_balance_cents,
          readerWaitMs: event.readerWaitMs,
          apduRoundTripMs: event.apduRoundTripMs,
          challengeAgeMs: responseReceivedAtMs - session.challengeCreatedAtMs,
          tagTechnologies: event.tagTechnologies,
          signatureBytes: event.signatureBytes,
          backendSignatureAccepted: paid.acceptance_method === "android_hce",
          settlementCompleted: paid.status === "completed" && paid.idempotent_replay === false,
          exactFees,
          replayBlocked,
          replayMessage,
          completedAt: new Date().toISOString()
        });
        setCheckout(paid);
        setStatus(`Paid ${(paid.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} through FAWN phone tap.`);
      } catch (err) { setError(messageOf(err)); setStatus(""); }
      finally { setBusy(false); }
    });
    const failure = FawnNfc.addListener("onHceError", ({ message, readerElapsedMs }: HceErrorEvent) => {
      setError(`${message} Reader active for ${readerElapsedMs} ms.`); setStatus(""); setBusy(false); sessionRef.current = null;
    });
    return () => { response.remove(); failure.remove(); };
  }, [diagnosticMode, token]);

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
    setBusy(true); setError(""); setTestReport(null); setStatus("Creating a checkout-bound NFC challenge…");
    try {
      const created = await createMerchantCheckout(amountCents, reference.trim() || null, token);
      const challenge = await createNfcChallenge(created.checkout_token, token);
      sessionRef.current = { checkout: created, challenge, challengeCreatedAtMs: Date.now() };
      setCheckout(created);
      setStatus(`Ready for ${(created.payer_total_cents / 100).toFixed(2)} total. Ask the customer to unlock and tap their FAWN Android phone.`);
      await FawnNfc.startReaderAsync(challenge.challenge_b64);
    } catch (err) { setError(messageOf(err)); setStatus(""); sessionRef.current = null; }
    finally { setBusy(false); }
  }

  const nativeReaderReady = Platform.OS === "android" && Boolean(FawnNfc?.isSupported()) && Boolean(FawnNfc?.isNfcEnabled());
  const diagnosticRows: Array<[string, boolean | null, string]> = testReport ? [
    ["ISO-DEP phone detected", testReport.tagTechnologies.some((tech) => tech.includes("IsoDep")), testReport.tagTechnologies.join(", ")],
    ["Challenge answered within 30 seconds", testReport.challengeAgeMs <= 30_000, `${testReport.challengeAgeMs} ms`],
    ["APDU exchange completed", testReport.apduRoundTripMs <= 3_000, `${testReport.apduRoundTripMs} ms`],
    ["ECDSA signature envelope", testReport.signatureBytes >= 64 && testReport.signatureBytes <= 80, `${testReport.signatureBytes} bytes`],
    ["Backend accepted device signature", testReport.backendSignatureAccepted, `device …${testReport.deviceIdSuffix}`],
    ["Checkout settled once", testReport.settlementCompleted, `checkout ${testReport.checkoutId.slice(-8)}`],
    ["Customer and merchant fee are 1¢", testReport.exactFees, `sale ${(testReport.amountCents / 100).toFixed(2)}`],
    ["Final custodial balances returned", Number.isInteger(testReport.payerBalanceCents) && Number.isInteger(testReport.merchantBalanceCents), `customer ${(testReport.payerBalanceCents / 100).toFixed(2)} · merchant ${(testReport.merchantBalanceCents / 100).toFixed(2)}`],
    ["Signed response replay blocked", testReport.replayBlocked, testReport.replayMessage || "Enable acceptance evidence before starting the reader"]
  ] : [];

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
          <Pressable style={styles.diagnosticToggle} onPress={() => setDiagnosticMode((enabled) => !enabled)} disabled={busy}>
            <View style={[styles.diagnosticDot, diagnosticMode && styles.diagnosticDotOn]} />
            <View style={styles.diagnosticCopy}>
              <Text style={styles.diagnosticTitle}>Acceptance evidence {diagnosticMode ? "on" : "off"}</Text>
              <Body>When on, FAWN resubmits the signed response after settlement and requires the backend to reject the replay.</Body>
            </View>
          </Pressable>
          <Pressable style={[styles.primary, !nativeReaderReady && styles.disabled]} onPress={startPhoneTap} disabled={busy || !nativeReaderReady}>
            <Text style={styles.primaryText}>{busy ? "Listening…" : "Start FAWN phone tap"}</Text>
          </Pressable>
          {!nativeReaderReady ? <Body>This terminal requires an NFC-capable Android FAWN build. Expo Go and browsers cannot read ISO-DEP phone credentials.</Body> : null}
        </Panel>
        {checkout ? <Panel><Text style={styles.panelTitle}>Checkout {checkout.status}</Text><Body>{(checkout.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} sale · merchant receives {((checkout.amount_cents - 1) / 100).toFixed(2)}</Body></Panel> : null}
        {testReport ? <Panel>
          <Text style={styles.panelTitle}>NFC acceptance evidence</Text>
          <Body>{testReport.completedAt} · reader waited {testReport.readerWaitMs} ms for the customer tap</Body>
          {diagnosticRows.map(([label, passed, detail]) => <View style={styles.evidenceRow} key={label}>
            <View style={[styles.evidenceMark, passed === true ? styles.evidencePass : passed === false ? styles.evidenceFail : styles.evidenceNotRun]}>
              <Text style={styles.evidenceMarkText}>{passed === true ? "PASS" : passed === false ? "FAIL" : "N/R"}</Text>
            </View>
            <View style={styles.evidenceCopy}><Text style={styles.evidenceLabel}>{label}</Text><Text style={styles.evidenceDetail}>{detail}</Text></View>
          </View>)}
        </Panel> : null}
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
  diagnosticToggle: { flexDirection: "row", alignItems: "flex-start", gap: 11, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: 12 },
  diagnosticDot: { width: 16, height: 16, borderRadius: 8, borderColor: tokens.color.muted, borderWidth: 2, marginTop: 2 },
  diagnosticDotOn: { backgroundColor: tokens.color.green, borderColor: tokens.color.green },
  diagnosticCopy: { flex: 1, gap: 3 },
  diagnosticTitle: { color: tokens.color.text, fontSize: 14, fontWeight: "800" },
  evidenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderTopColor: tokens.color.border, borderTopWidth: 1, paddingTop: 10 },
  evidenceMark: { minWidth: 42, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 4, alignItems: "center" },
  evidencePass: { backgroundColor: "rgba(0,200,150,.18)" },
  evidenceFail: { backgroundColor: "rgba(255,82,82,.18)" },
  evidenceNotRun: { backgroundColor: tokens.color.surface2 },
  evidenceMarkText: { color: tokens.color.text, fontSize: 10, fontWeight: "900" },
  evidenceCopy: { flex: 1 },
  evidenceLabel: { color: tokens.color.text, fontSize: 13, fontWeight: "800" },
  evidenceDetail: { color: tokens.color.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  success: { color: tokens.color.green, fontSize: 14, fontWeight: "800", lineHeight: 21 },
  error: { color: tokens.color.danger, lineHeight: 20 },
  disabled: { opacity: .45 }
});
