import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStudentId, validateStudentId } from "../assets/validation.js";

const VALIDATION_MESSAGE = "กรุณากรอกรหัสประจำตัวนักเรียนเป็นตัวเลข 5 หลัก";

test("normalizeStudentId trims ASCII student IDs", () => {
  assert.equal(normalizeStudentId("  12345  "), "12345");
});

test("normalizeStudentId safely handles non-string values", () => {
  assert.equal(normalizeStudentId(null), "");
  assert.equal(normalizeStudentId(undefined), "");
  assert.equal(normalizeStudentId(12345), "12345");
});

test("validateStudentId accepts exactly 5 ASCII digits", () => {
  assert.deepEqual(validateStudentId(" 12345 "), { valid: true, value: "12345", message: "" });
  assert.deepEqual(validateStudentId("00123"), { valid: true, value: "00123", message: "" });
});

for (const [label, value] of [
  ["empty input", ""],
  ["too short input", "1234"],
  ["too long input", "123456"],
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
