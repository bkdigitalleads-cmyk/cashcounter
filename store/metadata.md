# Cash Counter, App Store metadata (1.0.0)

Everything here is pasted into App Store Connect by Brian and Cowork. No em dashes anywhere, no brand, store or bank names, no "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's" or exclamation marks.

App record: bundle id com.bwk.cashcounter, SKU cashcounter, ASC app id 6838074076 (eas.json `ascAppId`). RevenueCat public iOS key in app.json `extra.revenueCatApiKeyIos`. Expo project bkdeveloper123/cashcounter (projectId 491bd6d2-de07-4673-9eb5-cf479f53edfc, app.json `extra.eas.projectId`).

## Name (28/30)
Count Money: Cash Calculator

Accepted in App Store Connect as written (Nov 22, 2026). Home screen name and in-app name (app.json `name`): Cash Counter.

## Subtitle (28/30)
Coin Counter & Money Counter

## Keywords, English (U.S.) (99/100)
counting,tracker,management,till,register,drawer,deposit,bank,float,tips,bills,change,cashier,tally

Rule: no word from the name or the subtitle (count, money, cash, calculator, coin, counter), no repeats, no brand names. Apple combines words across the name, subtitle and keywords, so the six terms from the Nov 22 research are all covered: count money (name), cash calculator (name), coin counter (subtitle), money counter (subtitle), money calculator (name) and cash counter (name and subtitle). With the keywords: cash register, till counter, cash drawer, bank deposit, cash float, tip tracker, money tracker, cash tally, bill counter.

## Spanish (Mexico) listing
Name (28/30): Contador de Dinero: Efectivo
Subtitle (29/30): Calculadora de caja y monedas
Keywords (100/100): contar,billetes,arqueo,cierre,conteo,registradora,deposito,banco,cambio,propinas,total,diario,tienda

Promotional text (es-MX, 139/170): Cuenta la caja en menos de un minuto, ve al instante si sobra o falta, y guarda una hoja de conteo para imprimir. Sin cuenta, sin internet.

Description (es-MX): a Spanish translation of the English description, entered in App Store Connect on Nov 22, 2026. The app's own text is in English; only the store listing is in Spanish.

## Extra listings indexed for US search
Apple also reads these eight languages for searches in the US store; each holds its own English name, subtitle and keyword field, and the English description; phrases only form inside one listing. As entered in App Store Connect.

| Listing | Name | Subtitle | Keywords |
|---|---|---|---|
| Arabic | Cash Counter: Money Count App | Till Counter & Coin Calculator | drawer,register,bill,change,counting,denominations,deposit,bank,daily,sheet,tally,tracker,cashier |
| French | Money Counter: Till & Drawer | Cash Register Count Calculator | coin,bill,change,counting,float,balance,closing,shift,retail,shop,store,cafe,bar,restaurant,market |
| Korean | Coin Counter: Cash Count Sheet | Count Money, Bills and Change | calculator,till,drawer,register,roll,note,banknote,dollar,euro,pound,peso,currency,denomination,wrap |
| Portuguese (Brazil) | Till Counter: Cash Up & Float | Count Money, Coins & Banknotes | calculator,drawer,register,bill,change,deposit,bank,safe,petty,end,day,closing,report,pdf,print,sign |
| Russian | Drawer Counter: Cash Register | Money Calculator, Count Bills | coin,till,change,counting,tally,log,history,over,short,expected,difference,deposit,float,cashier |
| Vietnamese | Money Calculator: Bill Counter | Cash Count for Church & Clubs | coin,till,drawer,offering,collection,treasurer,fundraiser,school,event,booth,sale,counting,deposit |
| Chinese (Simplified) | Cash Calculator: Count Change | Coin Counter & Money Tally | till,drawer,register,bill,counting,tracker,daily,sales,small,business,vendor,retail,cashier,up |
| Chinese (Traditional) | Cash Tracker: Daily Till Count | Money Counter, Coin Calculator | drawer,register,bill,change,counting,management,book,log,report,deposit,bank,float,cashier,shift |

## Promotional text (142/170)
Count the till in under a minute, see at once if it is over or short, and keep a count sheet you can print or send. No account, works offline.

## Description
Count a till in under a minute. Tap plus and minus with one thumb, or tap a number and type it. See at once if the drawer is over or short, save the count, and print or send a clean count sheet.

Made for closing time: a shop, cafe, bar or market stall at the end of the day, a club, church or school treasurer counting a collection, or anyone getting a bank deposit ready.

COUNT FAST
• One row for every note and coin, largest first, with large plus and minus buttons
• Tap the number to type it on a big keypad, then go straight to the next row
• Hold a row to add a whole roll of coins or a strap of notes at the standard count
• The running total stays at the bottom in large figures
• Hide the rows you never use; add your own, like checks or gift vouchers, entered as an amount

OVER OR SHORT, IN PLAIN WORDS
• Enter what the till should hold, or the starting float plus sales
• The app says "Short by $4.50" or "Over by $2.00", or that it balanced

A RECORD OF EVERY CLOSE
• Save each count with a name, the date and a note
• History by day, with the total and over or short for each count
• Reopen a count to fix it, or duplicate it to start the next one
• Keep separate tills: front register, bar, safe

PRINT OR SEND IT
• A one-page count sheet: every note and coin, subtotals, total, expected, difference, till, date, note, and lines to sign
• Share it, print it, or save it to Files
• Export History as CSV for a spreadsheet

READY FOR THE BANK
• Pick the float to leave in the till and the deposit helper shows which notes and coins to bank, and the deposit total

SIX CURRENCIES
• US dollar, Canadian dollar, euro, pound, Australian dollar and Mexican peso, picked from your region

PRIVATE AND OFFLINE
• No account, no sign-in, no cloud
• Works in airplane mode; your counts stay on your iPhone unless you send them

Cash Counter adds up what you type. It does not use the camera and does not scan money. It is a calculator and a record, not accounting or tax software, and gives no financial advice.

CASH COUNTER PRO
Free forever: unlimited counting, one till, your last three saved counts and your first count sheet. Pro keeps every count in History, adds more tills, every count sheet and CSV export, the deposit helper, your own rows and every currency: weekly with a free trial for new subscribers, yearly, or lifetime with one payment.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/cashcounter/privacy.html

## What's New (1.0.0)
First version. Count a till with one thumb, see over or short at once, save each count, and print a one-page count sheet.

## Category
Primary: Business. Secondary: Finance.

## Age rating
4+. Every content question is None.

## App Privacy (nutrition label)
Purchases (Purchase History), used for App Functionality, not linked to the user's identity, not used for tracking. RevenueCat keeps the purchase history under an anonymous app user id to confirm Pro. Nothing else is collected: tills, counts and notes stay in SQLite on the device. No account, no analytics. The privacy page says exactly this.

Permissions: none at install. No camera, microphone, location, contacts or photos. One local notification, the trial reminder, asked on the onboarding reminder screen only when a free trial is on offer.

## Pricing and RevenueCat
- Subscription group "Cash Counter Pro".
- `cash_pro_weekly`: auto-renewing weekly, $4.99/week, 3-day free trial (introductory offer). RevenueCat package `$rc_weekly`. Listed first and preselected on both paywalls.
- `cash_pro_yearly`: auto-renewing yearly, $19.99/year. RevenueCat package `$rc_annual`.
- `cash_pro_lifetime`: non-consumable, $24.99 one time. RevenueCat package `$rc_lifetime`.
- RevenueCat: entitlement `pro` (attach all three products), offering `default` with the three packages. Created exactly so (confirmed by Brian, Nov 22).
- Prices and trial text in the app always come from StoreKit through RevenueCat.

## App Review contact and support
- Support URL: https://bkdigitalleads-cmyk.github.io/cashcounter/support.html
- Marketing URL: https://bkdigitalleads-cmyk.github.io/cashcounter/
- Privacy Policy URL: https://bkdigitalleads-cmyk.github.io/cashcounter/privacy.html
- Contact email: bkdigitalleads@gmail.com. Settings in the app has "Email support", which opens Mail with the subject "Cash Counter support".

## App Review note (paste into ASC, Notes)
Cash Counter is a calculator and a record for counting cash by hand. The user types how many of each note and coin they have; the app adds it up in integer cents, compares it with an expected amount, and saves the count. It does not use the camera and does not scan or recognize money. There is no account, sign-in or server; counts are stored in SQLite on the device and leave it only when the user shares or prints a count sheet or a CSV.

First launch: three short screens, then "What are you counting?" (it only names the first till). If the Apple ID can still get the free trial, two screens explain the trial and its reminder (the reminder screen may ask for notification permission, used only for one local reminder the day before a trial ends). Then the paywall opens; the close button (X, top right) appears after 3 seconds. Closing it shows a small sheet ("Counting is free") and the app opens on the count.

Free: unlimited counting, one till, the last three saved counts in History, the first count sheet and the first CSV export. Pro adds every saved count in History, more tills, every count sheet and CSV export, the deposit helper, custom rows and every currency. The in-app paywall opens on the fourth save, the second count sheet, a second till, and from Settings. Restore purchases is on both paywalls and in Settings. A count is always saved, even on the free plan past three; older ones are kept on the device and shown with Pro.

How to test: on the Count tab, tap plus on a few rows, or tap a number and type it (Next jumps to the next row); hold the Quarters row and tap Add a roll. Tap Add expected amount at the bottom, choose Float + sales, type a float and sales, Done: the screen shows Short by or Over by. Tap Save count, then Save count again. On the saved count, tap Count sheet and Share or Print. History shows it by day; Settings has Export history as CSV.

## Screenshots (6.9 inch at 1320x2868 and 6.3 inch at 1206x2622, six each)
Made: store/screenshots/67-1.png to 67-6.png (6.9 inch) and 61-1.png to 61-6.png (6.3 inch), PNG, sRGB, no alpha, by `node store/screenshots.js` from the 4x screen renders in store/screens/. The purchase review screenshot of the in-app paywall alone is store/screenshots/paywall-review.png at 1179x2556.
From the app's own screens; a short caption at the top in Barlow Tab on the tray background; no device frames, gradients or emoji, and no pictures of real money. Sample content is a made-up front register.
1. "Count Money Fast": the count with a total, mid-count, large plus and minus (render 02-count-mid)
2. "Over or Short at a Glance": the total with "Short by $4.50" and the expected amount, cut to the lower part of the count so it reads large (05-difference)
3. "Print a Count Sheet": the count sheet preview, cut to the page so it reads large (09-sheet-preview; Share, Print and Save to Files sit just below it in the app)
4. "Every Close in History": History by day with totals and over or short (07-history, on Pro so all show)
5. "Know What to Bank": the deposit helper with the float and the bank column (08-deposit)
6. "Private and Offline": the count in dark mode, short by $4.50, with the line "No account. Your counts stay on your iPhone." (05-difference, dark)
