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

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
}
