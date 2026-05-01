import axios from "axios";

const LOCAL_BACKEND_URL = "http://localhost:9001";

export const API_BASE_URL = (process.env.REACT_APP_API_URL || LOCAL_BACKEND_URL).replace(/\/$/, "");

export function replaceBackendUrl(value) {
  if (typeof value !== "string") return value;
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
  if (API_BASE_URL === LOCAL_BACKEND_URL || typeof window === "undefined") return;

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
