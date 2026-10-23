"""Convierte los planos oficiales (PDF) en teselas para el mapa de montaña.

Uso:  python herramientas/generar_planos.py [carpeta_de_los_pdf]
Por defecto lee  ../planos/Plano {GV,PA,OA} 25-26.pdf  (carpeta mapa_bonos, fuera del repo).

Qué genera, por estación (p. ej. GV):
  planos/GV-2526/{z}/{x}/{y}.webp   teselas de 256 px, 5 niveles (z0 = 400 px de ancho ... z4 = 6400 px)
  planos/GV-2526/vista.webp         imagen pequeña que se ve mientras cargan las teselas
  planos/info.json                  tamaño de cada plano (lo lee generar_datos.py)

Las coordenadas X/Y de la hoja 'Núcleos plano' están en píxeles de un plano de 3200 px de ancho
(el nivel z3). Si cambias ANCHO_BASE o el recorte, hay que recolocar los núcleos.
Cuando llegue el plano de la temporada nueva, cambia TEMPORADA: la carpeta nueva no pisa la anterior
y los navegadores no se quedan con teselas viejas en caché.
"""
import json
import math
import os
import shutil
import sys

import pymupdf
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDFS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "..", "planos")
TEMPORADA = "25-26"
ANCHO_BASE = 3200           # ancho del plano en las coordenadas de la hoja (nivel z3)
NIVELES = 5                 # z0..z4; z4 = 2 x ANCHO_BASE
TESELA = 256
CALIDAD = 74                # WebP
# Fracción del alto de la página que ocupa el mapa (el resto es leyenda y tablas).
ALTO_UTIL = {"GV": 700 / 1022.4, "PA": 735 / 1015.6, "OA": 900 / 1230.5}

Image.MAX_IMAGE_PIXELS = None
destino_raiz = os.path.join(RAIZ, "planos")
os.makedirs(destino_raiz, exist_ok=True)
info = {}

for est, frac in ALTO_UTIL.items():
    carpeta = os.path.join(destino_raiz, f"{est}-{TEMPORADA.replace('-', '')}")
    if os.path.isdir(carpeta):
        shutil.rmtree(carpeta)
    os.makedirs(carpeta)

    page = pymupdf.open(os.path.join(PDFS, f"Plano {est} {TEMPORADA}.pdf"))[0]
    ancho_max = ANCHO_BASE * 2 ** (NIVELES - 1 - 3)
    zoom = ancho_max / page.rect.width
    clip = pymupdf.Rect(0, 0, page.rect.width, page.rect.height * frac)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip)
    grande = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    alto_base = round(grande.height * ANCHO_BASE / grande.width)

    n_teselas, bytes_total = 0, 0
    for z in range(NIVELES):
        escala = 2 ** (z - (NIVELES - 1))
        w, h = max(1, round(grande.width * escala)), max(1, round(grande.height * escala))
        nivel = grande if escala == 1 else grande.resize((w, h), Image.LANCZOS)
        for x in range(math.ceil(w / TESELA)):
            for y in range(math.ceil(h / TESELA)):
                caja = (x * TESELA, y * TESELA, min((x + 1) * TESELA, w), min((y + 1) * TESELA, h))
                trozo = nivel.crop(caja)
                if trozo.size != (TESELA, TESELA):  # borde: se completa con transparente
                    lienzo = Image.new("RGBA", (TESELA, TESELA), (0, 0, 0, 0))
                    lienzo.paste(trozo, (0, 0))
                    trozo = lienzo
                ruta = os.path.join(carpeta, str(z), str(x))
                os.makedirs(ruta, exist_ok=True)
                fichero = os.path.join(ruta, f"{y}.webp")
                trozo.save(fichero, "WEBP", quality=CALIDAD, method=6)
                n_teselas += 1
                bytes_total += os.path.getsize(fichero)

    # Vista previa: pequeña a propósito (~25 KB), es lo primero que se pinta.
    vista = grande.resize((640, round(grande.height * 640 / grande.width)), Image.LANCZOS)
    vista.save(os.path.join(carpeta, "vista.webp"), "WEBP", quality=55, method=6)

    info[est] = {
        "carpeta": f"planos/{os.path.basename(carpeta)}",
        "ancho": ANCHO_BASE, "alto": alto_base,
        "zMin": -3, "zMax": NIVELES - 1 - 3, "temporada": TEMPORADA,
    }
    print(f"{est}: {grande.width}x{grande.height} px, {n_teselas} teselas, {bytes_total / 1e6:.1f} MB -> {carpeta}")

with open(os.path.join(destino_raiz, "info.json"), "w", encoding="utf-8") as fh:
    json.dump(info, fh, ensure_ascii=False, indent=1)
print("info.json escrito. Ahora ejecuta generar_datos.py para que el mapa lo lea.")
