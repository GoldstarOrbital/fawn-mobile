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
