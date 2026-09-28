# Student Grade Status Check — Design Specification

## Purpose

Build a Thai-language website for Saint Theresa School that lets a student enter an exact student ID and see only that student's subjects with a grade status of `ร` or `0`.

The public website will be hosted with GitHub Pages. Google Sheets remains the source of truth, while a Google Apps Script web app provides a narrow lookup API so the browser never downloads the complete spreadsheet.

## Success Criteria

- A student can search from a phone or desktop using only a numeric student ID.
- A successful search shows the student's name, class, and every matching subject grouped or clearly labelled by status `ร` and `0`.
- An unknown ID and an ID with no current `ร/0` rows receive the same privacy-preserving empty response.
- Editing the Google Sheet changes subsequent lookup results without rebuilding the website.
- The public frontend contains no full student dataset and no spreadsheet edit credentials.
- The interface is accessible, responsive, and entirely in Thai.

## Scope

### Included

- One public search page with loading, validation, success, empty, and service-error states.
- A static frontend deployable to GitHub Pages.
- A Google Apps Script lookup endpoint tied to the supplied spreadsheet.
- Setup documentation for deploying Apps Script and GitHub Pages.
- Automated checks for input normalization and result shaping, plus browser-level verification of the primary flow.

### Not Included

- Teacher/admin editing screens.
- Student login, PIN, date-of-birth verification, or identity-provider authentication.
- Showing normal passing grades or a complete transcript.
- Analytics, downloadable class lists, or browsing students.

## Data Source

The supplied sheet currently exposes these columns:

1. student ID (`รหัสประจำนนักเรียน` in the current header; the integration will also accept the corrected `รหัสประจำตัวนักเรียน`)
2. full name (`ชื่อ - นามสกุล`)
3. class (`ชั้น`)
4. subject (`รายวิชา`)
5. grade status (`ผลการเรียน`)

The backend will trim displayed values, normalize the searched ID as text, and include only rows whose status is exactly `ร` or `0` after trimming. Multiple rows for the same student are returned in sheet order, with exact duplicate subject/status pairs removed.

## Architecture

### Frontend

A small static application will live in the GitHub repository and be published with GitHub Pages. It will contain no student records. A checked-in configuration module will contain only the deployed Apps Script web-app URL, which is public by design and carries no edit credential.

The frontend sends one exact student ID per lookup, renders the structured response, and keeps the ID only in the current page state. It will not use local storage, cookies, analytics, or third-party trackers.

### Google Apps Script API

The Apps Script web app executes as the sheet owner and reads the private spreadsheet. It accepts a lookup request for one normalized student ID, reads the header row to locate required columns, filters exact matches, and returns JSON containing only:

```json
{
  "ok": true,
  "found": true,
  "student": {
    "name": "…",
    "className": "…",
    "results": [
      { "subject": "…", "status": "ร" }
    ]
  }
}
```

For an unknown ID or a student without `ร/0`, it returns `{ "ok": true, "found": false }`. Internal details, row numbers, other students, and spreadsheet metadata are never returned.

The endpoint will validate that the ID contains 4–10 ASCII digits before reading data. The frontend applies the same rule for immediate feedback, but server-side validation remains authoritative.

## User Experience

### Initial State

- School identity/header.
- Clear title: `ตรวจสอบผลการเรียน ร และ 0`.
- One labelled student-ID input and one primary `ตรวจสอบผลการเรียน` button.
- A short privacy note explaining that results are shown only for the entered ID.
- A brief instruction to contact the registration office or subject teacher if information appears incorrect.

### Search States

- **Invalid:** Inline Thai message; focus stays on the input.
- **Loading:** The submit control becomes busy and duplicate submissions are ignored.
- **Found:** Show the student's name and class, followed by a readable subject list. Status `ร` uses amber and `0` uses red; color is reinforced by visible text.
- **Not found:** Use a neutral message: `ไม่พบข้อมูลผลการเรียน ร หรือ 0 สำหรับรหัสนี้` without confirming whether the student ID exists.
- **Service error:** Explain that the service is temporarily unavailable and offer a retry action.

A new search clears the previous student's result immediately. The page does not put the ID into the browser URL.

## Visual Direction

The page should feel trustworthy, calm, and appropriate for a school rather than like a generic admin dashboard. Use a clean institutional palette, generous whitespace, high-contrast Thai typography, a single focused search surface, and restrained school-themed visual detail. Avoid decorative dashboards, statistics, unrelated navigation, and excessive card grids.

The desktop composition centers the lookup experience within a balanced first viewport. On mobile, controls become full-width, result rows remain comfortably tappable/readable, and no horizontal scrolling is allowed. Motion is limited to useful loading and result transitions and respects `prefers-reduced-motion`.

## Privacy and Security

- Change the Google Sheet from public/link-readable to restricted after the Apps Script deployment has been verified.
- Never fetch the sheet CSV or Google Visualization feed from the public frontend.
- Never commit student data, example real names, spreadsheet exports, credentials, or deployment tokens.
- Return only the exact lookup result and use the same response for unknown IDs and students with no `ร/0` rows.
- Escape all rendered text by using DOM text APIs; do not inject sheet values as HTML.
- Add `Cache-Control: no-store` where the platform permits and avoid browser persistence.
- Document that student-ID-only access reduces bulk exposure but is not strong authentication; anyone who knows a valid ID may view that student's result.

Client-side cooldown and disabled duplicate submission improve normal use but are not presented as security controls. Strong anti-enumeration would require an additional secret or authenticated backend and is outside this approved scope.

## Error Handling

- Missing or renamed required headers: return a generic service-error response and log diagnostic details only in Apps Script execution logs.
- Sheet temporarily unavailable: return a generic service error.
- Malformed request: return `ok: false` with a safe error code, not implementation details.
- Network timeout or invalid JSON: frontend presents the retry state.
- Conflicting names/classes for the same ID: use the first matching row for identity fields, return its results, and log a data-quality warning.

## Testing and Verification

- Unit tests for ID normalization, validation, row filtering, status restriction, duplicate removal, and safe empty responses.
- Contract fixtures use invented student data only.
- Browser verification covers a valid result, `ร` and `0` labels, invalid input, no result, network failure, repeated search, keyboard submission, focus behavior, desktop layout, and mobile layout.
- Accessibility checks cover labels, focus visibility, live announcements, color contrast, reduced motion, and keyboard-only operation.
- Visual implementation will be compared directly with the approved generated concept before completion.

## Deployment

1. Add the Apps Script source from the repository to a script project owned by the school account.
2. Set the spreadsheet ID and exact sheet name in Apps Script properties/configuration.
3. Deploy as a web app executing as the owner and accessible to anonymous website visitors.
4. Put the resulting web-app URL into the frontend configuration.
5. Verify successful and empty lookups, then restrict the source Google Sheet.
6. Enable GitHub Pages through the repository's deployment workflow.

Deployment steps that require the school Google or GitHub account remain explicit manual actions; the repository will provide precise instructions and verification checks.
