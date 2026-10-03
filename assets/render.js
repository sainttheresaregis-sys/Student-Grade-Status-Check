function createView(container) {
  const documentRef = container.ownerDocument ?? globalThis.document;
  return (tag, className, text, children = []) => {
    const node = documentRef.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    node.append(...children);
    return node;
  };
}
function display(container, content) {
  content.setAttribute("tabindex", "-1");
  container.replaceChildren(content);
  content.focus();
}
export function clearResults(container) { container.replaceChildren(); }
export function renderResult(container, { student }) {
  const el = createView(container);
  const avatar = el("span", "student-avatar", "นร.");
  avatar.setAttribute("aria-hidden", "true");
  const summary = el("header", "student-summary", undefined, [avatar,
    el("div", "student-identity", undefined, [
      el("h2", "student-name", student.name),
      el("p", "student-class", `ชั้น ${student.className}`),
    ]),
  ]);
  const rows = student.results.map(({ subject, status }) => {
    const badge = el("span", "result-status", `สถานะ ${status}`);
    badge.setAttribute("aria-label", `ผลการเรียน ${status}`);
    return el("li", `result-row result-row--${status === "ร" ? "pending" : "zero"}`, undefined, [
      el("span", "result-subject", subject), badge,
    ]);
  });
  display(container, el("article", "result-card", undefined, [summary,
    el("h3", "result-heading", "รายวิชาที่ต้องดำเนินการ"),
    el("ul", "result-list", undefined, rows),
  ]));
}
export function renderEmpty(container) {
  display(container, createView(container)("article", "empty-state", "ไม่พบข้อมูลผลการเรียน ร หรือ 0 สำหรับรหัสนี้"));
}
export function renderServiceError(container, retry) {
  const el = createView(container);
  const button = el("button", "retry-button", "ลองอีกครั้ง");
  button.setAttribute("type", "button");
  button.addEventListener("click", retry);
  display(container, el("article", "service-error", undefined, [
    el("h2", "service-error__title", "ไม่สามารถตรวจสอบข้อมูลได้ในขณะนี้"),
    el("p", "service-error__body", "กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง"), button,
  ]));
}
