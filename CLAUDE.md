@AGENTS.md

# Cash Counter (cashcounter)

App #18 in Brian's iOS app portfolio (seller bkdigitalleads-cmyk). Expo SDK 57, React Native 0.86, TypeScript, expo-sqlite (tills, saved counts, the count in progress and settings), pdf-lib with @pdf-lib/fontkit (the count sheet), react-native-svg (glyphs, the note and coin tiles, and the on-screen count sheet drawn from the same layout as the PDF), RevenueCat, expo-notifications (local only, one trial reminder). Engine forked from Estimate Maker (estimatemaker main at 4bdf558, Nov 19, 2026), which came from Signature Maker, Migraine Log, Image to Text, Pumping and Odo 1.0.6. The estimate, invoice, client and item modules, the signature pen engine, Skia, the logo, the photo picker and Mail were dropped. There are no local native modules.

- App Store name: "Count Money: Cash Calculator" (accepted in App Store Connect, Nov 22, 2026). Subtitle "Coin Counter & Money Counter". Spanish (Mexico): "Contador de Dinero: Efectivo", "Calculadora de caja y monedas". Home screen name and in-app name: "Cash Counter". Category Business, secondary Finance. Bundle ID com.bwk.cashcounter. Expo slug and scheme: cashcounter. Owner bkdeveloper123. GitHub: bkdigitalleads-cmyk/cashcounter.
- Set up (Nov 22, 2026, values from Cowork): app.json `extra.revenueCatApiKeyIos` is the public RevenueCat SDK key (starts with `appl_`, so purchases are on; the app runs with purchases off whenever it does not), eas.json `ascAppId` 6838074076. Still a marked placeholder: app.json `extra.eas.projectId` (`TODO_COWORK_EAS_PROJECT_ID`); Cowork fills it before the first build.
- Not in the store yet. 1.0.0 build 1 is on branch claude/cash-1.0.0 (PR, not merged). Nothing has been built with EAS.
- What it is: a cash counter for closing time. One row per note and coin, large plus and minus for one thumb, a tap-to-type keypad, rolls and straps on a long press, the total pinned at the bottom, an expected amount with over or short in plain words, saved counts by day and by till, a deposit helper, a one-page count sheet and a CSV of History. No account, no server, nothing leaves the phone unless the person shares a sheet or a CSV.
- Guardrail, always: the app is a calculator and a record. It does not use the camera and does not scan or recognize cash, and no text (app, listing, website) may suggest it does. It is not accounting or tax software and gives no financial advice. Notes and coins are drawn as labeled tiles in the app's own style; never reproduce real banknote or coin artwork. No brand, store or bank names anywhere.

## How shipping works (read before every push)

- A push to `main` that touches app.json, eas.json, package*.json, App.tsx, index.ts, src/, assets/ or modules/ starts an EAS workflow (.eas/workflows/deploy.yml) once the Expo project is connected. It builds iOS in the cloud and uploads the build to App Store Connect / TestFlight. Every such push costs a paid build credit. (modules/ stays in the filter from the engine; this app has none.)
- Never merge to `main` without Brian. Work on a branch and open a PR.
- Pushes that only change Markdown files (CLAUDE.md, NOTES.md, README.md, store/metadata.md), store/ or docs/ do not build.
- Version numbers are local (`appVersionSource: local`, no auto-increment). Before any push that builds: raise `ios.buildNumber` in app.json by 1, and raise `version` when it will become a new App Store release. A build number that was already used makes the upload fail.
- Before every commit: run `npx tsc --noEmit` and `npm test`, and fix every error.
- Batch the changes for one app into one push. Ask Brian before any push that builds, and say what is in it.
- Submitting for App Review, release dates, prices, the subtitle, keywords, the age rating and screenshots all happen in App Store Connect. Brian and his Cowork session handle that side. Do not try to do it from here.

## Rules

- Brian handles every credential and sign-in. Never type, paste, print or store passwords, tokens or API keys (the RevenueCat key in app.json is the public SDK key and belongs there). If git push asks for credentials, stop and tell Brian.
- No spending (paid services, EAS builds beyond what Brian approved) without Brian saying go.
- Never change the RevenueCat entitlement id `pro`, the offering `default`, the product ids (cash_pro_weekly, cash_pro_yearly, cash_pro_lifetime), the packages ($rc_weekly, $rc_annual, $rc_lifetime) or the logic in src/purchases.ts (a copy of the engine's, with the foreground Pro re-check) without Brian asking. Paying users must never lose Pro. Prices and trial text on screen always come from StoreKit through RevenueCat.
- Free forever (src/gates.ts holds the rules, with checks): unlimited counting, one till, the last three saved counts in History, the first count sheet and the first CSV export, one currency (from the region, changeable until the first save). Pro: every saved count, more tills, every count sheet and CSV, the deposit helper, custom rows and every currency. The in-app paywall opens on the fourth save, the second count sheet, a second till, the deposit helper, a custom row, another currency, and from Settings. A count is always saved; older ones are kept out of sight on the free plan, never deleted. Never lock anyone out of what they made.
- Money is integers in minor units (cents, pence, centavos); pieces are whole numbers. The counting math is in src/count.ts and src/money.ts, the deposit suggestion in src/deposit.ts, all unit-tested. Do not add money anywhere else, and never through a float (typed amounts are read as text).
- The database only ever gains migrations (src/db/schema.ts `MIGRATIONS`). Never edit or reorder a shipped migration; add a new one. Old rows must still read.
- Roll, bag and strap counts per currency are in src/currencies.ts with their sources in the comment. Change them only with a reason written there.
- Do not change the app name, subtitle, keywords or the rating-prompt trigger (a count saved on a later day than install; at most one per launch, once ever, never mid-count) without asking.
- Keep changes small. Fix what the task needs and tidy only the files you already touch. List anything else you notice in NOTES.md under "Noticed, not changed" instead of fixing it. No broad refactors, dependency upgrades or Expo SDK upgrades unless Brian asks.
- Copy voice: plain, short, written like the person closing the till would say it. No "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's", exclamation marks or em dashes in any user-facing text (app, notifications, PDFs, store text, website), in commits or pull requests, and none in text Brian sends to other people. Examples: "Total", "Short by $4.50", "Over by $2.00", "Save count", "Count sheet ready." Support email bkdigitalleads@gmail.com only.
- Design (docs/design/NOTES.md) uses the theme's tokens, never ad hoc values. The accent (deposit-slip blue) is on the main button only; the flag (signal amber) is on over or short only. Everything a thumb uses on the count is at least 56 points. Glyphs are drawn in src/ui/Glyph.tsx. No icon pack.
- Fonts: only SIL OFL fonts, each with its licence in assets/fonts. Barlow Tab is Barlow with its tabular figures made the default by store/tabular-fonts.py.
- plugins/withoutPushEntitlement.js stays last in app.json plugins. After touching plugins, check `npx expo config --type introspect` still shows `ios.entitlements` as `{}` and no camera, microphone, location or photo-library usage strings. The app needs no permission but notifications (asked only for the trial reminder).
- Nothing leaves the device except a count sheet or CSV the person sends. Never add analytics, a server, sync or a network call.

## Logging (so Brian's Cowork session can follow along)

- With every commit, add an entry at the top of NOTES.md in the same commit: date, version/build, what changed and why, and how it was checked.

## Testing

- Type check: `npx tsc --noEmit`. Unit checks: `npm test`. Bundle check: `npx expo export --platform ios`. Config: `npx expo config --type introspect`.
- Pure logic has no React or native imports (it imports with a `.ts` extension so Node runs it directly), so `npm test` checks exactly what the app runs.
- Count sheet samples: `node store/sheet-samples.mjs` (needs pdftoppm). Icon concepts: `cd store && npm install && node icon.js options`; `node icon.js` writes the shipped icons from `CHOSEN` (null until Brian picks).
- Simulator (needs Xcode): Expo Go does not work (RevenueCat needs a development build). Purchases do not complete in the simulator.
- Real-device check: TestFlight build from the EAS workflow, on Brian's iPhone. NOTES.md has the TestFlight checklist.
