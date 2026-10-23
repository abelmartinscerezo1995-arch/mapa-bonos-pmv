"""Genera plano/<estación>/puntos.js: escuelas, restaurantes y tiendas de alquiler con coordenadas, sacados de datos.js (que sale
del Excel), el enlace de cada uno a su página oficial y los datos de la estación que usa el plano (nombre, sectores y zona del relieve).
Las tiendas valen para todas las estaciones ("Todas" en el Excel): cada plano enseña las que caen dentro de su caja (comun.py).
Lo ejecuta "Actualizar mapa.bat" cada vez que cambia el Excel.

El enlace sale de mapa_bonos/propuestas/Restaurantes - fichas oficiales (propuesta).xlsx (fichas "Segura" o "Probable").
Si esa tabla no está, se conservan los enlaces que ya tenía puntos.js.
Uso: python herramientas/plano/puntos.py [GV PA ...]   (sin nada: todas las estaciones)"""
import json
import math
import os
import re

import comun
from comun import REPO, elegidas

FICHAS = os.path.join(os.path.dirname(REPO), "propuestas", "Restaurantes - fichas oficiales (propuesta).xlsx")
PREFIJO = "window.PLANO_PUNTOS = "

s = open(os.path.join(REPO, "datos.js"), encoding="utf-8").read()
datos = json.loads(s[s.index("{"):s.rindex("}") + 1])

web = None
if os.path.exists(FICHAS):
    import openpyxl
    web = {r[0]: r[4] for r in openpyxl.load_workbook(FICHAS, read_only=True).active.iter_rows(min_row=2, values_only=True)
           if r[0] and r[4] and r[5] in ("Segura", "Probable")}
else:
    print("Aviso: no encuentro la tabla de fichas oficiales; se conservan los enlaces anteriores.")

ESTS = elegidas()
TIENDAS = [p for p in datos["puntos"] if p["tipo"] == "tienda"]


def en_caja(p, e):
    s, o, n, es = e.caja
    return p.get("lat") is not None and s < p["lat"] < n and o < p["lng"] < es


# Qué incluye el alquiler (hoja Textos del Excel, la misma frase que en el mapa completo)
ALQUILER = datos["textos"].get("alquiler.p2", {}).get("es", "")

for e in ESTS:
    destino = os.path.join(e.plano, "puntos.js")
    enlaces = web
    if enlaces is None:
        enlaces = {}
        if os.path.exists(destino):
            t = open(destino, encoding="utf-8").read()
            t = t[t.index(PREFIJO) + len(PREFIJO):]
            enlaces = {p["id"]: p["w"] for p in json.loads(t[:t.rindex("]") + 1]) if p.get("w")}

    puntos, sin = [], []
    for p in datos["puntos"]:
        if p["tipo"] == "tienda":
            # Sin coordenadas, se avisa en la estación de su sector (GV = Grandvalira; NP = Pal Arinsal y Ordino Arcalís)
            if p.get("lat") is None and (p["sector"] == "GV") == (e.cod == "GV"):
                sin.append(p["nombre"] + " (alquiler)")
            if not en_caja(p, e):
                continue
        elif p["est"] != e.cod or p["tipo"] not in ("escuela", "restaurante"):
            continue
        if p.get("lat") is None:
            sin.append(p["nombre"] + (" (Express)" if p["express"] else " (Self)" if p["self"] else " (otros)"))
            continue
        if p["tipo"] == "tienda":
            # Sector = la Zona del Excel sin el paréntesis ("Encamp – Solanelles (pistas)" → "Encamp – Solanelles");
            # d = dirección, pa = partner de Grandvalira Resorts
            puntos.append({"id": p["id"], "t": "tienda", "n": p["nombre"], "u": p.get("ubic", ""), "z": re.sub(r"\s*\(.*\)$", "", p["zona"]),
                           "d": p.get("dir", ""), "pa": p.get("partner", False), "nota": p.get("nota", ""), "c": [p["lat"], p["lng"]]})
            continue
        puntos.append({"id": p["id"], "t": p["tipo"], "n": p["nombre"].replace("Escuela Grandvalira ", "Escuela "), "u": p.get("ubic", ""),
                       "z": p["zona"], "x": p["express"], "s": p["self"], "l": p.get("local", ""), "nota": p.get("nota", ""),
                       "c": [p["lat"], p["lng"]], "w": e.escuelas if p["tipo"] == "escuela" else enlaces.get(p["id"], "")})

    # Tiendas del mismo sector de alquiler que están en el plano de otra estación (en Ordino Arcalís: las de Pal Arinsal, y al revés)
    sectores_aqui = {p["sector"] for p in TIENDAS if en_caja(p, e)}
    mas = []
    for cod in comun.ESTACIONES:
        otra = comun.estacion(cod)
        n = sum(1 for p in TIENDAS if p["sector"] in sectores_aqui and en_caja(p, otra))
        if cod != e.cod and n:
            mas.append({"cod": cod, "nombre": otra.nombre, "n": n})

    est = {"cod": e.cod, "nombre": e.nombre, "sectores": e.sectores, "burbujas": e.burbujas, "rel": [[e.sur, e.oeste], [e.norte, e.este]],
           "alquiler": ALQUILER, "masTiendas": mas}
    os.makedirs(e.plano, exist_ok=True)
    with open(destino, "w", encoding="utf-8") as fh:
        fh.write("// Generado por herramientas/plano/puntos.py a partir de datos.js (Excel). No editar a mano.\n")
        fh.write("window.PLANO_ESTACION = " + json.dumps(est, ensure_ascii=False) + ";\n")
        fh.write(PREFIJO + re.sub(r"\},\{", "},\n{", json.dumps(puntos, ensure_ascii=False, separators=(",", ":"))) + ";\n")
    print(f"Plano propio {e.nombre}: {len(puntos)} puntos ({sum(p['t'] == 'restaurante' for p in puntos)} restaurantes, "
          f"{sum(p['t'] == 'escuela' for p in puntos)} escuelas, {sum(p['t'] == 'tienda' for p in puntos)} tiendas)")
    # Un sector con puntos muy separados no se puede enseñar entero de cerca: al tocar su botón no se vería ninguno
    zonas = {}
    for p in puntos:
        zonas.setdefault((p["t"], p["z"]), []).append(p["c"])
    for (t, z), cs in zonas.items():
        km = math.hypot((max(c[0] for c in cs) - min(c[0] for c in cs)) * 111, (max(c[1] for c in cs) - min(c[1] for c in cs)) * 82)
        if km > 4:
            print(f"  Aviso: los puntos de tipo {t} de la zona {z} están muy separados ({km:.0f} km). Revisa la columna Zona del Excel.")
    if sin:
        print(f"  Sin coordenadas en el Excel (no salen en el plano): {len(sin)}: " + ", ".join(sin))
