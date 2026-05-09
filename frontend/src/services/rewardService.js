// rewardService.js - API pentru puncte
import { API_BASE_URL } from "../config/runtimeUrls";

const API = `${API_BASE_URL}/api`;
const API_URL = `${API}/reward-points`;

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
    const res = await fetch(`${API}/rewards/admin/all`);
    if (!res.ok) throw new Error("Failed to fetch rewards");
    return await res.json();
  } catch (err) {
    console.error("getAllRewards error:", err);
    return [];
  }
}

export async function getActiveRewards() {
  try {
    const res = await fetch(`${API}/rewards`);
    if (!res.ok) throw new Error("Failed to fetch active rewards");
    return await res.json();
  } catch (err) {
    console.error("getActiveRewards error:", err);
    return [];
  }
}

export async function createReward({ title, desc, points, image, category, rewardType }) {
  const res = await fetch(`${API}/rewards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, desc, points: parseInt(points), image, category, rewardType: rewardType || 'per_booking' })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Server error: ${res.status}`);
  }

  return await res.json();
}

export async function updateReward(id, { title, desc, points, image, category, rewardType, active }) {
  const payload = { title, desc, points: points ? parseInt(points) : undefined, image, category, rewardType, active };
  console.log('📤 updateReward payload:', payload);
  
  const res = await fetch(`${API}/rewards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Server error: ${res.status}`);
  }

  const result = await res.json();
  console.log('📥 updateReward response:', result);
  return result;
}

export async function deleteReward(id) {
  const res = await fetch(`${API}/rewards/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Server error: ${res.status}`);
  }

  return await res.json();
}
