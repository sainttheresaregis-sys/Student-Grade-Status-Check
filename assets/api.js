const DEFAULT_TIMEOUT_MS = 10_000;
const PLACEHOLDER_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";

function createLookupError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createCallbackName() {
  const randomPart = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().replaceAll("-", "")
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

  return `__gradeLookup_${randomPart}`;
}

function getConfiguredUrl(windowRef) {
  const configuredUrl = windowRef?.APP_CONFIG?.appsScriptUrl;
  if (
    typeof configuredUrl !== "string" ||
    configuredUrl.trim() === "" ||
    configuredUrl.includes(PLACEHOLDER_URL)
  ) {
    throw createLookupError("CONFIG_MISSING", "Apps Script URL is not configured");
  }

  try {
    return new URL(configuredUrl);
  } catch {
    throw createLookupError("CONFIG_MISSING", "Apps Script URL is invalid");
  }
}

export function lookupStudent(studentId, options = {}) {
  const windowRef = options.windowRef ?? globalThis.window;
  const documentRef = options.documentRef ?? globalThis.document;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let endpoint;
  try {
    endpoint = getConfiguredUrl(windowRef);
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const callbackName = createCallbackName();
    const script = documentRef.createElement("script");
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      script.remove();
      delete windowRef[callbackName];
    };

    const settle = (handler, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler(value);
    };

    windowRef[callbackName] = (response) => {
      if (!response || response.ok !== true) {
        settle(reject, createLookupError("SERVICE_ERROR", "Lookup service returned an error"));
        return;
      }
      settle(resolve, response);
    };

    script.async = true;
    script.onerror = () => {
      settle(reject, createLookupError("NETWORK_ERROR", "Lookup service could not be reached"));
    };

    endpoint.searchParams.set("studentId", studentId);
    endpoint.searchParams.set("callback", callbackName);
    script.src = endpoint.toString();

    const timeoutId = setTimeout(() => {
      settle(reject, createLookupError("TIMEOUT", "Lookup service timed out"));
    }, timeoutMs);

    documentRef.head.append(script);
  });
}
