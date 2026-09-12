#!/usr/bin/env python3
"""Genera assets de marca VigilaTeh desde el logo vertical."""
from PIL import Image, ImageOps
from pathlib import Path

# --- Config ---
SRC = Path("src/resources/images/logo-vigilateh.png")
OUT = Path("public")
BG_COLOR = (10, 25, 47)  # #0A192F
TOLERANCE = 70  # tolerancia para detectar "fondo"

SIZES = {
    "favicon-32.png": 32,
    "favicon-48.png": 48,
    "apple-touch-icon-180x180.png": 180,
    "pwa-64x64.png": 64,
    "pwa-192x192.png": 192,
    "pwa-512x512.png": 512,
    "maskable-icon-512x512.png": 512,
    "isotipo-vigilateh.png": 512,  # version cuadrada para login/PWA
}

def is_bg(pixel, bg, tol):
    return all(abs(int(pixel[i]) - bg[i]) <= tol for i in range(3))

def find_isotipo_bbox(img):
    """Encuentra bbox del contenido en la mitad superior (águila/escudo)."""
    w, h = img.size
    px = img.load()
    bg = px[2, 2]  # esquina superior izquierda = fondo
    print(f"[bg] color de fondo: {bg}")

    # Solo miramos la mitad superior (excluye texto)
    limit_y = int(h * 0.71)
    min_x, min_y, max_x, max_y = w, h, 0, 0

    # Muestreamos cada 2px para ir rápido
    for y in range(0, limit_y, 2):
        for x in range(0, w, 2):
            p = px[x, y]
            if not is_bg(p, bg, TOLERANCE):
                if x < min_x: min_x = x
                if y < min_y: min_y = y
                if x > max_x: max_x = x
                if y > max_y: max_y = y

    # Padding de seguridad
    pad = 10
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(w, max_x + pad)
    max_y = min(limit_y, max_y + pad)
    print(f"[bbox] {min_x},{min_y} -> {max_x},{max_y}")
    return (min_x, min_y, max_x, max_y), bg

def make_square(img, bg):
    """Pega el isotipo centrado en canvas cuadrado."""
    w, h = img.size
    side = max(w, h)
    canvas = Image.new("RGB", (side, side), bg)
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    return canvas

def main():
    if not SRC.exists():
        raise SystemExit(f"❌ No existe: {SRC}")

    print(f"[1] Abriendo {SRC} ...")
    img = Image.open(SRC).convert("RGB")
    print(f"    tamaño original: {img.size}")

    print("[2] Detectando isotipo (águila + escudo) ...")
    bbox, bg = find_isotipo_bbox(img)

    print("[3] Recortando ...")
    iso = img.crop(bbox)
    print(f"    recorte: {iso.size}")

    print("[4] Convirtiendo a cuadrado ...")
    sq = make_square(iso, bg)
    print(f"    cuadrado: {sq.size}")

    print("[5] Generando assets ...")
    OUT.mkdir(exist_ok=True)
    for name, size in SIZES.items():
        resized = sq.resize((size, size), Image.LANCZOS)
        path = OUT / name
        resized.save(path, "PNG", optimize=True)
        print(f"    ✅ {name} ({size}x{size})")

    print("[6] Generando favicon.ico ...")
    ico_sizes = [(16,16), (32,32), (48,48), (64,64)]
    sq.save(OUT / "favicon.ico", format="ICO", sizes=ico_sizes)
    print(f"    ✅ favicon.ico ({ico_sizes})")

    print("\n🎉 LISTO. Assets en public/")

if __name__ == "__main__":
    main()
