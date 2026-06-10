// Service pentru operații camere
import { API_BASE_URL } from "../config/runtimeUrls";

export async function deleteRoom(roomId) {
  const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Eroare la ștergerea camerei');
  return res.json();
}
