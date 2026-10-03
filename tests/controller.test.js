import assert from "node:assert/strict";
import test from "node:test";

import { createSearchController } from "../assets/app.js";
import { FakeDocument, FakeElement } from "./helpers/fake-dom.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createHarness({ lookup } = {}) {
  const documentRef = new FakeDocument();
  const form = new FakeElement("form", documentRef);
  const input = new FakeElement("input", documentRef);
  const error = new FakeElement("p", documentRef);
  const status = new FakeElement("div", documentRef);
  const result = new FakeElement("section", documentRef);
  const submitButton = new FakeElement("button", documentRef);
  const submitLabel = new FakeElement("span", documentRef);
  submitLabel.textContent = "ตรวจสอบผลการเรียน";
  submitButton.append(submitLabel);

  const calls = { empty: 0, error: 0, lookup: [], result: [] };
  let retry;
  const lookupImpl = lookup ?? (async () => ({ ok: true, found: false }));

  const controller = createSearchController({
    form,
    input,
    errorRegion: error,
    statusRegion: status,
    resultRegion: result,
    submitButton,
    submitLabel,
    lookup: (studentId) => {
      calls.lookup.push(studentId);
      return lookupImpl(studentId);
    },
    renderResult: (_container, response) => calls.result.push(response),
    renderEmpty: () => {
      calls.empty += 1;
    },
    renderServiceError: (_container, retryHandler) => {
      calls.error += 1;
      retry = retryHandler;
    },
  });

  const submit = () => form.listeners.get("submit")({ preventDefault() {} });
  return {
    calls,
    controller,
    error,
    get retry() {
      return retry;
    },
    form,
    input,
    result,
    status,
    submit,
    submitButton,
    submitLabel,
  };
}

test("controller rejects invalid input, clears old results, and restores focus", async () => {
  const harness = createHarness();
  harness.input.value = "๑๒๓๔๕";
  harness.result.append(new FakeElement("div", harness.result.ownerDocument));

  await harness.submit();

  assert.equal(harness.calls.lookup.length, 0);
  assert.equal(harness.result.children.length, 0);
  assert.equal(harness.input.attributes.get("aria-invalid"), "true");
  assert.equal(harness.input.focused, true);
  assert.equal(harness.error.textContent, "กรุณากรอกรหัสประจำตัวนักเรียนเป็นตัวเลข 5 หลัก");
});

test("controller exposes loading state and ignores a duplicate pending submission", async () => {
  const pending = deferred();
  const harness = createHarness({ lookup: () => pending.promise });
  harness.input.value = "12345";

  const first = harness.submit();
  const duplicate = harness.submit();

  assert.equal(harness.submitButton.disabled, true);
  assert.equal(harness.submitLabel.textContent, "กำลังตรวจสอบ…");
  assert.equal(harness.status.textContent, "กำลังตรวจสอบข้อมูล…");
  assert.deepEqual(harness.calls.lookup, ["12345"]);

  pending.resolve({ ok: true, found: false });
  await Promise.all([first, duplicate]);
  assert.equal(harness.submitButton.disabled, false);
  assert.equal(harness.calls.empty, 1);
});

test("controller renders a found result and clears validation state", async () => {
  const response = { ok: true, found: true, student: { name: "กฤติน ใจดี", className: "ม.3", results: [] } };
  const harness = createHarness({ lookup: async () => response });
  harness.input.value = " 12345 ";
  harness.input.setAttribute("aria-invalid", "true");
  harness.error.textContent = "old error";

  await harness.submit();

  assert.deepEqual(harness.calls.lookup, ["12345"]);
  assert.deepEqual(harness.calls.result, [response]);
  assert.equal(harness.input.attributes.has("aria-invalid"), false);
  assert.equal(harness.error.textContent, "");
  assert.equal(harness.status.textContent, "");
});

test("controller offers retry after a service error", async () => {
  let attempts = 0;
  const harness = createHarness({
    lookup: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("network");
      return { ok: true, found: false };
    },
  });
  harness.input.value = "12345";

  await harness.submit();
  assert.equal(harness.calls.error, 1);
  assert.equal(typeof harness.retry, "function");

  await harness.retry();
  assert.equal(attempts, 2);
  assert.equal(harness.calls.empty, 1);
});

test("controller ignores a late response from an older search", async () => {
  const first = deferred();
  const second = deferred();
  const harness = createHarness({
    lookup: (studentId) => (studentId === "12345" ? first.promise : second.promise),
  });

  harness.input.value = "12345";
  const firstSubmit = harness.submit();
  harness.input.value = "67890";
  const secondSubmit = harness.submit();

  const newerResponse = { ok: true, found: true, student: { name: "วารี", className: "ม.2", results: [] } };
  second.resolve(newerResponse);
  await secondSubmit;
  first.resolve({ ok: true, found: true, student: { name: "ข้อมูลเก่า", className: "ม.1", results: [] } });
  await firstSubmit;

  assert.deepEqual(harness.calls.result, [newerResponse]);
});


test("typing validates immediately and invalidates a pending search", async () => {
  const pending = deferred();
  const harness = createHarness({lookup: () => pending.promise});
  harness.input.value = '12345';
  const request = harness.submit();
  harness.input.value = '1234';
  harness.input.listeners.get('input')();
  assert.equal(harness.input.attributes.get('aria-invalid'), 'true');
  assert.ok(harness.error.textContent);
  pending.resolve({ok:true,found:false});
  await request;
  assert.equal(harness.calls.empty, 0);
  harness.input.value = '123456';
  harness.input.listeners.get('input')();
  assert.ok(harness.error.textContent);
  harness.input.value = '00123';
  harness.input.listeners.get('input')();
  assert.equal(harness.error.textContent, '');
  assert.equal(harness.input.attributes.has('aria-invalid'), false);
});
