import axios from "axios";

const API = "http://localhost:9001/api/room-themes";

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
  const res = await axios.post("http://localhost:9001/api/upload", formData, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
}

export async function uploadMultipleImages(files) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append("images", file);
  });
  const res = await axios.post("http://localhost:9001/api/upload/multiple", formData, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
}
