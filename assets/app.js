import { lookupStudent } from "./api.js";
import { clearResults, renderEmpty, renderResult, renderServiceError } from "./render.js";
import { validateStudentId } from "./validation.js";

export function createSearchController({
  form,
  input,
  errorRegion,
  statusRegion,
  resultRegion,
  submitButton,
  submitLabel,
  lookup = lookupStudent,
  renderResult: showResult = renderResult,
  renderEmpty: showEmpty = renderEmpty,
  renderServiceError: showServiceError = renderServiceError,
}) {
  let requestToken = 0;
  let pendingStudentId = null;
  let lastStudentId = "";

  const setLoading = (loading) => {
    submitButton.disabled = loading;
    submitButton.setAttribute("aria-busy", String(loading));
    submitLabel.textContent = loading ? "กำลังตรวจสอบ…" : "ตรวจสอบผลการเรียน";
    statusRegion.textContent = loading ? "กำลังตรวจสอบข้อมูล…" : "";
  };

  const clearValidation = () => {
    errorRegion.textContent = "";
    input.removeAttribute("aria-invalid");
  };

  const showValidationError = (message) => {
    errorRegion.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.focus();
  };

  const runSearch = async (rawValue) => {
    const validation = validateStudentId(rawValue);

    if (validation.valid && pendingStudentId === validation.value) {
      return;
    }

    requestToken += 1;
    const currentToken = requestToken;

    clearResults(resultRegion);
    statusRegion.textContent = "";

    if (!validation.valid) {
      pendingStudentId = null;
      setLoading(false);
      showValidationError(validation.message);
      return;
    }

    clearValidation();
    input.value = validation.value;
    pendingStudentId = validation.value;
    lastStudentId = validation.value;
    setLoading(true);

    try {
      const response = await lookup(validation.value);
      if (currentToken !== requestToken) return;

      if (response.found) {
        showResult(resultRegion, response);
      } else {
        showEmpty(resultRegion);
      }
    } catch {
      if (currentToken !== requestToken) return;
      showServiceError(resultRegion, () => runSearch(lastStudentId));
    } finally {
      if (currentToken === requestToken) {
        pendingStudentId = null;
        setLoading(false);
      }
    }
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    return runSearch(input.value);
  };

  form.addEventListener("submit", handleSubmit);

  return { submit: handleSubmit };
}

function initializePage() {
  const form = document.querySelector("#search-form");
  if (!form) return;

  createSearchController({
    form,
    input: document.querySelector("#student-id"),
    errorRegion: document.querySelector("#form-error"),
    statusRegion: document.querySelector("#status-region"),
    resultRegion: document.querySelector("#result-region"),
    submitButton: form.querySelector("button[type='submit']"),
    submitLabel: form.querySelector("button[type='submit'] span"),
  });
}

if (typeof document !== "undefined") {
  initializePage();
}
