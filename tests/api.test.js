import assert from "node:assert/strict";
import test from "node:test";

import { lookupStudent } from "../assets/api.js";

function createBrowserHarness(url = "https://script.google.com/macros/s/example/exec") {
  const appended = [];
  const removed = [];
  const windowRef = { APP_CONFIG: { appsScriptUrl: url } };
  const documentRef = {
    createElement(tagName) {
      assert.equal(tagName, "script");
      return {
        async: false,
        src: "",
        onerror: null,
        remove() {
          removed.push(this);
        },
      };
    },
    head: {
      append(script) {
        appended.push(script);
      },
    },
  };

  return { appended, documentRef, removed, windowRef };
}

function getCallbackName(script) {
  return new URL(script.src).searchParams.get("callback");
}

test("lookupStudent creates a unique JSONP callback for each request", async () => {
  const browser = createBrowserHarness();
  const first = lookupStudent("12345", { ...browser, timeoutMs: 1000 });
  const second = lookupStudent("67890", { ...browser, timeoutMs: 1000 });

  const firstCallback = getCallbackName(browser.appended[0]);
  const secondCallback = getCallbackName(browser.appended[1]);
  assert.match(firstCallback, /^__gradeLookup_[A-Za-z0-9_]+$/);
  assert.notEqual(firstCallback, secondCallback);

  browser.windowRef[firstCallback]({ ok: true, found: false });
  browser.windowRef[secondCallback]({ ok: true, found: false });
  await Promise.all([first, second]);
});

test("lookupStudent resolves a successful response and cleans up", async () => {
  const browser = createBrowserHarness();
  const pending = lookupStudent("12345", { ...browser, timeoutMs: 1000 });
  const script = browser.appended[0];
  const callback = getCallbackName(script);

  browser.windowRef[callback]({ ok: true, found: true, student: { name: "กฤติน ใจดี", className: "ม.3", results: [] } });

  assert.deepEqual(await pending, {
    ok: true,
    found: true,
    student: { name: "กฤติน ใจดี", className: "ม.3", results: [] },
  });
  assert.equal(browser.windowRef[callback], undefined);
  assert.deepEqual(browser.removed, [script]);
});

test("lookupStudent rejects service errors and cleans up", async () => {
  const browser = createBrowserHarness();
  const pending = lookupStudent("12345", { ...browser, timeoutMs: 1000 });
  const script = browser.appended[0];
  const callback = getCallbackName(script);

  browser.windowRef[callback]({ ok: false, error: "SERVICE_UNAVAILABLE" });

  await assert.rejects(pending, { code: "SERVICE_ERROR" });
  assert.equal(browser.windowRef[callback], undefined);
  assert.deepEqual(browser.removed, [script]);
});

test("lookupStudent times out and cleans up", async () => {
  const browser = createBrowserHarness();
  const pending = lookupStudent("12345", { ...browser, timeoutMs: 5 });
  const script = browser.appended[0];
  const callback = getCallbackName(script);

  await assert.rejects(pending, { code: "TIMEOUT" });
  assert.equal(browser.windowRef[callback], undefined);
  assert.deepEqual(browser.removed, [script]);
});

for (const [label, url] of [
  ["missing", ""],
  ["placeholder", "YOUR_APPS_SCRIPT_WEB_APP_URL"],
]) {
  test(`lookupStudent rejects ${label} deployment configuration`, async () => {
    const browser = createBrowserHarness(url);
    await assert.rejects(lookupStudent("12345", { ...browser }), { code: "CONFIG_MISSING" });
    assert.equal(browser.appended.length, 0);
  });
}
