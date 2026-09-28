function element(documentRef, tagName, className, text) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clearResults(container) {
  container.replaceChildren();
}

export function renderResult(container, response) {
  const documentRef = container.ownerDocument ?? globalThis.document;
  const { student } = response;
  const card = element(documentRef, "article", "result-card");

  const summary = element(documentRef, "header", "student-summary");
  const avatar = element(documentRef, "span", "student-avatar", "นร.");
  avatar.setAttribute("aria-hidden", "true");
  const identity = element(documentRef, "div", "student-identity");
  identity.append(
    element(documentRef, "h2", "student-name", student.name),
    element(documentRef, "p", "student-class", `ชั้น ${student.className}`),
  );
  summary.append(avatar, identity);

  const heading = element(documentRef, "h3", "result-heading", "รายวิชาที่ต้องดำเนินการ");
  const list = element(documentRef, "ul", "result-list");

  for (const result of student.results) {
    const modifier = result.status === "ร" ? "pending" : "zero";
    const row = element(documentRef, "li", `result-row result-row--${modifier}`);
    const subject = element(documentRef, "span", "result-subject", result.subject);
    const status = element(documentRef, "span", "result-status", `สถานะ ${result.status}`);
    status.setAttribute("aria-label", `ผลการเรียน ${result.status}`);
    row.append(subject, status);
    list.append(row);
  }

  card.append(summary, heading, list);
  container.replaceChildren(card);
  card.setAttribute("tabindex", "-1");
  card.focus();
}

export function renderEmpty(container) {
  const documentRef = container.ownerDocument ?? globalThis.document;
  const message = element(
    documentRef,
    "article",
    "empty-state",
    "ไม่พบข้อมูลผลการเรียน ร หรือ 0 สำหรับรหัสนี้",
  );
  message.setAttribute("tabindex", "-1");
  container.replaceChildren(message);
  message.focus();
}

export function renderServiceError(container, retry) {
  const documentRef = container.ownerDocument ?? globalThis.document;
  const panel = element(documentRef, "article", "service-error");
  panel.setAttribute("tabindex", "-1");
  panel.append(
    element(documentRef, "h2", "service-error__title", "ไม่สามารถตรวจสอบข้อมูลได้ในขณะนี้"),
    element(documentRef, "p", "service-error__body", "กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง"),
  );

  const retryButton = element(documentRef, "button", "retry-button", "ลองอีกครั้ง");
  retryButton.setAttribute("type", "button");
  retryButton.addEventListener("click", retry);
  panel.append(retryButton);

  container.replaceChildren(panel);
  panel.focus();
}
