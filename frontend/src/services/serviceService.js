import axios from "axios";

const API = "http://localhost:9001/api/services";

export async function getServices() {
  const res = await axios.get(API, { withCredentials: true });
  return res.data;
}

export async function createService(data) {
  const res = await axios.post(API, data, { withCredentials: true });
  return res.data;
}

export async function deleteService(id) {
  await axios.delete(`${API}/${id}`, { withCredentials: true });
}
