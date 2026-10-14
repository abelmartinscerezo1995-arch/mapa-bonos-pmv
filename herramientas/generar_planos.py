"""Convierte los planos oficiales (PDF) en las imágenes que usa el mapa de montaña.

Uso:  python herramientas/generar_planos.py [carpeta_de_los_pdf]
Por defecto lee  ../planos/Plano {GV,PA,OA} 25-26.pdf  (carpeta mapa_bonos, fuera del repo)
y escribe img/plano_{GV,PA,OA}.jpg  a 3200 px de ancho, sin la franja de leyenda.
Si cambias el ancho o el recorte, hay que recolocar los núcleos de la hoja 'Núcleos plano'.
"""
import os
import sys

import pymupdf
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDFS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "..", "planos")
ANCHO = 3200
# Fracción del alto de la página que ocupa el mapa (el resto es leyenda y tablas).
ALTO_UTIL = {"GV": 700 / 1022.4, "PA": 735 / 1015.6, "OA": 900 / 1230.5}

os.makedirs(os.path.join(RAIZ, "img"), exist_ok=True)
for est, frac in ALTO_UTIL.items():
    page = pymupdf.open(os.path.join(PDFS, f"Plano {est} 25-26.pdf"))[0]
    zoom = ANCHO / page.rect.width
    clip = pymupdf.Rect(0, 0, page.rect.width, page.rect.height * frac)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    destino = os.path.join(RAIZ, "img", f"plano_{est}.jpg")
    img.save(destino, quality=82, optimize=True, progressive=True)
    print(f"{est}: {img.size[0]}x{img.size[1]} px, {os.path.getsize(destino) / 1e6:.2f} MB -> {destino}")
