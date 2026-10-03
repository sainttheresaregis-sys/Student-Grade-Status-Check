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
  const counts = ["ร", "0", "มผ."].map(status => ({status, count: student.results.filter(row => row.status === status).length})).filter(item => item.count);
  const overview = el("div", "result-overview", undefined, counts.map(({status, count}) =>
    el("h2", `result-count result-count--${status === "ร" ? "pending" : status === "0" ? "zero" : "activity"}`, `พบผลการเรียน ${status} จำนวน ${count} รายวิชา`)));
  const rows = student.results.map(({ subject, status }) => {
    const badge = el("span", "result-status", `สถานะ ${status}`);
    badge.setAttribute("aria-label", `ผลการเรียน ${status}`);
    const parts = subject.match(/^([ก-๙A-Za-z]+[0-9]{4,6})\s*[:：]?\s+(.+)$/u);
    const code = parts ? parts[1] : "—";
    const name = parts ? parts[2] : subject;
    const detail = (label, value, className) => el("div", className, undefined, [el("span", "detail-label", label), el("span", "detail-value", value)]);
    return el("li", `result-row result-row--${status === "ร" ? "pending" : status === "0" ? "zero" : "activity"}`, undefined, [
      detail("รหัสวิชา", code, "subject-code"),
      detail("ชื่อวิชา", name, "result-subject"),
      el("div", "subject-grade", undefined, [el("span", "detail-label", "ผลการเรียน"), badge]),
      detail("แนวทางดำเนินการ", status !== "0" ? "ติดต่อคุณครูประจำรายวิชา" : "รับเอกสารจากฝ่ายวิชาการก่อนดำเนินการแก้ผลการเรียน", "subject-action"),
    ]);
  });
  display(container, el("article", "result-card", undefined, [overview, summary,
    el("h3", "result-heading", "รายวิชาที่ต้องดำเนินการ"),
    el("ul", "result-list", undefined, rows),
  ]));
}
export function renderEmpty(container) {
  const el = createView(container);
  const emoji = el("div", "pass-symbol", "✓");
  emoji.setAttribute("aria-hidden", "true");
  display(container, el("article", "empty-state empty-state--pass", undefined, [
    emoji,
    el("h2", "empty-state__title", "ไม่พบรายวิชาที่ต้องดำเนินการ"),
    el("p", "empty-state__hint", "ไม่พบรายวิชาที่มีผลการเรียน ร หรือ 0 หรือ มผ. สำหรับรหัสนักเรียนนี้"),
    el("p", "guide-reminder", "กรุณาตรวจสอบรหัสนักเรียนให้ถูกต้องก่อนทุกครั้ง"),
  ]));
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
export function renderClosed(container) {
  const el = createView(container);
  display(container, el("article", "empty-state", undefined, [
    el("h2", "empty-state__title", "ระบบยังไม่เปิดให้ตรวจสอบผลการเรียน"),
    el("p", "empty-state__hint", "กรุณากลับมาตรวจสอบภายหลัง หรือติดต่อฝ่ายทะเบียน"),
  ]));
}
