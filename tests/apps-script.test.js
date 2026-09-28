import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadAppsScript(overrides = {}) {
  const warnings = [];
  const context = {
    console: {
      error() {},
      log() {},
      warn(message) {
        warnings.push(String(message));
      },
    },
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(readFileSync(new URL("../apps-script/Code.gs", import.meta.url), "utf8"), context);
  return { context, warnings };
}

const CURRENT_HEADERS = ["รหัสประจำนนักเรียน", "ชื่อ - นามสกุล", "ชั้น", "รายวิชา", "ผลการเรียน"];
const CORRECTED_HEADERS = ["รหัสประจำตัวนักเรียน", "ชื่อ - นามสกุล", "ชั้น", "รายวิชา", "ผลการเรียน"];

test("resolveColumns_ accepts both the current and corrected student-ID header", () => {
  const { context } = loadAppsScript();
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveColumns_(CURRENT_HEADERS))),
    { studentId: 0, name: 1, className: 2, subject: 3, status: 4 },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveColumns_(CORRECTED_HEADERS))),
    { studentId: 0, name: 1, className: 2, subject: 3, status: 4 },
  );
});

test("resolveColumns_ fails safely when a required header is missing", () => {
  const { context } = loadAppsScript();
  assert.throws(() => context.resolveColumns_(["รหัสประจำตัวนักเรียน", "ชื่อ - นามสกุล"]), /MISSING_REQUIRED_HEADERS/);
});

test("buildLookupResponse_ matches the exact ID, trims values, filters statuses, preserves order, and removes duplicates", () => {
  const { context } = loadAppsScript();
  const rows = [
    CURRENT_HEADERS,
    [12345, " กฤติน ใจดี ", " ม.3 ", " คณิตศาสตร์เพิ่มเติม ", " ร "],
    [12345, "กฤติน ใจดี", "ม.3", "คณิตศาสตร์เพิ่มเติม", "ร"],
    [12345, "กฤติน ใจดี", "ม.3", "วิทยาศาสตร์และเทคโนโลยี", "0"],
    [12345, "กฤติน ใจดี", "ม.3", "ภาษาไทย", "2"],
    [123456, "คนละรหัส", "ม.3", "คณิตศาสตร์", "0"],
  ];

  const response = JSON.parse(JSON.stringify(context.buildLookupResponse_(rows, "12345")));
  assert.deepEqual(response, {
    ok: true,
    found: true,
    student: {
      name: "กฤติน ใจดี",
      className: "ม.3",
      results: [
        { subject: "คณิตศาสตร์เพิ่มเติม", status: "ร" },
        { subject: "วิทยาศาสตร์และเทคโนโลยี", status: "0" },
      ],
    },
  });
});

test("buildLookupResponse_ returns the same empty response for an unknown ID and no ร/0 rows", () => {
  const { context } = loadAppsScript();
  const rows = [CURRENT_HEADERS, [12345, "กฤติน ใจดี", "ม.3", "ภาษาไทย", "2"]];
  const unknown = JSON.parse(JSON.stringify(context.buildLookupResponse_(rows, "99999")));
  const noFlaggedResults = JSON.parse(JSON.stringify(context.buildLookupResponse_(rows, "12345")));
  assert.deepEqual(unknown, { ok: true, found: false });
  assert.deepEqual(noFlaggedResults, { ok: true, found: false });
});

test("buildLookupResponse_ keeps the first identity and logs conflicting sheet data", () => {
  const { context, warnings } = loadAppsScript();
  const rows = [
    CURRENT_HEADERS,
    [12345, "กฤติน ใจดี", "ม.3", "คณิตศาสตร์", "ร"],
    [12345, "ชื่อไม่ตรง", "ม.4", "วิทยาศาสตร์", "0"],
  ];

  const response = context.buildLookupResponse_(rows, "12345");
  assert.equal(response.student.name, "กฤติน ใจดี");
  assert.equal(response.student.className, "ม.3");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Conflicting identity data/);
  assert.doesNotMatch(warnings[0], /กฤติน|ชื่อไม่ตรง|12345/);
});

test("student ID and JSONP callback validation are strict", () => {
  const { context } = loadAppsScript();
  assert.equal(context.isValidStudentId_("1234"), true);
  assert.equal(context.isValidStudentId_("๑๒๓๔"), false);
  assert.equal(context.isValidStudentId_("12A4"), false);
  assert.equal(context.isValidCallback_("__gradeLookup_a1_B2"), true);
  assert.equal(context.isValidCallback_("alert(1)//"), false);
  assert.equal(context.isValidCallback_("otherCallback"), false);
});

test("doGet returns a safe service error without leaking backend details", () => {
  let outputText = "";
  const output = {
    setMimeType() {
      return this;
    },
    setContent(value) {
      outputText = value;
      return this;
    },
  };
  const { context } = loadAppsScript({
    ContentService: {
      MimeType: { JAVASCRIPT: "javascript" },
      createTextOutput(initial = "") {
        outputText = initial;
        return output;
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return { getProperties: () => ({}) };
      },
    },
  });

  context.doGet({ parameter: { studentId: "12345", callback: "__gradeLookup_safe" } });
  assert.equal(outputText, '__gradeLookup_safe({"ok":false,"error":"SERVICE_UNAVAILABLE"});');
  assert.doesNotMatch(outputText, /SPREADSHEET_ID|SHEET_NAME|Error/);
});

test("verifyConfiguration opens the configured sheet and validates its headers", () => {
  let openedSpreadsheetId = "";
  let requestedSheetName = "";
  const { context } = loadAppsScript({
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperties: () => ({
            SPREADSHEET_ID: "sheet-id",
            SHEET_NAME: "ผลการเรียน",
          }),
        };
      },
    },
    SpreadsheetApp: {
      openById(spreadsheetId) {
        openedSpreadsheetId = spreadsheetId;
        return {
          getSheetByName(sheetName) {
            requestedSheetName = sheetName;
            return {
              getRange(row, column, rowCount, columnCount) {
                assert.deepEqual([row, column, rowCount, columnCount], [1, 1, 1, 5]);
                return { getDisplayValues: () => [CURRENT_HEADERS] };
              },
              getLastColumn() {
                return 5;
              },
            };
          },
        };
      },
    },
  });

  assert.equal(context.verifyConfiguration(), "พร้อมใช้งาน");
  assert.equal(openedSpreadsheetId, "sheet-id");
  assert.equal(requestedSheetName, "ผลการเรียน");
});
