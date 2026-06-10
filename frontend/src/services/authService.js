import { API_BASE_URL } from "../config/runtimeUrls";

const API = `${API_BASE_URL}/api`;

function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
  localStorage.removeItem("userEmail");
}

function storeClientSession(data) {
  clearStoredSession();
  localStorage.setItem("token", data.token);

  if (data.client) {
    const firstName = data.client.FirstName || data.client.firstName || "";
    const lastName = data.client.LastName || data.client.lastName || "";
    const userName = `${firstName} ${lastName}`.trim();
    const userId = data.client.ClientId || data.client.clientId || data.client.id;
    const userEmail = data.client.Email || data.client.email || "";
    if (userName) localStorage.setItem("userName", userName);
    if (userId) localStorage.setItem("userId", userId);
    if (userEmail) localStorage.setItem("userEmail", userEmail);
  }
}

export async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || "Registration failed");
  }

  const data = await r.json();
  storeClientSession(data);
  
  return data;
}

export async function adminLogin(email, password) {
  const r = await fetch(`${API}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || "Invalid credentials");
  }

  const data = await r.json();
  clearStoredSession();
  localStorage.setItem("token", data.token);

  if (data.admin) {
    localStorage.setItem("userName", data.admin.name || "Admin");
    localStorage.setItem("userId", data.admin.AdminId);
    localStorage.setItem("userEmail", data.admin.email || email);
  }

  return data;
}

export async function register(payload) {
  const r = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || "Invalid credentials");
  }

  return r.json();
}

export async function verifyEmail(token) {
  const r = await fetch(`${API}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(data.message || "Could not verify email");
  }

  return data;
}

export async function requestPasswordReset(email) {
  const r = await fetch(`${API}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(data.message || "Could not send reset email");
  }

  return data;
}

export async function resetPassword(token, password) {
  const r = await fetch(`${API}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(data.message || "Could not reset password");
  }

  return data;
}

export function logout() {
  clearStoredSession();
}
