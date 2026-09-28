import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStudentId, validateStudentId } from "../assets/validation.js";

const VALIDATION_MESSAGE = "กรุณากรอกรหัสประจำตัวนักเรียนเป็นตัวเลข 4–10 หลัก";

test("normalizeStudentId trims ASCII student IDs", () => {
  assert.equal(normalizeStudentId("  12345  "), "12345");
});

test("normalizeStudentId safely handles non-string values", () => {
  assert.equal(normalizeStudentId(null), "");
  assert.equal(normalizeStudentId(undefined), "");
  assert.equal(normalizeStudentId(12345), "12345");
});

test("validateStudentId accepts 4 to 10 ASCII digits", () => {
  assert.deepEqual(validateStudentId(" 1234 "), { valid: true, value: "1234", message: "" });
  assert.deepEqual(validateStudentId("1234567890"), { valid: true, value: "1234567890", message: "" });
});

for (const [label, value] of [
  ["empty input", ""],
  ["too short input", "123"],
  ["too long input", "12345678901"],
  ["mixed input", "12A45"],
  ["Thai numerals", "๑๒๓๔๕"],
]) {
  test(`validateStudentId rejects ${label}`, () => {
    assert.deepEqual(validateStudentId(value), {
      valid: false,
      value: String(value).trim(),
      message: VALIDATION_MESSAGE,
    });
  });
}
