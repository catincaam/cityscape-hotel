// rewardService.js - API pentru puncte

const API_URL = "http://localhost:9001/api/reward-points";

export async function getUserPoints(userId) {
  const res = await fetch(`${API_URL}/user/${userId}`);
  return await res.json();
}

export async function getUserActivePoints(userId) {
  const res = await fetch(`${API_URL}/user/${userId}/active`);
  return await res.json();
}

export async function getUserPendingPoints(userId) {
  const res = await fetch(`${API_URL}/user/${userId}/pending`);
  return await res.json();
}

export async function addPendingPoints({ userId, reservationId, amount, description, availableAt }) {
  const res = await fetch(`${API_URL}/pending`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, reservationId, amount, description, availableAt })
  });
  return await res.json();
}

export async function activatePointsForReservation(reservationId) {
  const res = await fetch(`${API_URL}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId })
  });
  return await res.json();
}

export async function getAllRewards() {
  try {
    const res = await fetch("http://localhost:9001/api/rewards");
    if (!res.ok) throw new Error("Failed to fetch rewards");
    return await res.json();
  } catch (err) {
    console.error("getAllRewards error:", err);
    return [];
  }
}

export async function createReward({ title, desc, points, image, category }) {
  const res = await fetch("http://localhost:9001/api/rewards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, desc, points: parseInt(points), image, category })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Server error: ${res.status}`);
  }

  return await res.json();
}

export async function updateReward(id, { title, desc, points, image, category, active }) {
  const res = await fetch(`http://localhost:9001/api/rewards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, desc, points: points ? parseInt(points) : undefined, image, category, active })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Server error: ${res.status}`);
  }

  return await res.json();
}

export async function deleteReward(id) {
  const res = await fetch(`http://localhost:9001/api/rewards/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Server error: ${res.status}`);
  }

  return await res.json();
}
