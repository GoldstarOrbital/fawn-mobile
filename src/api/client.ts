const API_BASE_URL = "https://web-production-13d5b.up.railway.app";

export type ApiError = {
  code?: string;
  message: string;
  recovery_action?: string;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let error: ApiError = { message: `Request failed with ${response.status}` };
    try {
      const body = await response.json();
      const detail = Array.isArray(body.detail)
        ? body.detail.map((d: { msg?: string }) => d.msg || String(d)).join("; ")
        : body.detail;
      error = { ...error, ...body, message: body.message || detail || error.message };
    } catch {}
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

// Matches the live backend's POST /auth/register contract exactly —
// no KYC fields: FAWN accounts are custodial USDC wallets, not bank accounts.
export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  is_student: boolean;
};

export type Me = {
  id: string;
  email: string;
  full_name: string;
  is_student: boolean;
  username?: string | null;
  wallet_initialized: boolean;
  crypto_wallet_address?: string | null;
  wallet_type?: string | null;
  school?: string | null;
  location?: string | null;
  military_status?: string | null;
};

export type WalletBalance = {
  usdc_balance: number;
  usdc_balance_cents: number;
  wallet_address?: string | null;
};

export type ClosedLoopCard = {
  id: string;
  public_id: string;
  last_four: string;
  status: "active" | "frozen" | "closed";
  card_type: "fawn_closed_loop_balance";
  network: "FAWN";
  per_transaction_limit_cents: number;
  daily_limit_cents: number;
  issued_at?: string | null;
  phone_wallet?: {
    fawn_app: boolean;
    dynamic_qr: boolean;
    dynamic_tap_token: boolean;
    google_wallet_pass_available: boolean;
    apple_wallet_pass_available: boolean;
    smart_tap_enabled: boolean;
  };
};

export type GoogleWalletPass = {
  wallet: "google_wallet";
  pass_type: "generic";
  add_url: string;
  smart_tap_enabled: false;
  payment_card: false;
  note: string;
};

export type AppleWalletPass = {
  wallet: "apple_wallet";
  pass_type: "generic";
  add_url: string;
  expires_in_seconds: number;
  nfc_enabled: false;
  payment_card: false;
  note: string;
};

export type TapCredential = {
  tap_token: string;
  tap_payload: string;
  qr_payload: string;
  expires_at: string;
  single_use: true;
  merchant_name: string;
  amount_cents: number;
  payer_total_cents: number;
};

export type NfcDevice = {
  id: string;
  card_id: string;
  device_name: string;
  platform: "android";
  status: "active" | "revoked";
  attestation_status: "unverified" | "verified" | "failed";
  key_fingerprint: string;
  hce_aid: string;
  requires_device_unlock: true;
  last_used_at?: string | null;
  created_at?: string | null;
};

export type MerchantAccount = {
  id: string;
  business_name: string;
  display_name: string;
  merchant_slug: string;
  support_email: string;
  status: "pending_review" | "active" | "suspended" | "rejected";
  transaction_fee_cents: 1;
};

export type MerchantCheckout = {
  id: string;
  checkout_token: string;
  merchant_id: string;
  merchant_name?: string | null;
  amount_cents: number;
  user_fee_cents: 1;
  merchant_fee_cents: 1;
  payer_total_cents: number;
  merchant_net_cents?: number | null;
  status: "open" | "completed" | "cancelled" | "expired" | "refunded";
  expires_at: string;
  checkout_url?: string;
};

export type NfcChallenge = {
  protocol: "fawn_hce_v1";
  hce_aid: string;
  challenge_b64: string;
  expires_at: string;
  requires_device_unlock: true;
  checkout: MerchantCheckout;
};

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function register(payload: RegisterPayload) {
  return apiFetch<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getMe(token: string) {
  return apiFetch<Me>("/auth/me", {}, token);
}

export function updateMe(patch: Partial<Pick<Me, "school" | "location" | "military_status">>, token: string) {
  return apiFetch<Me>("/auth/me", { method: "PATCH", body: JSON.stringify(patch) }, token);
}

export function getWalletBalance(token: string) {
  return apiFetch<WalletBalance>("/wallet/balance", {}, token);
}

export function createCustodialWallet(token: string) {
  return apiFetch<{ wallet_address: string }>(
    "/auth/wallets/create",
    { method: "POST", body: JSON.stringify({ wallet_type: "fawn_custodial" }) },
    token
  );
}

export function getClosedLoopCard(token: string) {
  return apiFetch<ClosedLoopCard>("/closed-loop/cards/me", {}, token);
}

export function issueClosedLoopCard(token: string) {
  return apiFetch<ClosedLoopCard>("/closed-loop/cards", { method: "POST", body: "{}" }, token);
}

export function updateClosedLoopCard(status: "active" | "frozen", token: string) {
  return apiFetch<ClosedLoopCard>(
    "/closed-loop/cards/me",
    { method: "PATCH", body: JSON.stringify({ status }) },
    token
  );
}

export function createTapCredential(checkoutToken: string, token: string) {
  return apiFetch<TapCredential>(
    "/closed-loop/cards/me/tap-token",
    { method: "POST", body: JSON.stringify({ checkout_token: checkoutToken }) },
    token
  );
}

export function createGoogleWalletPass(token: string) {
  return apiFetch<GoogleWalletPass>(
    "/closed-loop/cards/me/google-wallet",
    { method: "POST", body: "{}" },
    token
  );
}

export function createAppleWalletPass(token: string) {
  return apiFetch<AppleWalletPass>(
    "/closed-loop/cards/me/apple-wallet",
    { method: "POST", body: "{}" },
    token
  );
}

export function listNfcDevices(token: string) {
  return apiFetch<{ devices: NfcDevice[] }>("/closed-loop/cards/me/nfc-devices", {}, token);
}

export function registerNfcDevice(deviceName: string, publicKeySpkiB64: string, token: string) {
  return apiFetch<NfcDevice>(
    "/closed-loop/cards/me/nfc-devices",
    { method: "POST", body: JSON.stringify({ device_name: deviceName, public_key_spki_b64: publicKeySpkiB64 }) },
    token
  );
}

export function revokeNfcDevice(deviceId: string, token: string) {
  return apiFetch<NfcDevice>(`/closed-loop/cards/me/nfc-devices/${deviceId}`, { method: "DELETE" }, token);
}

export function getMyMerchant(token: string) {
  return apiFetch<MerchantAccount>("/closed-loop/merchants/me", {}, token);
}

export function createMerchantAccount(payload: { business_name: string; display_name: string; support_email: string }, token: string) {
  return apiFetch<MerchantAccount>(
    "/closed-loop/merchants",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export function createMerchantCheckout(amountCents: number, orderReference: string | null, token: string) {
  return apiFetch<MerchantCheckout>(
    "/closed-loop/merchant/checkouts",
    { method: "POST", body: JSON.stringify({ amount_cents: amountCents, order_reference: orderReference }) },
    token
  );
}

export function createNfcChallenge(checkoutToken: string, token: string) {
  return apiFetch<NfcChallenge>(
    `/closed-loop/merchant/checkouts/${checkoutToken}/nfc-challenge`,
    { method: "POST", body: "{}" },
    token
  );
}

export function authorizeNfcCheckout(
  checkoutToken: string,
  payload: { device_id: string; challenge_b64: string; signature_b64: string },
  token: string
) {
  return apiFetch<MerchantCheckout & {
    acceptance_method: "android_hce";
    payer_balance_cents: number;
    merchant_balance_cents: number;
    idempotent_replay: boolean;
  }>(
    `/closed-loop/merchant/checkouts/${checkoutToken}/nfc-authorize`,
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}
