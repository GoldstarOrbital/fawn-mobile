import { apiFetch } from "./client";

export type HandleLookup = {
  handle: string;
  claimable: boolean;
  display_name?: string;
};

export type P2PTransfer = {
  id: string;
  status: string;
  amount_cents: number;
  counterparty_handle: string;
  direction: string;
  note?: string | null;
  warning?: string | null;
  step_up_required?: boolean;
};

export type P2PLimits = {
  per_transaction_limit_cents: number;
  daily_limit_cents: number;
  weekly_limit_cents: number;
  daily_remaining_cents: number;
  weekly_remaining_cents: number;
  max_send_cents: number;
};

export function lookupHandle(handle: string, token: string) {
  return apiFetch<HandleLookup>(`/p2p/handles/lookup?handle=${encodeURIComponent(handle)}`, {}, token);
}

export function getLimits(token: string) {
  return apiFetch<P2PLimits>("/p2p/limits", {}, token);
}

export function createSend(
  payload: { to_handle: string; amount_cents: number; note?: string; idempotency_key: string },
  token: string
) {
  return apiFetch<P2PTransfer>("/p2p/transfers", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function confirmTransfer(transferId: string, stepUpAcknowledged: boolean, token: string) {
  return apiFetch<P2PTransfer>(
    `/p2p/transfers/${transferId}/confirm`,
    { method: "POST", body: JSON.stringify({ step_up_acknowledged: stepUpAcknowledged }) },
    token
  );
}

export function listTransfers(token: string) {
  return apiFetch<{ transfers: P2PTransfer[] }>("/p2p/transfers", {}, token);
}
