import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Body, Panel, Screen, Title } from "@/components/Primitives";
import { useAuth } from "@/auth/AuthProvider";
import {
  confirmTransfer,
  createSend,
  getLimits,
  lookupHandle,
  type P2PLimits,
  type P2PTransfer
} from "@/api/p2p";
import { tokens } from "@/theme/tokens";

function newIdempotencyKey() {
  // crypto.randomUUID isn't guaranteed on every RN runtime.
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `send-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

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
  const [handle, setHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [lookupText, setLookupText] = useState("");
  const [limits, setLimits] = useState<P2PLimits | null>(null);
  const [pending, setPending] = useState<P2PTransfer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    getLimits(token)
      .then(setLimits)
      .catch(() => setLimits(null)); // advisory only — older backend just hides the hint
  }, [token]);

  const onHandleChange = useCallback(
    (value: string) => {
      setHandle(value);
      setLookupText("");
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
      const cleaned = value.replace(/^@/, "").toLowerCase();
      if (!token || !/^[a-z0-9_]{3,20}$/.test(cleaned)) return;
      lookupTimer.current = setTimeout(async () => {
        try {
          const result = await lookupHandle(`@${cleaned}`, token);
          setLookupText(
            result.claimable ? "No FAWN user has this handle yet." : `Sending to ${result.display_name || "@" + result.handle}`
          );
        } catch {
          setLookupText("");
        }
      }, 350);
    },
    [token]
  );

  async function onContinue() {
    if (!token) return;
    setError("");
    const cleaned = handle.replace(/^@/, "").toLowerCase();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) return setError("Enter a valid @handle.");
    if (!Number.isFinite(cents) || cents <= 0) return setError("Enter a valid amount.");

    if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
    setBusy(true);
    try {
      const transfer = await createSend(
        { to_handle: cleaned, amount_cents: cents, note: note.trim() || undefined, idempotency_key: idempotencyKey.current },
        token
      );
      setPending(transfer);
      setStep("confirm");
    } catch (err) {
      idempotencyKey.current = null;
      setError(errMessage(err, "Could not create the transfer."));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!token || !pending) return;
    setError("");
    setBusy(true);
    try {
      const done = await confirmTransfer(pending.id, true, token);
      setPending(done);
      setStep("done");
    } catch (err) {
      setError(errMessage(err, "Could not complete the transfer."));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("form");
    setHandle("");
    setAmount("");
    setNote("");
    setLookupText("");
    setPending(null);
    setError("");
    idempotencyKey.current = null;
    if (token) getLimits(token).then(setLimits).catch(() => {});
  }

  if (!token) {
    return (
      <Screen>
        <Title>Send money</Title>
        <Body>Log in to send money to other FAWN users.</Body>
      </Screen>
    );
  }

  if (step === "confirm" && pending) {
    const needsStepUp = pending.status === "requires_step_up" || pending.step_up_required;
    return (
      <Screen>
        <Title>Confirm your payment</Title>
        <Panel>
          <Text style={styles.confirmAmount}>{formatMoney(pending.amount_cents)}</Text>
          <Body>Sending to @{pending.counterparty_handle}</Body>
          {note.trim() ? <Text style={styles.note}>&ldquo;{note.trim()}&rdquo;</Text> : null}
          {pending.warning ? <Text style={styles.warning}>&#9888; {pending.warning}</Text> : null}
          {needsStepUp && !pending.warning ? (
            <Text style={styles.stepup}>&#9888; First-time send to this recipient. Double-check the handle — this can&rsquo;t be undone.</Text>
          ) : null}
          <Text style={styles.irreversible}>This can&rsquo;t be undone once confirmed.</Text>
        </Panel>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.primary} onPress={onConfirm} disabled={busy}>
          {busy ? <ActivityIndicator color={tokens.color.bg} /> : <Text style={styles.primaryText}>Confirm &amp; send {formatMoney(pending.amount_cents)}</Text>}
        </Pressable>
        <Pressable style={styles.secondary} onPress={reset} disabled={busy}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
      </Screen>
    );
  }

  if (step === "done" && pending) {
    return (
      <Screen>
        <Title>Sent.</Title>
        <Panel>
          <Text style={styles.confirmAmount}>{formatMoney(pending.amount_cents)}</Text>
          <Body>@{pending.counterparty_handle} has the money — Book Payments settle instantly.</Body>
        </Panel>
        <Pressable style={styles.primary} onPress={reset}>
          <Text style={styles.primaryText}>Send another</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Send money</Title>
      <Panel>
        <Text style={styles.label}>To @handle</Text>
        <TextInput
          style={styles.input}
          value={handle}
          onChangeText={onHandleChange}
          placeholder="friendhandle"
          placeholderTextColor={tokens.color.muted}
          autoCapitalize="none"
          autoCorrect={false}
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
        />
        {limits ? (
          <Text style={styles.limitHint}>
            {limits.max_send_cents > 0
              ? `You can send up to ${formatMoney(limits.max_send_cents)} right now.`
              : "You've reached your sending limit for now — it resets on a rolling 24-hour/7-day window."}
          </Text>
        ) : null}
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. dinner last night"
          placeholderTextColor={tokens.color.muted}
          maxLength={140}
        />
      </Panel>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={onContinue} disabled={busy}>
        {busy ? <ActivityIndicator color={tokens.color.bg} /> : <Text style={styles.primaryText}>Continue</Text>}
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
  warning: { color: tokens.color.danger, fontSize: 13, fontWeight: "700" },
  stepup: { color: "#ffb400", fontSize: 13, fontWeight: "700" },
  irreversible: { color: tokens.color.muted, fontSize: 12, textAlign: "center" },
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
