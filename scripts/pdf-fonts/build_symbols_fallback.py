"""
Genera `public/fonts/pdf/PdfSymbolsFallback-Regular.ttf`, la fuente de respaldo
de los PDF (EC-958): los símbolos que Arimo no tiene (✓, ⇒, ★, ①, ⚠…).

Une en un solo TTF un subconjunto de tres fuentes Noto (SIL OFL 1.1):
Noto Sans Symbols 2, Noto Sans Symbols y Noto Sans Math, recortadas a los
bloques de `TARGET_BLOCKS`. Por cada punto de código gana la primera que lo
tenga, en el orden de `SOURCES`; los que Arimo ya imprime (Regular y Bold) se
omiten, porque react-pdf nunca los pediría a la de respaldo.

Las métricas verticales (hhea, OS/2) y las unidades por em se igualan a las de
Arimo: textkit calcula el alto de cada renglón con `hhea` de la fuente de cada
tramo, así que un renglón con un símbolo mide lo mismo que uno sin él.

Uso (fonttools en un entorno aparte; no es dependencia del proyecto):

    python -m venv .venv-fonts && .venv-fonts/Scripts/python -m pip install fonttools
    npm pack @expo-google-fonts/noto-sans-symbols-2@0.4.1 @expo-google-fonts/noto-sans-symbols@0.4.1 \
        @expo-google-fonts/noto-sans-math@0.4.2   # en una carpeta temporal; extraer cada .tgz
    .venv-fonts/Scripts/python scripts/pdf-fonts/build_symbols_fallback.py \
        --symbols2 <...>/NotoSansSymbols2_400Regular.ttf \
        --symbols  <...>/NotoSansSymbols_400Regular.ttf \
        --math     <...>/NotoSansMath_400Regular.ttf

Con las mismas entradas y la misma versión de fonttools el resultado es el
mismo byte a byte (`head.modified` y `head.created` se fijan).
"""

from __future__ import annotations

import argparse
import os
import sys
import tempfile

from fontTools.merge import Merger
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem

# Bloques Unicode que cubre la de respaldo (inicio, fin inclusivo, nombre).
TARGET_BLOCKS = [
    (0x2190, 0x21FF, "Arrows"),
    (0x2200, 0x22FF, "Mathematical Operators"),
    (0x2300, 0x23FF, "Miscellaneous Technical"),
    (0x2460, 0x24FF, "Enclosed Alphanumerics"),
    (0x25A0, 0x25FF, "Geometric Shapes"),
    (0x2600, 0x26FF, "Miscellaneous Symbols"),
    (0x2700, 0x27BF, "Dingbats"),
    (0x27F0, 0x27FF, "Supplemental Arrows-A"),
    (0x2900, 0x297F, "Supplemental Arrows-B"),
    (0x2B00, 0x2BFF, "Miscellaneous Symbols and Arrows"),
]

# Orden de prioridad cuando dos fuentes tienen el mismo punto de código.
SOURCES = ["symbols2", "symbols", "math"]

FAMILY = "PdfSymbolsFallback"
ARIMO_FILES = ("Arimo-Regular.ttf", "Arimo-Bold.ttf")
# Tablas que no hacen falta para símbolos sueltos y que complican la unión:
# sustituciones/posicionamiento, la tabla MATH, STAT y métricas verticales.
DROP_TABLES = ["GSUB", "GPOS", "GDEF", "MATH", "STAT", "vhea", "vmtx", "gasp"]
# 2026-01-01T00:00:00Z en segundos desde 1904 (época de `head`).
FIXED_TIMESTAMP = 3849984000


def cmap_codepoints(font: TTFont) -> set[int]:
    return set(font.getBestCmap().keys())


def target_codepoints() -> set[int]:
    return {cp for start, end, _ in TARGET_BLOCKS for cp in range(start, end + 1)}


def subset_to(path: str, codepoints: set[int], out: str) -> None:
    font = TTFont(path)
    options = Options()
    options.hinting = False
    options.layout_features = []
    options.drop_tables += DROP_TABLES
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = Subsetter(options)
    subsetter.populate(unicodes=sorted(codepoints))
    subsetter.subset(font)
    for tag in DROP_TABLES:
        if tag in font:
            del font[tag]
    font.save(out)


def set_name(font: TTFont) -> None:
    name = font["name"]
    keep = {0, 7, 8, 9, 11, 12, 13, 14}  # copyright, marca, fabricante, diseñador, URLs, licencia
    name.names = [record for record in name.names if record.nameID in keep]
    for name_id, value in {
        1: FAMILY,
        2: "Regular",
        3: f"{FAMILY}-Regular",
        4: f"{FAMILY} Regular",
        5: "Version 1.000; subset of Noto Sans Symbols 2, Noto Sans Symbols and Noto Sans Math",
        6: f"{FAMILY}-Regular",
    }.items():
        name.setName(value, name_id, 3, 1, 0x409)


def match_vertical_metrics(font: TTFont, arimo: TTFont) -> None:
    for attr in ("ascent", "descent", "lineGap"):
        setattr(font["hhea"], attr, getattr(arimo["hhea"], attr))
    for attr in ("sTypoAscender", "sTypoDescender", "sTypoLineGap", "usWinAscent", "usWinDescent"):
        setattr(font["OS/2"], attr, getattr(arimo["OS/2"], attr))


def build(args: argparse.Namespace) -> None:
    arimo_fonts = [TTFont(os.path.join(args.arimo_dir, f)) for f in ARIMO_FILES]
    in_arimo = set.intersection(*(cmap_codepoints(f) for f in arimo_fonts))
    pending = target_codepoints() - in_arimo
    paths = {"symbols2": args.symbols2, "symbols": args.symbols, "math": args.math}

    with tempfile.TemporaryDirectory() as tmp:
        parts: list[str] = []
        for key in SOURCES:
            take = pending & cmap_codepoints(TTFont(paths[key]))
            if not take:
                continue
            pending -= take
            out = os.path.join(tmp, f"{key}.ttf")
            subset_to(paths[key], take, out)
            parts.append(out)
            print(f"{key}: {len(take)} puntos de código")

        merged = Merger().merge(parts)

    scale_upem(merged, arimo_fonts[0]["head"].unitsPerEm)
    match_vertical_metrics(merged, arimo_fonts[0])
    set_name(merged)
    merged["head"].created = FIXED_TIMESTAMP
    merged["head"].modified = FIXED_TIMESTAMP
    # Sin esto `save` vuelve a poner la hora actual en `head.modified`.
    merged.recalcTimestamp = False
    merged.save(args.out)
    print(f"{args.out}: {os.path.getsize(args.out)} bytes, {len(cmap_codepoints(TTFont(args.out)))} puntos de código")


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--symbols2", required=True, help="NotoSansSymbols2_400Regular.ttf")
    parser.add_argument("--symbols", required=True, help="NotoSansSymbols_400Regular.ttf")
    parser.add_argument("--math", required=True, help="NotoSansMath_400Regular.ttf")
    parser.add_argument("--arimo-dir", default="public/fonts/pdf")
    parser.add_argument("--out", default=f"public/fonts/pdf/{FAMILY}-Regular.ttf")
    build(parser.parse_args(argv))


if __name__ == "__main__":
    main(sys.argv[1:])
