# Netlify `/api/import` crash: `DOMMatrix is not defined`

## Symptoms

- Live production import fails with `POST /api/import 500 (Internal Server Error)`.
- Browser may show a secondary JSON parse-style error because the app expected JSON but Netlify returned plain text `Internal Server Error`.
- The same file may import successfully in local dev.
- EPUB/DOCX/TXT imports can fail even when the uploaded file is not a PDF.
- Netlify function logs show:

```text
ReferenceError: DOMMatrix is not defined
```

- The error happens while loading `.next/server/app/api/import/route.js` through `pdfjs-dist` from `pdf-parse`.

## Cause

`pdf-parse` is imported at the top level of `/api/import`.

Because that import loads `pdfjs-dist` during route/module startup, the whole import route can crash in Netlify's serverless runtime before the route checks whether the uploaded file is PDF, EPUB, DOCX, TXT, etc.

This means a PDF-parser runtime problem can take down the entire import endpoint, including non-PDF import paths.

## Low-regression fix path

1. Stop loading `pdf-parse` at route startup.
2. Load `pdf-parse` only inside the PDF branch.
3. Wrap the PDF parser load/use in a focused `try/catch` so PDF import can fail gracefully with JSON instead of taking down the route.
4. Ensure Netlify includes the native `@napi-rs/canvas` runtime files required by `pdfjs-dist`, if the PDF path still needs them.
5. Keep EPUB/DOCX/TXT import paths independent from PDF parser startup failures.

## Verification

Test production or a production-equivalent Netlify function build with:

- The exact EPUB that previously failed.
- A known-good PDF.
- A TXT import.
- A DOCX import.

Expected result:

- EPUB/DOCX/TXT should no longer fail because of `DOMMatrix`.
- PDF should either import successfully or return a clean JSON error.
- Browser should not receive plain text `Internal Server Error` for parser-specific failures.

## Notes

- This is not an Android-specific issue if the same EPUB fails on the live site from a laptop.
- Small EPUB file size rules out Netlify upload-size limits as the primary cause.
- The visible browser error is secondary; the Netlify function log is the source of truth.
- Preserve PDF import while preventing PDF dependencies from breaking non-PDF imports.
