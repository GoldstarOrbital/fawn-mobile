import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import { getWalletBalance } from "@/api/client";
import {
  checkUsername,
  classifyRecipient,
  feeCentsFor,
  sendUnified,
  type TransferResponse
} from "@/api/p2p";
import { tokens } from "@/theme/tokens";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function errMessage(err: unknown, fallback: string) {
  return err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : fallback;
}

type Step = "form" | "confirm" | "done";

export default function SendScreen() {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [lookupText, setLookupText] = useState("");
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [result, setResult] = useState<TransferResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    getWalletBalance(token)
      .then((b) => setBalanceCents(b.usdc_balance_cents))
      .catch(() => setBalanceCents(null)); // advisory only — the backend re-checks on send
  }, [token, step]);

  const onRecipientChange = useCallback(
    (value: string) => {
      setRecipient(value);
      setLookupText("");
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
      if (!token) return;
      const { kind, normalized } = classifyRecipient(value);
      if (kind === "address") {
        setLookupText("External wallet — $0.50 fee, settles on-chain.");
        return;
      }
      if (kind !== "username") return;
      const handle = normalized.slice(1);
      lookupTimer.current = setTimeout(async () => {
        try {
          const check = await checkUsername(handle, token);
          // available=false + "Username taken" means a FAWN user owns it → sendable
          if (!check.available && /taken/i.test(check.reason || "")) {
            setLookupText(`Sending to ${normalized} — $0.01 fee, instant.`);
          } else if (check.available) {
            setLookupText(`No FAWN user has ${normalized} yet — double-check the spelling.`);
          }
        } catch {
          setLookupText("");
        }
      }, 350);
    },
    [token]
  );

  function parsedCents() {
    const cents = Math.round(parseFloat(amount) * 100);
    return Number.isFinite(cents) ? cents : NaN;
  }

  function onContinue() {
    setError("");
    const { kind } = classifyRecipient(recipient);
    const cents = parsedCents();
    if (kind === "invalid") return setError("Enter a valid @username or 0x… wallet address.");
    if (!Number.isFinite(cents) || cents <= 0) return setError("Enter a valid amount.");
    const totalCents = cents + feeCentsFor(kind);
    if (balanceCents !== null && totalCents > balanceCents) {
      return setError(`That's more than your balance (${formatMoney(balanceCents)} available, including the fee).`);
    }
    setStep("confirm");
  }

  async function onConfirm() {
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      const { normalized } = classifyRecipient(recipient);
      const done = await sendUnified(
        { recipient: normalized, amount_cents: parsedCents(), memo: memo.trim() || undefined },
        token
      );
      setResult(done);
      setStep("done");
    } catch (err) {
      setError(errMessage(err, "Could not complete the transfer."));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("form");
    setRecipient("");
    setAmount("");
    setMemo("");
    setLookupText("");
    setResult(null);
    setError("");
  }

  if (!token) {
    return (
      <Screen>
        <Title>Send money</Title>
        <Body>Log in to send USDC to other FAWN users or any wallet address.</Body>
      </Screen>
    );
  }

  if (step === "confirm") {
    const { kind, normalized } = classifyRecipient(recipient);
    const cents = parsedCents();
    const fee = feeCentsFor(kind);
    return (
      <Screen>
        <Title>Confirm your payment</Title>
        <Panel>
          <Text style={styles.confirmAmount}>{formatMoney(cents)}</Text>
          <Body>Sending to {normalized}</Body>
          {memo.trim() ? <Text style={styles.note}>&ldquo;{memo.trim()}&rdquo;</Text> : null}
          <Text style={styles.feeLine}>Fee {formatMoney(fee)} · total {formatMoney(cents + fee)}</Text>
          {kind === "address" ? (
            <Text style={styles.stepup}>&#9888; External wallet send. Double-check the address — on-chain transfers can&rsquo;t be undone.</Text>
          ) : (
            <Text style={styles.irreversible}>This can&rsquo;t be undone once confirmed.</Text>
          )}
        </Panel>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.primary} onPress={onConfirm} disabled={busy} accessibilityRole="button">
          {busy ? <ActivityIndicator color={tokens.color.bg} /> : <Text style={styles.primaryText}>Confirm &amp; send {formatMoney(cents)}</Text>}
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => setStep("form")} disabled={busy} accessibilityRole="button">
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
      </Screen>
    );
  }

  if (step === "done" && result) {
    const settledInReview = /review|held|pending_review/i.test(result.status);
    return (
      <Screen>
        <Title>{settledInReview ? "Almost there." : "Sent."}</Title>
        <Panel>
          <Text style={styles.confirmAmount}>{formatMoney(Math.round(result.amount * 100))}</Text>
          <Body>
            {settledInReview
              ? "This send is held for a quick security review — it'll go out automatically once cleared."
              : `Delivered. Fee ${formatMoney(Math.round(result.fee * 100))} — status: ${result.status}.`}
          </Body>
          {result.tx_hash && !result.tx_hash.startsWith("balance-fallback") ? (
            <Text style={styles.txHash}>tx {result.tx_hash.slice(0, 10)}…{result.tx_hash.slice(-6)}{result.chain ? ` on ${result.chain}` : ""}</Text>
          ) : null}
        </Panel>
        <Pressable style={styles.primary} onPress={reset} accessibilityRole="button">
          <Text style={styles.primaryText}>Send another</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Send money</Title>
      <Panel>
        <Text style={styles.label}>To @username or 0x… address</Text>
        <TextInput
          style={styles.input}
          value={recipient}
          onChangeText={onRecipientChange}
          placeholder="@friendhandle or 0x…"
          placeholderTextColor={tokens.color.muted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Recipient username or wallet address"
        />
        {lookupText ? <Text style={styles.lookup}>{lookupText}</Text> : null}
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={tokens.color.muted}
          keyboardType="decimal-pad"
          accessibilityLabel="Amount in dollars"
        />
        {balanceCents !== null ? (
          <Text style={styles.limitHint}>{formatMoney(balanceCents)} available</Text>
        ) : null}
        <Text style={styles.label}>Memo (optional)</Text>
        <TextInput
          style={styles.input}
          value={memo}
          onChangeText={setMemo}
          placeholder="e.g. dinner last night"
          placeholderTextColor={tokens.color.muted}
          maxLength={140}
          accessibilityLabel="Optional memo"
        />
      </Panel>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={onContinue} disabled={busy} accessibilityRole="button">
        <Text style={styles.primaryText}>Continue</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: tokens.color.muted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  input: {
    backgroundColor: tokens.color.bg,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    color: tokens.color.text,
    padding: tokens.space.md,
    fontSize: 16
  },
  lookup: { color: tokens.color.green, fontSize: 13, fontWeight: "600" },
  limitHint: { color: tokens.color.muted, fontSize: 12 },
  confirmAmount: { color: tokens.color.text, fontSize: 40, fontWeight: "900", textAlign: "center" },
  note: { color: tokens.color.text, fontSize: 15, fontStyle: "italic", textAlign: "center" },
  feeLine: { color: tokens.color.muted, fontSize: 13, textAlign: "center" },
  stepup: { color: "#ffb400", fontSize: 13, fontWeight: "700" },
  irreversible: { color: tokens.color.muted, fontSize: 12, textAlign: "center" },
  txHash: { color: tokens.color.muted, fontSize: 12, fontFamily: "monospace", textAlign: "center" },
  error: { color: tokens.color.danger, fontWeight: "700" },
  primary: {
    backgroundColor: tokens.color.green,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    alignItems: "center"
  },
  primaryText: { color: tokens.color.bg, fontWeight: "800", fontSize: 16 },
  secondary: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.md, alignItems: "center" },
  secondaryText: { color: tokens.color.text, fontWeight: "800" }
});
