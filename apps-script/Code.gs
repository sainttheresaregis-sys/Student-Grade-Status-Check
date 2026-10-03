var HEADER_ALIASES_ = {
  studentId: ["รหัสประจำนนักเรียน", "รหัสประจำตัวนักเรียน", "รหัสนักเรียน"],
  name: ["ชื่อ - นามสกุล", "ชื่อ-นามสกุล", "ชื่อ นามสกุล"],
  className: ["ชั้น"],
  subject: ["รายวิชา"],
  status: ["ผลการเรียน"],
};

function verifyConfiguration() {
  var properties = PropertiesService.getScriptProperties().getProperties();
  var sheet = getConfiguredSheet_(properties);
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error("Configured sheet is empty");
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  resolveColumns_(headers);
  return "พร้อมใช้งาน";
}

function doGet(e) {
  var parameters = (e && e.parameter) || {};
  if (parameters.admin === "1") {
    return HtmlService.createHtmlOutputFromFile("Admin").setTitle("ผู้ดูแลระบบผลการเรียน")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
  var callback = trimValue_(parameters.callback);

  if (!isValidCallback_(callback)) {
    return ContentService.createTextOutput("void 0;")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  var studentId = trimValue_(parameters.studentId);
  if (!isValidStudentId_(studentId)) {
    return createJsonpOutput_(callback, { ok: false, error: "INVALID_REQUEST" });
  }

  try {
    var properties = PropertiesService.getScriptProperties().getProperties();
    if (properties.LOOKUP_ENABLED === "false") {
      return createJsonpOutput_(callback, { ok: false, error: "SYSTEM_CLOSED" });
    }
    var sheet = getConfiguredSheet_(properties);
    var rows = sheet.getDataRange().getDisplayValues();
    return createJsonpOutput_(callback, buildLookupResponse_(rows, studentId));
  } catch (error) {
    console.error("Grade lookup service failure: " + String(error && error.message));
    return createJsonpOutput_(callback, { ok: false, error: "SERVICE_UNAVAILABLE" });
  }
}

function getConfiguredSheet_(properties) {
  var spreadsheet = properties.SPREADSHEET_ID
    ? SpreadsheetApp.openById(properties.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Spreadsheet configuration was not found");
  }

  var sheet = properties.SHEET_NAME
    ? spreadsheet.getSheetByName(properties.SHEET_NAME)
    : spreadsheet.getSheets()[0];
  if (!sheet) {
    throw new Error("Configured sheet was not found");
  }
  return sheet;
}

function buildLookupResponse_(rows, studentId) {
  if (!isValidStudentId_(studentId) || !Array.isArray(rows) || rows.length === 0) {
    return { ok: true, found: false };
  }

  var columns = resolveColumns_(rows[0]);
  var results = [];
  var seen = Object.create(null);
  var identity = null;
  var hasConflict = false;

  for (var index = 1; index < rows.length; index += 1) {
    var row = rows[index] || [];
    if (trimValue_(row[columns.studentId]) !== studentId) {
      continue;
    }

    var status = trimValue_(row[columns.status]);
    if (status !== "ร" && status !== "0" && status !== "มผ.") {
      continue;
    }

    var subject = trimValue_(row[columns.subject]);
    if (!subject) {
      continue;
    }

    var name = trimValue_(row[columns.name]);
    var className = trimValue_(row[columns.className]);
    if (!identity) {
      identity = { name: name, className: className };
    } else if (identity.name !== name || identity.className !== className) {
      hasConflict = true;
    }

    var duplicateKey = subject + "\u0000" + status;
    if (!seen[duplicateKey]) {
      seen[duplicateKey] = true;
      results.push({ subject: subject, status: status });
    }
  }

  if (hasConflict) {
    console.warn("Conflicting identity data detected for one student ID");
  }

  if (!identity || results.length === 0) {
    return { ok: true, found: false };
  }

  return {
    ok: true,
    found: true,
    student: {
      name: identity.name,
      className: identity.className,
      results: results,
    },
  };
}

function resolveColumns_(headers) {
  var normalizedHeaders = (headers || []).map(trimValue_);
  var columns = {};

  Object.keys(HEADER_ALIASES_).forEach(function (field) {
    var aliases = HEADER_ALIASES_[field];
    var columnIndex = -1;
    for (var index = 0; index < aliases.length && columnIndex === -1; index += 1) {
      columnIndex = normalizedHeaders.indexOf(aliases[index]);
    }
    columns[field] = columnIndex;
  });

  var missing = Object.keys(columns).filter(function (field) {
    return columns[field] < 0;
  });
  if (missing.length > 0) {
    throw new Error("MISSING_REQUIRED_HEADERS");
  }

  return columns;
}

function isValidStudentId_(value) {
  return /^[0-9]{4,10}$/.test(trimValue_(value));
}

function isValidCallback_(value) {
  return /^__gradeLookup_[A-Za-z0-9_]+$/.test(trimValue_(value));
}

function trimValue_(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function createJsonpOutput_(callback, payload) {
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(payload) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// Called only through the Apps Script HTML service; the PIN never appears in a URL.
function adminControl(pin, action) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("ระบบกำลังทำงาน กรุณาลองใหม่");
  try {
    var store = PropertiesService.getScriptProperties();
    var secret = store.getProperty("ADMIN_PIN");
    if (!secret) throw new Error("ยังไม่ได้ตั้งค่ารหัสผู้ดูแลระบบ");
    var cache = CacheService.getScriptCache();
    var attempts = Number(cache.get("admin_failed_attempts") || 0);
    if (attempts >= 5) throw new Error("กรอกรหัสผิดหลายครั้ง กรุณาลองใหม่ใน 5 นาที");
    if (typeof pin !== "string" || pin !== secret) {
      cache.put("admin_failed_attempts", String(attempts + 1), 300);
      throw new Error("รหัสผู้ดูแลไม่ถูกต้อง");
    }
    if (["status", "open", "close"].indexOf(action) === -1) throw new Error("คำสั่งไม่ถูกต้อง");
    cache.remove("admin_failed_attempts");
    if (action !== "status") store.setProperty("LOOKUP_ENABLED", action === "open" ? "true" : "false");
    return { enabled: store.getProperty("LOOKUP_ENABLED") !== "false" };
  } finally { lock.releaseLock(); }
}
