const LOCAL_BACKEND_URL = "http://localhost:9001";

export function getApiPublicUrl() {
  if (process.env.API_PUBLIC_URL) return process.env.API_PUBLIC_URL.replace(/\/$/, "");
  if (process.env.BACKEND_PUBLIC_URL) return process.env.BACKEND_PUBLIC_URL.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`.replace(/\/$/, "");
  return LOCAL_BACKEND_URL;
}

export function publicAssetUrl(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `${getApiPublicUrl()}${path}`;
}
