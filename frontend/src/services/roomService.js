// Service pentru operații camere
export async function deleteRoom(roomId) {
  const res = await fetch(`http://localhost:9001/api/rooms/${roomId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Eroare la ștergerea camerei');
  return res.json();
}
