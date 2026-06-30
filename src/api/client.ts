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
      error = { ...error, ...body, message: body.message || body.detail || error.message };
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

export type DashboardResponse = {
  account_active: boolean;
  application_pending: boolean;
  balance: null | {
    available?: number;
    current?: number;
    currency?: string;
  };
  transactions: unknown[];
};

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function register(payload: Record<string, unknown>) {
  return apiFetch<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getDashboard(token: string) {
  return apiFetch<DashboardResponse>("/accounts/dashboard", {}, token);
}
