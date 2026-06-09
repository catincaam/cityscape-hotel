import axios from "axios";
import { API_BASE_URL } from "../config/runtimeUrls";

const API = `${API_BASE_URL}/api/room-themes`;
const UPLOAD_API = `${API_BASE_URL}/api/upload`;

function throwApiError(err, fallbackMessage) {
  const message = err.response?.data?.message || err.message || fallbackMessage;
  throw new Error(message);
}

export async function updateRoomTheme(id, themeData) {
  const res = await axios.put(`${API}/${id}`, themeData, { withCredentials: true });
  return res.data;
}

export async function deleteRoomTheme(id) {
  try {
    const res = await axios.delete(`${API}/${id}`, { withCredentials: true });
    return res.data;
  } catch (err) {
    // Propagăm mesajul de eroare de la backend, dacă există
    if (err.response && err.response.data && err.response.data.message) {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

export async function getRoomThemes() {
  const res = await axios.get(API, { withCredentials: true });
  return res.data;
}

export async function createRoomTheme(themeData) {
  const res = await axios.post(API, themeData, { withCredentials: true });
  return res.data;
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await axios.post(UPLOAD_API, formData, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (err) {
    throwApiError(err, "Image upload failed");
  }
}

export async function uploadMultipleImages(files) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append("images", file);
  });
  try {
    const res = await axios.post(`${UPLOAD_API}/multiple`, formData, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (err) {
    throwApiError(err, "Image upload failed");
  }
}
