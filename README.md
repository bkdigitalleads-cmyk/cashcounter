# Cash Counter

A cash counter for closing time, on the iPhone: count a till with one thumb, see at once if it is over or short, save each count, and print a one-page count sheet. No account, no server: everything lives in SQLite on the phone, and count sheets are made on the phone with pdf-lib.

- App: Expo SDK 57, React Native, TypeScript. `npm install`, then `npx tsc --noEmit` and `npm test`.
- Website: `docs/` (GitHub Pages): landing page, privacy policy, support with questions and answers.
- Store listing: `store/metadata.md`. Icon concepts: `cd store && npm install && node icon.js options`. Count sheet samples: `node store/sheet-samples.mjs` from the repo root.
- Design: `docs/design/NOTES.md`, with the renders, the count sheet samples and the icon options.
- Rules for working in this repo: `CLAUDE.md`. Change log and TestFlight checklist: `NOTES.md`.
