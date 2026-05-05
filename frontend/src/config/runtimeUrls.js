import axios from "axios";

const LOCAL_BACKEND_URL = "http://localhost:9001";
const PRODUCTION_BACKEND_URL = "https://cityscape-hotel-production.up.railway.app";

function getFallbackBackendUrl() {
  if (typeof window === "undefined") return LOCAL_BACKEND_URL;

  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "";

  return isLocal ? LOCAL_BACKEND_URL : PRODUCTION_BACKEND_URL;
}

export const API_BASE_URL = (process.env.REACT_APP_API_URL || getFallbackBackendUrl()).replace(/\/$/, "");

export function replaceBackendUrl(value) {
  if (typeof value !== "string") return value;

  if (value.startsWith("/api")) {
    return `${API_BASE_URL}${value}`;
  }

  if (typeof window !== "undefined" && value.startsWith(`${window.location.origin}/api`)) {
    return value.replace(window.location.origin, API_BASE_URL);
  }

  return value.replaceAll(LOCAL_BACKEND_URL, API_BASE_URL);
}

function rewriteElementUrls(root = document) {
  const elements = root.querySelectorAll?.("[src], [href], [action], [style]") || [];

  elements.forEach((element) => {
    ["src", "href", "action"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value?.includes(LOCAL_BACKEND_URL)) {
        element.setAttribute(attribute, replaceBackendUrl(value));
      }
    });

    const style = element.getAttribute("style");
    if (style?.includes(LOCAL_BACKEND_URL)) {
      element.setAttribute("style", replaceBackendUrl(style));
    }
  });
}

export function installRuntimeUrlBridge() {
  if (typeof window === "undefined") return;

  axios.defaults.baseURL = API_BASE_URL;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string") {
      return originalFetch(replaceBackendUrl(input), init);
    }

    if (input instanceof Request) {
      return originalFetch(new Request(replaceBackendUrl(input.url), input), init);
    }

    return originalFetch(input, init);
  };

  const originalOpen = window.XMLHttpRequest?.prototype?.open;
  if (originalOpen) {
    window.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      return originalOpen.call(this, method, replaceBackendUrl(url), ...rest);
    };
  }

  axios.interceptors.request.use((config) => {
    if (config.url) {
      config.url = replaceBackendUrl(config.url);
    }
    return config;
  });

  const observer = new MutationObserver(() => rewriteElementUrls());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "href", "action", "style"]
  });

  rewriteElementUrls();
}
