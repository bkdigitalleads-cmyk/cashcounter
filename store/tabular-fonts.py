"""
Cash Counter's type: Barlow (SIL OFL 1.1, no Reserved Font Name; licence in
assets/fonts/OFL-Barlow.txt), with its tabular figures made the default.

Barlow ships proportional figures and keeps tabular ones (zero.tf to
nine.tf) behind the `tnum` feature. iOS text fields, react-native-svg and
pdf-lib do not all apply OpenType features the same way, so this script
points the digits in the character map straight at the tabular glyphs and
renames the family "Barlow Tab" (a modified version keeps the licence and
takes its own name). Every number on screen and in the count sheet then has
the same width per digit, and columns of money do not jump.

Run once from the repo root with fontTools installed:
  python3 store/tabular-fonts.py <folder with the Barlow .ttf files>
Writes assets/fonts/BarlowTab-<Weight>.ttf.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'fonts'
DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

for weight in ['Regular', 'Medium', 'SemiBold', 'Bold']:
    font = TTFont(SRC / f'Barlow-{weight}.ttf')
    order = set(font.getGlyphOrder())
    for table in font['cmap'].tables:
        if not table.isUnicode():
            continue
        for i, name in enumerate(DIGITS):
            cp = 0x30 + i
            if cp in table.cmap and f'{name}.tf' in order:
                table.cmap[cp] = f'{name}.tf'
    for rec in font['name'].names:
        text = rec.toUnicode()
        if rec.nameID in (1, 3, 4, 6, 16):
            text = text.replace('Barlow-', 'BarlowTab-').replace('Barlow', 'Barlow Tab') if rec.nameID != 6 else f'BarlowTab-{weight}'
            rec.string = text
    font.save(OUT / f'BarlowTab-{weight}.ttf')
    print('wrote', OUT / f'BarlowTab-{weight}.ttf')
