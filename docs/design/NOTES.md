# Cash Counter design notes (1.0.0, Nov 22, 2026)

## Concept: the count tray

The person opening this app is standing at a till at closing time, often with a bad overhead light, a stack of notes in one hand and the phone in the other. What they know is the cash drawer: a molded insert with a compartment for each note and coin, largest at the back. So the count screen is that tray, not a spreadsheet of text boxes.

- The tray (the background) is cool steel, #E9ECEF; each compartment (a row, a sheet, a panel) is white, #FFFFFF, with a 1 px edge and rounded corners (14, and 10 on buttons), like a molded insert. Ink is near-black, #0C0E11, at 19:1 on white, for bad light.
- Two colors carry meaning, and nothing else uses them:
  - accent, deposit-slip blue (#1E4FD8, white lettering at 6.6:1): the one primary action on a screen (Save count, Continue, Share, Done)
  - flag, signal amber (#A93C00, 5.4:1 on its pale wash and 6.3:1 on white): over or short, always with the words beside it ("Short by $4.50"). Balanced is plain ink with a check.
  Picked choices are solid ink, not blue, so blue only ever means "do this".
- Type: Barlow, a grotesk drawn from road signs and license plates, which stays legible at a glance. Store/tabular-fonts.py makes its tabular figures the default ("Barlow Tab"), so every digit is the same width on screen, in text fields and in the PDF, and a column of amounts never jumps as it changes. Titles, labels, tiles and every number are Barlow Tab; sentences people read are the system font, which follows Dynamic Type.
- Notes and coins are tiles in the app's own style, never pictures of money: a note is a framed oblong with its value lettered on it; a coin is a ringed disc. The tile says "$20", "25¢", "€2", "20p".
- One thumb: plus and minus are 56 x 56 points, the number between them is 64 x 56 and opens a keypad with 62-point keys, Clear and Delete, and "Next $10" to go straight to the next row. A long press on a row offers a roll (a bag in the UK) or a strap at the standard count. The total stays pinned at the bottom in 44-point figures, with over or short under it and Save count under that.
- Dark follows the system: the tray goes to near-black (#0B0D10), compartments to graphite (#171A1F), ink to near-white, the blue lifts to #7EA3FF with dark lettering and the amber to #FFA45C. The count sheet preview stays white, because that is what prints.
- Motion is quiet: sheets fade; feedback is by touch (a light tap on plus, minus and each key, a firmer one for a roll, a success tap when a count is saved or a sheet goes out).

Nothing here is Estimate Maker's: no manila, no ledger lines, no orange, no IBM Plex. The component kit has its own names (src/ui/Kit.tsx: Press, MainButton, PlainButton, RoundButton, Choice, Tray, Slot, Heading, Fine, SectionHead, TextBox, Bar, Toast, Sheet; src/ui/Cash.tsx: CashTile, DiffLine, Keypad, SheetView).

## Renders

`after/` holds every screen the brief asks for, 393x852 points at 2x, light and dark, from a throwaway web copy of the app (not in the repo): the real App.tsx, screens, kit, data layer and count sheet layout on react-native-web, with expo-sqlite swapped for sql.js running the same migrations and SQL, a stubbed store with $4.99 weekly with 3 days free, $19.99 yearly and $24.99 lifetime, a drawn status bar and the clock pinned to Sunday, Nov 22, 2026, 9:12 PM. Haptics, Dynamic Type, VoiceOver, the iOS keyboard and the real long-press timing are not visible in them.

1. `01-count-empty`: the count before anything is counted (Save count is off until something is)
2. `02-count-mid`: mid-count, with the total pinned at the bottom
3. `03-typing`: typing a quantity on the keypad (23 twenties = $460.00), with Next $10
4. `04-expected`: the expected amount as a float plus sales
5. `05-difference`: the count with "Short by $4.50"
6. `06-save`: the save sheet with name, date (Today, Yesterday) and note
7. `07-history`: History by day on the free plan: the last three counts, and "2 older counts are kept on this iPhone"
8. `08-deposit`: the deposit helper: the float, the deposit total, and leave and bank for each note and coin
9. `09-sheet-preview`: the count sheet as it prints, with Share, Print and Save to Files
10. `10-paywall-onboarding`: the onboarding paywall after the trial screens, close button showing (it appears after 3 seconds)
11. `11-paywall-in-app`: the in-app paywall from History ("Keep every count.")
12. `12-settings`: Settings
13. `13` to `16`: onboarding (src/screens/Intro.tsx): the three value screens and "What are you counting?"
14. `17-trial`: the trial explainer; `18-roll`: the long-press sheet with Add a roll; `19-saved-count`: a saved count; `20-tills`: two tills; `21-after-save`: a count just saved

## The count sheet

One page, laid out once by `src/pdf/layout.ts` as drawing operations on points; pdf-lib writes them into the PDF (`src/pdf/pdf.ts`) and react-native-svg draws the same list on screen (`SheetView`), with the same Barlow Tab files, so the preview is the PDF. US Letter in the US, Canada and Mexico, A4 elsewhere.

From the top: CASH COUNT, the till, the count's name, the date and the time it was saved, the currency; a table of notes, then coins, then the person's own rows (checks, vouchers), each with the tile, the name, pieces and the amount (an uncounted row prints a dash), with a subtotal on each section's band; cash, other, and the total under a heavy rule; the starting float and sales when given, the expected amount, and the difference in a box in a dark amber that prints and copies; the note; and "Counted by" and "Checked by" lines with dates at the foot. Samples in `sheet/` (`node store/sheet-samples.mjs`): US dollar on Letter, short; euro on A4 in German formats, balanced; pound on A4 with cheques, over.

## Icon

**Chosen (Nov 22, 2026): 2D-2.** Three matching mid green bills (#2FA463) with white borders and markings, fanned from one corner, and a gold coin in front, on a dark green tile (#0F4A2E). `CHOSEN = '2D-2'` in `store/icon.js`; `node store/icon.js` writes every shipped file from it:

- `assets/icon.png`: 1024x1024, RGB with no alpha channel, square corners (iOS rounds them)
- `assets/android-icon-foreground.png`: the mark at 62% in the middle of the same green, inside the adaptive icon's safe zone; app.json `android.adaptiveIcon.backgroundColor` is the same #0F4A2E
- `assets/splash-icon.png` and `splash-icon-dark.png`: the tile with rounded corners, centred on the steel (light) or near-black (dark) splash
- `assets/favicon.png`, `docs/apple-touch-icon.png` (180, square) and `docs/icon-512.png` (rounded), which is the logo on every website page

No app screen draws the icon, so none of the renders in `after/` changed. The three option sheets below stay for the record.

Three concepts in `icon-options.png`, each large and at 60 px on a light and a dark wallpaper, drawn by `store/icon.js` (`node icon.js options`). At the time none was picked and the shipped files were a plain blue stand-in tile; Brian then picked Stack, and from its green variants 2D-2 (above).

1. Tray: a cash drawer insert seen from above, four note slots and five coin cups, on ink. The app's own concept; the strongest silhouette at 60 px on a light wallpaper.
2. Stack: a framed note and a stack of coins on deposit-slip blue. Says "money counter" fastest; the most like what is already in the category.
3. Counter: a framed note over a minus and an amber plus, on ink. Says "you count it yourself", which is the point, and keeps the app's two colors.

No currency sign (the app counts six currencies), no real banknote or coin artwork, no camera or scanner.

### Stack in green (icon-options-2.png, Nov 22)

Brian liked Stack best because it reads as money, and asked for it to read more like money, in green. Three of the top six icons in the search results for "cash counter" are green tiles with a dollar sign, so these four are green but carry a bill and coins, not a sign. `node icon.js options2` draws them, each large and at 60 px on a light and a dark wallpaper:

- 2A: rich banknote green (#1F7A4D) with the bill and the coin stack in white. Stack recolored.
- 2B: deep dark green (#0E3B28) with a pale mint bill and a gold coin stack. The most contrast on a light wallpaper; the gold carries at 60 px.
- 2C: off-white (#F6F3EA) with a green bill and a gold coin stack. Stands out from every green tile in the results, but fades on a light wallpaper.
- 2D: green (#1E8A4F) with a fan of three green and white bills and one large gold coin, heavier lines and fewer parts, so it still reads at 60 px.

The bill is the app's own: a framed oblong with a ring in the middle and four corner marks. No sign, no letters, no portrait, no real banknote or coin artwork. None is picked; assets/icon.png is still the blue stand-in.

### 2D refined (icon-options-3.png, Nov 22)

Brian likes 2D best and 2B second. In 2D the three bills were three colors; real bills in a fan are all the same green. `node icon.js options3` draws three variants in which all three bills match, set apart only by an outline and a thin shadow:

- 2D-1: 2D's green tile (#1E8A4F), every bill a pale green face (#D3F0DC) with a dark green border and markings (#0F5A33).
- 2D-2: every bill a stronger mid green (#2FA463) with white borders and markings, like a stack of real bills, on a darker green tile (#0F4A2E) so the bills stand out.
- 2E: the 2D fan and gold coin on 2B's deep green (#0E3B28), with matching mint bills.

At 60 px the first fan merged: each bill turned about its own middle, so the two behind showed only as thin stripes. The fan now opens from one shared point near the lower left corner, in 18 degree steps (-36, -18, 0), and the bills are larger. At 60 px the three top edges and the corner marks of the two back bills show, so it reads as three bills, not one shape. `node icon.js check60 out.png` blows the 60 px renders up 6x to check this. None is picked; assets/icon.png is unchanged.
