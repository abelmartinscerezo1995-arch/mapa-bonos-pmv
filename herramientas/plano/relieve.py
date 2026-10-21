"""Dibuja el relieve de invierno (sombreado, nieve según altitud, curvas de nivel suaves, bosques y lagos) a partir de lo que
baja descargar.py, y lo corta en teselas plano/relieve/{z}/{x}/{y}.webp (zooms 11 a 15).
Solo hace falta si se cambia la zona o el estilo; tarda un par de minutos y necesita numpy, scipy y Pillow."""
import json
import math
import os
import shutil

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from comun import CACHE, PLANO, X0 as x0, X1 as x1, Y0 as y0, Y1 as y1, Z
F = 2                      # doble resolución: el mosaico encaja con la rejilla de z15
ZF = Z + 1
T = 256

filas = []
for y in range(y0, y1 + 1):
    fila = []
    for x in range(x0, x1 + 1):
        a = np.asarray(Image.open(os.path.join(CACHE, "dem", f"{Z}_{x}_{y}.png")).convert("RGB")).astype(np.float32)
        fila.append(a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768)
    filas.append(np.hstack(fila))
h = ndimage.gaussian_filter(np.vstack(filas), 1.2)
h = ndimage.zoom(h, F, order=3).astype(np.float32)
H, W = h.shape
lat_c = math.degrees(math.atan(math.sinh(math.pi * (1 - (y0 + y1 + 1) / 2 ** Z))))
px = 156543.03 * math.cos(math.radians(lat_c)) / 2 ** ZF

gy, gx = np.gradient(h, px)
pend = np.arctan(np.hypot(gx, gy)).astype(np.float32)
asp = np.arctan2(-gx, gy).astype(np.float32)
del gx, gy


def sombra(az, alt):
    az, alt = math.radians(az), math.radians(alt)
    return np.clip(np.sin(alt) * np.cos(pend) + np.cos(alt) * np.sin(pend) * np.cos(az - asp), 0, 1)


s = 0.6 * sombra(315, 38) + 0.25 * sombra(270, 50) + 0.15 * sombra(0, 60)
s = (s / s.max()).astype(np.float32)
del pend, asp

paradas = [(900, (196, 206, 190)), (1600, (206, 216, 204)), (1900, (232, 238, 240)), (2300, (248, 250, 252)), (3000, (255, 255, 255))]
alt = np.clip(h, paradas[0][0], paradas[-1][0])
img = np.zeros((H, W, 3), np.float32)
luz = 0.40 + 0.60 * s
for c, t in enumerate((0.80, 0.86, 1.0)):
    img[..., c] = np.interp(alt, [p[0] for p in paradas], [p[1][c] for p in paradas]) * luz * (t + (1 - t) * s)
del alt, luz

for paso, fuerza in ((100, 0.04), (500, 0.08)):
    k = np.floor(h / paso)
    borde = (k != np.roll(k, 1, 0)) | (k != np.roll(k, 1, 1))
    for c in range(3):
        img[..., c] *= np.where(borde, np.float32(1 - fuerza), np.float32(1))


def a_px(lat, lon):
    n = 2 ** ZF
    return ((lon + 180) / 360 * n - x0 * F) * T, ((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - y0 * F) * T


def anillos(e):
    if e["type"] == "way":
        return [[a_px(p["lat"], p["lon"]) for p in e["geometry"]]], []
    res = {"outer": [], "inner": []}
    for papel in res:
        trozos = [[(p["lat"], p["lon"]) for p in m["geometry"]] for m in e.get("members", []) if m.get("role") == papel and m.get("geometry")]
        while trozos:
            a = trozos.pop(0)
            cambio = True
            while a[0] != a[-1] and cambio:
                cambio = False
                for i, b in enumerate(trozos):
                    if b[0] == a[-1]: a += b[1:]
                    elif b[-1] == a[-1]: a += b[::-1][1:]
                    elif b[-1] == a[0]: a = b + a[1:]
                    elif b[0] == a[0]: a = b[::-1] + a[1:]
                    else: continue
                    trozos.pop(i); cambio = True; break
            if len(a) > 2:
                res[papel].append([a_px(*p) for p in a])
    return res["outer"], res["inner"]


els = json.load(open(os.path.join(CACHE, "bosque.json"), encoding="utf-8"))["elements"]
for tipo in ("bosque", "agua"):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    for e in els:
        es = "agua" if e.get("tags", {}).get("natural") == "water" else "bosque"
        if es != tipo:
            continue
        fuera, dentro = anillos(e)
        for r in fuera:
            if len(r) > 2: d.polygon(r, fill=255)
        for r in dentro:
            if len(r) > 2: d.polygon(r, fill=0)
    mk = ndimage.gaussian_filter(np.asarray(m).astype(np.float32) / 255, 0.8)[..., None]
    del m, d
    if tipo == "bosque":
        rng = np.random.default_rng(7)
        arb = ndimage.gaussian_filter((rng.random((H, W), dtype=np.float32) > 0.93).astype(np.float32), 1.0)
        arb = 1 - 0.38 * arb / arb.max()
        for c, f in enumerate((0.72, 0.80, 0.76)):
            img[..., c] *= 1 + mk[..., 0] * (f * arb - 1)
        del arb
    else:
        for c, v in enumerate((160, 195, 224)):
            img[..., c] = img[..., c] * (1 - mk[..., 0]) + v * mk[..., 0]

mosaico = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")
del img, h, s

# Teselas XYZ: el mosaico empieza en la tesela (x0*F, y0*F) de z15
dest = os.path.join(PLANO, "relieve")
shutil.rmtree(dest, ignore_errors=True)
n = 0
for z in range(11, ZF + 1):
    e = 2 ** (z - ZF)
    ox, oy = x0 * F * T * e, y0 * F * T * e            # origen del mosaico en píxeles globales de z
    wz, hz = max(1, round(W * e)), max(1, round(H * e))
    nivel = mosaico if e == 1 else mosaico.resize((wz, hz), Image.LANCZOS)
    for tx in range(int(ox // T), int((ox + wz - 1) // T) + 1):
        for ty in range(int(oy // T), int((oy + hz - 1) // T) + 1):
            t = Image.new("RGBA", (T, T), (0, 0, 0, 0))
            t.paste(nivel.crop((round(tx * T - ox), round(ty * T - oy), round(tx * T - ox) + T, round(ty * T - oy) + T)), (0, 0))
            os.makedirs(os.path.join(dest, str(z), str(tx)), exist_ok=True)
            t.save(os.path.join(dest, str(z), str(tx), f"{ty}.webp"), "WEBP", quality=78, method=5)
            n += 1
tam = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(dest) for f in fs)
print("teselas", n, tam // 1024, "KB", mosaico.size)
