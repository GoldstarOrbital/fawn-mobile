// Transfers API — wired to the LIVE backend contract:
//   POST /transfers/send-unified  { recipient: "@user" | "0x…", amount_cents, memo? }
//   GET  /transfers/history?limit=N
//   GET  /accounts/check-username/{username}   (recipient pre-flight hint)
// Fees: $0.01 to a FAWN @username, $0.50 to an external 0x address.
import { apiFetch } from "./client";

export const FEE_INTERNAL_CENTS = 1;
export const FEE_EXTERNAL_CENTS = 50;

export type RecipientKind = "username" | "address" | "invalid";

export function classifyRecipient(raw: string): { kind: RecipientKind; normalized: string } {
  const value = raw.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) {
    return { kind: "address", normalized: value };
  }
  if (!value.startsWith("0x") && /^@?[a-z0-9_]{3,30}$/i.test(value)) {
    const handle = value.replace(/^@/, "").toLowerCase();
    return { kind: "username", normalized: `@${handle}` };
  }
  return { kind: "invalid", normalized: value };
}

export function feeCentsFor(kind: RecipientKind) {
  return kind === "address" ? FEE_EXTERNAL_CENTS : FEE_INTERNAL_CENTS;
}

export type UsernameCheck = {
  available: boolean; // available=false + "Username taken" means the user EXISTS (sendable)
  reason?: string;
};

export type TransferResponse = {
  transfer_id: string;
  amount: number;
  fee: number;
  total_debited: number;
  status: string;
  chain?: string | null;
  tx_hash?: string | null;
  created_at?: string | null;
};

export type TransferHistoryItem = {
  transfer_id: string;
  type: "send" | "receive";
  amount: number;
  fee: number;
  counterparty: string;
  status: string;
  memo?: string | null;
  chain?: string | null;
  tx_hash?: string | null;
  created_at?: string | null;
};

export function checkUsername(username: string, token: string) {
  return apiFetch<UsernameCheck>(`/accounts/check-username/${encodeURIComponent(username)}`, {}, token);
}

export function sendUnified(
  payload: { recipient: string; amount_cents: number; memo?: string },
  token: string
) {
  return apiFetch<TransferResponse>(
    "/transfers/send-unified",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function transferHistory(token: string, limit = 20) {
  return apiFetch<TransferHistoryItem[]>(`/transfers/history?limit=${limit}`, {}, token);
}
