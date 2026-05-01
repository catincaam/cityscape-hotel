const LOCAL_BACKEND_URL = "http://localhost:9001";

export function getApiPublicUrl() {
  return (process.env.API_PUBLIC_URL || LOCAL_BACKEND_URL).replace(/\/$/, "");
}

export function publicAssetUrl(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `${getApiPublicUrl()}${path}`;
}
