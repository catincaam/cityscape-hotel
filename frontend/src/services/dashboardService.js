const API = "http://localhost:9001/api";

export async function getDashboardData() {
  const token = localStorage.getItem("token");

  // 🛡 fallback DEV (ca să nu mai crape UI-ul)
  if (!token) {
    return {
      client: { firstName: "Guest" },
      cityPoints: 0,
      status: "—",
      nextDestination: null
    };
  }

  const r = await fetch(`${API}/dashboard`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  if (!r.ok) {
    throw new Error("Unauthorized");
  }

  return r.json();
}
