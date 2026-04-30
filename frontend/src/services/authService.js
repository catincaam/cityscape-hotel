const API = "http://localhost:9001/api";

export async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || "Credentiale invalide");
  }

  const data = await r.json();
  localStorage.setItem("token", data.token);
  
  // Store user info
  if (data.client) {
    const userName = `${data.client.FirstName} ${data.client.LastName}`.trim();
    localStorage.setItem("userName", userName);
    localStorage.setItem("userId", data.client.ClientId);
  }
  
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
  localStorage.setItem("token", data.token);

  if (data.admin) {
    localStorage.setItem("userName", data.admin.name || "Admin");
    localStorage.setItem("userId", data.admin.AdminId);
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
    throw new Error(err.message || "Înregistrarea a eșuat");
  }

  return r.json();
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
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
}
