import axios from "axios";
import { API_BASE_URL } from "../config/runtimeUrls";

const API = `${API_BASE_URL}/api/services`;

export async function getServices() {
  const res = await axios.get(API, { withCredentials: true });
  return res.data;
}

export async function createService(data) {
  const res = await axios.post(API, data, { withCredentials: true });
  return res.data;
}

export async function updateService(id, data) {
  const res = await axios.put(`${API}/${id}`, data, { withCredentials: true });
  return res.data;
}

export async function deleteService(id) {
  await axios.delete(`${API}/${id}`, { withCredentials: true });
}
