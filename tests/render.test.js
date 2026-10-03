import assert from "node:assert/strict";
import test from "node:test";

import { renderEmpty, renderResult, renderServiceError } from "../assets/render.js";
import { createContainer } from "./helpers/fake-dom.js";

test("renderResult safely renders student identity and every result as text", () => {
  const container = createContainer();
  renderResult(container, {
    ok: true,
    found: true,
    student: {
      name: "กฤติน <img src=x onerror=alert(1)>",
      className: "ม.3",
      results: [
        { subject: "คณิตศาสตร์เพิ่มเติม", status: "ร" },
        { subject: "วิทยาศาสตร์และเทคโนโลยี", status: "0" },
      ],
    },
  });

  assert.match(container.textContent, /กฤติน <img src=x onerror=alert\(1\)>/);
  assert.match(container.textContent, /ชั้น ม\.3/);
  assert.match(container.textContent, /คณิตศาสตร์เพิ่มเติม/);
  assert.match(container.textContent, /วิทยาศาสตร์และเทคโนโลยี/);
  assert.match(container.textContent, /สถานะ ร/);
  assert.match(container.textContent, /สถานะ 0/);

  const resultList = container.children[0].children.find((child) => child.tagName === "UL");
  assert.equal(resultList.children.length, 2);
  assert.equal(resultList.children[0].className, "result-row result-row--pending");
  assert.equal(resultList.children[1].className, "result-row result-row--zero");
});

test("renderEmpty uses the privacy-preserving neutral message", () => {
  const container = createContainer();
  renderEmpty(container);
  assert.match(container.textContent, /ไม่พบรายวิชาที่มีผลการเรียน ร หรือ 0 สำหรับรหัสนักเรียนนี้/);
});

test("renderServiceError shows a generic message and working retry action", () => {
  const container = createContainer();
  let retries = 0;
  renderServiceError(container, () => {
    retries += 1;
  });

  assert.match(container.textContent, /ไม่สามารถตรวจสอบข้อมูลได้ในขณะนี้/);
  assert.match(container.textContent, /ลองอีกครั้ง/);
  const button = container.children[0].children.find((child) => child.tagName === "BUTTON");
  button.listeners.get("click")();
  assert.equal(retries, 1);
});

test('result presentation summarizes both statuses and splits subject code without changing source', () => {
 const container=createContainer();
 const response={student:{name:'ทดสอบ',className:'ม.2',results:[{subject:'อ22203 สนุกกับภาษาอังกฤษ',status:'ร'},{subject:'ค22101 คณิตศาสตร์',status:'0'}]}};
 renderResult(container,response);
 assert.match(container.textContent,/พบผลการเรียน ร จำนวน 1 รายวิชา/);
 assert.match(container.textContent,/พบผลการเรียน 0 จำนวน 1 รายวิชา/);
 assert.match(container.textContent,/ติดต่อคุณครูประจำรายวิชา/);
 assert.match(container.textContent,/รับเอกสารจากฝ่ายวิชาการ/);
 assert.equal(response.student.results[0].subject,'อ22203 สนุกกับภาษาอังกฤษ');
});
