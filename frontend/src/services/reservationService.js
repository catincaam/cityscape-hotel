export async function createReservation(payload) {
  return axios.post("/api/reservations", payload, { withCredentials: true });
}
