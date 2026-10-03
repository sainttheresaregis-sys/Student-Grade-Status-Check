import { validateStudentId } from "./validation.js";

const failure = (code) => Object.assign(new Error(code), { code });
let sequence = 0;

export function validateLookupResponse(value) {
  if (value?.error === "SYSTEM_CLOSED") throw failure("SYSTEM_CLOSED");
  if (value?.ok !== true || typeof value.found !== "boolean") throw failure("SERVICE_ERROR");
  if (!value.found) return { ok: true, found: false };
  const student = value.student;
  if (!student || typeof student.name !== "string" || typeof student.className !== "string" ||
      !Array.isArray(student.results) || student.results.some(row =>
        !row || typeof row.subject !== "string" || !["ร", "0"].includes(row.status))) {
    throw failure("SERVICE_ERROR");
  }
  return { ok: true, found: true, student: {
    name: student.name, className: student.className,
    results: student.results.map(({ subject, status }) => ({ subject, status })),
  } };
}

export async function lookupStudent(studentId, options = {}) {
  const host = options.windowRef ?? globalThis.window;
  const documentRef = options.documentRef ?? globalThis.document;
  const validated = validateStudentId(studentId);
  if (!validated.valid) throw failure("INVALID_REQUEST");
  let endpoint;
  try {
    endpoint = new URL(host?.APP_CONFIG?.appsScriptUrl);
    if (endpoint.protocol !== "https:" || endpoint.hostname !== "script.google.com" ||
        !/^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname) || endpoint.username || endpoint.password) {
      throw failure("CONFIG_MISSING");
    }
  } catch { throw failure("CONFIG_MISSING"); }

  return new Promise((resolve, reject) => {
    const callback = `__gradeLookup_${Date.now().toString(36)}_${++sequence}`;
    const script = documentRef.createElement("script");
    let finished = false;
    let timer;
    const finish = (error, response) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      script.onerror = null;
      script.remove();
      delete host[callback];
      if (error) reject(error); else resolve(response);
    };
    host[callback] = payload => {
      try { finish(null, validateLookupResponse(payload)); }
      catch (error) { finish(error); }
    };
    endpoint.searchParams.set("studentId", validated.value);
    endpoint.searchParams.set("callback", callback);
    script.async = true;
    script.src = endpoint.href;
    script.onerror = () => finish(failure("NETWORK_ERROR"));
    timer = setTimeout(() => finish(failure("TIMEOUT")), options.timeoutMs ?? 10000);
    try { documentRef.head.append(script); }
    catch { finish(failure("NETWORK_ERROR")); }
  });
}
