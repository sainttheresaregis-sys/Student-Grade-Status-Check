# Student Grade Status Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-ready Thai GitHub Pages site that looks up one student's `ร` and `0` results through a private-sheet Google Apps Script API.

**Architecture:** A dependency-light static frontend calls a read-only Apps Script JSONP endpoint using an exact numeric student ID. Apps Script runs as the deploying school account, reads the private sheet, and returns only the matched student's filtered rows; pure data functions are isolated for Node tests.

**Tech Stack:** HTML5, CSS, ES modules, Node.js built-in test runner, Google Apps Script, GitHub Actions/Pages

**Spec:** `docs/superpowers/specs/2026-09-28-student-grade-status-design.md`

## Global Constraints

- The UI is entirely in Thai and supports desktop and mobile without horizontal scrolling.
- Search accepts only 4–10 ASCII digits and never persists the ID in storage, cookies, analytics, or the page URL.
- The public frontend must not download the sheet, contain student data, or contain credentials.
- The API returns only exact-ID rows whose trimmed status is exactly `ร` or `0`.
- Unknown IDs and students without `ร/0` return the same `{ "ok": true, "found": false }` shape.
- Sheet-derived text is rendered with DOM text APIs, never inserted as HTML.
- Fixtures and screenshots use invented student data only.
- The accepted visual concept is the source of truth for layout, typography, colors, spacing, and interaction states.

## Review Focus

- Thai and non-ASCII numerals must fail validation rather than silently becoming a different student ID; pin in Task 2 validation tests.
- Duplicate submissions and late responses must not overwrite a newer search; pin in Task 3 controller tests.
- Renamed/missing sheet headers must produce a generic safe failure rather than leaking details; pin in Task 4 backend tests.
- Duplicate sheet rows must be removed while distinct statuses/subjects remain; pin in Task 4 backend tests.
- JSONP callback names must be strictly validated to prevent script injection; pin in Task 4 backend tests.

---

### Task 1: Visual concept and static shell

**Files:**
- Create: `design/student-grade-status-concept.png`
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `assets/school-mark.png`

**Interfaces:**
- Consumes: approved design specification and the image-generation website concept workflow
- Produces: semantic DOM anchors `search-form`, `student-id`, `form-error`, `status-region`, and `result-region`; accepted visual reference for all later tasks

- [ ] **Step 1: Generate the complete primary-screen concept**

Create a desktop concept covering initial search and a visible result treatment, plus a matching mobile concept/detail if the desktop image does not make responsive behavior unambiguous. Use invented content only.

- [ ] **Step 2: Review and accept the concept**

Verify exact Thai copy, no invented dashboard sections, a single focused search surface, clear `ร`/`0` treatments, and practical HTML/CSS implementation.

- [ ] **Step 3: Implement the semantic shell and design tokens**

Create the listed anchors, accessible labels/live regions, exact visible copy, responsive CSS, focus states, reduced-motion behavior, and concept-matched image asset treatment. Do not add functional data calls yet.

- [ ] **Step 4: Verify the static shell**

Run: `python -m http.server 4173`

Expected: the page loads at `http://127.0.0.1:4173`, matches the accepted concept at desktop and mobile sizes, has no horizontal overflow, and all image assets load.

- [ ] **Step 5: Commit**

```bash
git add design index.html assets
git commit -m "feat: add student lookup interface"
```

### Task 2: Input validation and API client

**Files:**
- Create: `assets/validation.js`
- Create: `assets/api.js`
- Create: `config.js`
- Create: `tests/validation.test.js`
- Create: `tests/api.test.js`
- Create: `package.json`

**Interfaces:**
- Consumes: Apps Script URL from `window.APP_CONFIG.appsScriptUrl`
- Produces: `normalizeStudentId(value: unknown): string`, `validateStudentId(value: unknown): { valid: boolean, value: string, message: string }`, and `lookupStudent(studentId: string, options?: { timeoutMs?: number }): Promise<LookupResponse>`

- [ ] **Step 1: Write failing validation tests**

Test trimming ASCII input, rejecting empty/short/long/mixed input, and rejecting Thai numerals with the exact Thai validation message.

- [ ] **Step 2: Run validation tests and confirm failure**

Run: `node --test tests/validation.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement validation**

Implement the specified exports with `/^[0-9]{4,10}$/` as the authoritative client rule.

- [ ] **Step 4: Write failing API-client tests**

Test unique callback creation, successful cleanup, timeout cleanup, service-error rejection, and a configuration error when the deployment URL is absent or still the documented placeholder.

- [ ] **Step 5: Implement `lookupStudent` with JSONP**

Create a unique callback under `window`, append a temporary script using `studentId` and `callback` query parameters, enforce a 10-second default timeout, and remove both callback and script in every terminal path.

- [ ] **Step 6: Run tests**

Run: `node --test tests/validation.test.js tests/api.test.js`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json config.js assets/validation.js assets/api.js tests
git commit -m "feat: add validated grade lookup client"
```

### Task 3: Search controller and UI states

**Files:**
- Create: `assets/app.js`
- Create: `assets/render.js`
- Create: `tests/render.test.js`
- Create: `tests/controller.test.js`
- Modify: `index.html`
- Modify: `assets/styles.css`

**Interfaces:**
- Consumes: `validateStudentId`, `lookupStudent`, and Task 1 DOM anchors
- Produces: `renderResult(container: HTMLElement, response: LookupResponse): void`, `renderEmpty(container: HTMLElement): void`, `renderServiceError(container: HTMLElement, retry: () => void): void`, and `createSearchController(dependencies): SearchController`

- [ ] **Step 1: Write failing render tests**

Test safe text rendering of invented names/subjects, explicit visible status text, grouped/readable multiple rows, the exact neutral empty message, and generic retry state.

- [ ] **Step 2: Implement result renderers**

Use `createElement` and `textContent` only for sheet values. Add appropriate headings, list semantics, and accessible status labels.

- [ ] **Step 3: Write failing controller tests**

Test invalid input, loading/disabled state, Enter submission, duplicate submission suppression, clearing old results, retry, focus placement, and a late first response being ignored after a second search.

- [ ] **Step 4: Implement and wire the controller**

Use a monotonically increasing request token so only the newest request can update UI. Keep the entered ID in memory only and clear previous result content at each accepted submission.

- [ ] **Step 5: Run frontend tests**

Run: `node --test tests/validation.test.js tests/api.test.js tests/render.test.js tests/controller.test.js`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html assets tests
git commit -m "feat: implement student search states"
```

### Task 4: Google Apps Script lookup service

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/appsscript.json`
- Create: `tests/apps-script.test.js`

**Interfaces:**
- Consumes: script properties `SPREADSHEET_ID` and `SHEET_NAME`, request parameters `studentId` and `callback`
- Produces: `doGet(e): GoogleAppsScript.Content.TextOutput`, `buildLookupResponse_(rows: unknown[][], studentId: string): LookupResponse`, `resolveColumns_(headers: unknown[]): ColumnMap`, and `isValidCallback_(value: string): boolean`

- [ ] **Step 1: Write failing backend tests**

Load pure Apps Script functions in a Node VM and test exact ID matching, accepted current/corrected ID headers, whitespace trimming, `ร/0` filtering, stable order, duplicate removal, empty responses, conflicting identity handling, missing-header safe failure, invalid ID rejection, and strict callback validation.

- [ ] **Step 2: Run backend tests and confirm failure**

Run: `node --test tests/apps-script.test.js`

Expected: FAIL because `apps-script/Code.gs` does not exist.

- [ ] **Step 3: Implement pure row processing**

Keep sheet access in `doGet`; keep header resolution and lookup shaping in pure functions testable in Node. Log conflicts/errors only with `console.warn`/`console.error`, without returning diagnostics.

- [ ] **Step 4: Implement the JSONP web entry point**

Validate `/^[0-9]{4,10}$/` and callback `/^__gradeLookup_[A-Za-z0-9_]+$/`; return JavaScript MIME containing only `callback(<serialized safe response>);`. Read the bounded used range from the configured sheet.

- [ ] **Step 5: Run all tests**

Run: `node --test`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps-script tests/apps-script.test.js
git commit -m "feat: add private sheet lookup service"
```

### Task 5: Deployment, documentation, and full verification

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `README.md`
- Create: `docs/deployment.md`
- Modify: `config.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: the complete frontend and Apps Script service
- Produces: repeatable Pages deployment, school-account setup guide, and verified release candidate

- [ ] **Step 1: Add deployment workflow and documentation**

Configure GitHub Pages to publish the repository's static root. Document Apps Script project creation, script-property values, deploy-as-owner/anonymous access, deployment URL configuration, successful and empty lookup checks, and restricting the Sheet only after verification.

- [ ] **Step 2: Add repository checks**

Add `npm test` and a static secret/student-data scan command. Document that the placeholder Apps Script URL must be replaced by the school before live lookup works.

- [ ] **Step 3: Run automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 4: Verify in Browser/IAB**

Serve locally, exercise invalid, found, empty, error, retry, repeated-search, and keyboard flows using an in-browser mock transport with invented data. Inspect desktop and mobile viewports and capture the latest implementation screenshots.

- [ ] **Step 5: Perform fidelity and accessibility review**

Use `view_image` on the accepted concept and latest desktop/mobile screenshots. Record at least five comparisons covering copy, layout, typography, palette/status colors, spacing/container model, and responsive behavior; fix every material mismatch. Confirm labels, focus visibility, live announcements, keyboard operation, reduced motion, and no overflow.

- [ ] **Step 6: Commit**

```bash
git add .github README.md docs config.js package.json
git commit -m "docs: add deployment and verification guide"
```

- [ ] **Step 7: Final repository review**

Run: `git status --short` and `git log --oneline --decorate -6`

Expected: clean working tree with focused implementation commits after the design and plan commits.
