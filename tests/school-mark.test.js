import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the published school mark is a web-sized high-resolution square PNG", () => {
  const png = readFileSync(new URL("../assets/school-mark.png", import.meta.url));

  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);

  assert.equal(width, height);
  assert.ok(width >= 512, `expected at least 512px, received ${width}px`);
  assert.ok(width <= 1024, `expected at most 1024px, received ${width}px`);
});
