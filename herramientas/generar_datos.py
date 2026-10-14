"""Genera datos.js (lo que lee la web) a partir del Excel de puntos.

Uso:  python herramientas/generar_datos.py [ruta_del_excel]
Por defecto lee  ../Puntos mapa bonos.xlsx  (carpeta mapa_bonos, fuera del repo).
No exporta las columnas internas (fuente, precisión, comentarios).
"""
import json
import os
import sys
from datetime import date

from openpyxl import load_workbook

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "..", "Puntos mapa bonos.xlsx")

wb = load_workbook(EXCEL, data_only=True)
cab = [c.value for c in wb["Puntos"][1]]
col = {nombre: i for i, nombre in enumerate(cab)}


def v(fila, nombre):
    x = fila[col[nombre]]
    return x.strip() if isinstance(x, str) else x


puntos = []
for fila in wb["Puntos"].iter_rows(min_row=2, values_only=True):
    if not fila[0]:
        continue
    lat, lng = v(fila, "Latitud"), v(fila, "Longitud")
    p = {
        "id": v(fila, "ID"),
        "tipo": {"Escuela": "escuela", "Restaurante": "restaurante", "Tienda": "tienda"}[v(fila, "Tipo")],
        "est": v(fila, "Estación"),
        "zona": v(fila, "Zona (agrupa en el mapa)"),
        "ubic": v(fila, "Núcleo / ubicación") or "",
        "nombre": v(fila, "Nombre en el mapa"),
        "marca": v(fila, "Marca") or "",
        "express": v(fila, "Contramarca Express") == "Sí",
        "self": v(fila, "Contramarca Self") == "Sí",
        "local": v(fila, "Tipo de local") or "",
        "nota": v(fila, "Qué incluye / nota cliente") or "",
        "partner": v(fila, "Partner GV") == "Sí",
        "dir": v(fila, "Dirección") or "",
        "nucleo": v(fila, "Núcleo en plano") or "",
    }
    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
        p["lat"], p["lng"] = round(lat, 6), round(lng, 6)
    puntos.append(p)

nucleos = {}
for fila in wb["Núcleos plano"].iter_rows(min_row=2, values_only=True):
    if fila[0] and isinstance(fila[3], (int, float)):
        nucleos[fila[0]] = {"est": fila[1], "nombre": fila[2], "x": fila[3], "y": fila[4]}

salida = os.path.join(RAIZ, "datos.js")
with open(salida, "w", encoding="utf-8") as fh:
    fh.write(f"// Generado por herramientas/generar_datos.py el {date.today().isoformat()} desde 'Puntos mapa bonos.xlsx'. No editar a mano.\n")
    fh.write("window.DATOS = ")
    json.dump({"puntos": puntos, "nucleos": nucleos}, fh, ensure_ascii=False, indent=1)
    fh.write(";\n")
print(f"{len(puntos)} puntos, {len(nucleos)} núcleos -> {salida}")
