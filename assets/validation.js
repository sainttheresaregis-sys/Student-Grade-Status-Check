const STUDENT_ID_PATTERN = /^[0-9]{4,10}$/;

export const STUDENT_ID_VALIDATION_MESSAGE =
  "กรุณากรอกรหัสประจำตัวนักเรียนเป็นตัวเลข 4–10 หลัก";

export function normalizeStudentId(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function validateStudentId(value) {
  const normalizedValue = normalizeStudentId(value);
  const valid = STUDENT_ID_PATTERN.test(normalizedValue);

  return {
    valid,
    value: normalizedValue,
    message: valid ? "" : STUDENT_ID_VALIDATION_MESSAGE,
  };
}
