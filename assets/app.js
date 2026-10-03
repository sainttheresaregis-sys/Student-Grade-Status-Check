import { lookupStudent } from "./api.js";
import { clearResults, renderEmpty, renderResult, renderServiceError } from "./render.js";
import { validateStudentId } from "./validation.js";

export function createSearchController(elements) {
  const { form, input, errorRegion, statusRegion, resultRegion, submitButton, submitLabel } = elements;
  const lookup = elements.lookup ?? lookupStudent;
  const views = {
    found: elements.renderResult ?? renderResult,
    empty: elements.renderEmpty ?? renderEmpty,
    error: elements.renderServiceError ?? renderServiceError,
  };
  let active = null;
  function busy(value) {
    submitButton.disabled = value;
    submitButton.setAttribute("aria-busy", String(value));
    submitLabel.textContent = value ? "กำลังตรวจสอบ…" : "ตรวจสอบผลการเรียน";
    statusRegion.textContent = value ? "กำลังตรวจสอบข้อมูล…" : "";
  }
  async function search(raw) {
    const checked = validateStudentId(raw);
    if (checked.valid && active?.id === checked.value) return;
    const request = { id: checked.value };
    active = request;
    clearResults(resultRegion);
    errorRegion.textContent = checked.message;
    if (!checked.valid) {
      active = null;
      busy(false);
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    input.value = checked.value;
    busy(true);
    try {
      const response = await lookup(request.id);
      if (active !== request) return;
      if (response.found) views.found(resultRegion, response);
      else views.empty(resultRegion);
    } catch {
      if (active === request) views.error(resultRegion, () => search(request.id));
    } finally {
      if (active === request) { active = null; busy(false); }
    }
  }
  const submit = event => { event?.preventDefault?.(); return search(input.value); };
  form.addEventListener("submit", submit);
  return { submit };
}

export function initializePage(documentRef = globalThis.document) {
  const form = documentRef.querySelector("#search-form");
  if (!form) return;
  return createSearchController({
    form,
    input: documentRef.querySelector("#student-id"),
    errorRegion: documentRef.querySelector("#form-error"),
    statusRegion: documentRef.querySelector("#status-region"),
    resultRegion: documentRef.querySelector("#result-region"),
    submitButton: form.querySelector("button[type='submit']"),
    submitLabel: form.querySelector("button[type='submit'] span"),
  });
}
if (typeof document !== "undefined") initializePage();
