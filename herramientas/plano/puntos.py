"""Genera plano/puntos.js: escuelas y restaurantes de Grandvalira con coordenadas, sacados de datos.js (que sale del Excel),
y el enlace de cada restaurante a su ficha en grandvalira.com. Lo ejecuta "Actualizar mapa.bat" cada vez que cambia el Excel.

El enlace sale de mapa_bonos/propuestas/Restaurantes - fichas oficiales (propuesta).xlsx (fichas "Segura" o "Probable").
Si esa tabla no está, se conservan los enlaces que ya tenía puntos.js."""
import json
import os
import re

from comun import PLANO, REPO

FICHAS = os.path.join(os.path.dirname(REPO), "propuestas", "Restaurantes - fichas oficiales (propuesta).xlsx")
WEB_ESCUELAS = "https://www.grandvalira.com/es/escuelas"

s = open(os.path.join(REPO, "datos.js"), encoding="utf-8").read()
datos = json.loads(s[s.index("{"):s.rindex("}") + 1])

destino = os.path.join(PLANO, "puntos.js")
if os.path.exists(FICHAS):
    import openpyxl
    web = {r[0]: r[4] for r in openpyxl.load_workbook(FICHAS, read_only=True).active.iter_rows(min_row=2, values_only=True)
           if r[0] and r[4] and r[5] in ("Segura", "Probable")}
else:
    print("Aviso: no encuentro la tabla de fichas oficiales; se conservan los enlaces anteriores.")
    web = {}
    if os.path.exists(destino):
        t = open(destino, encoding="utf-8").read()
        web = {p["id"]: p["w"] for p in json.loads(t[t.index("["):t.rindex("]") + 1]) if p.get("w")}

puntos, sin = [], []
for p in datos["puntos"]:
    if p["est"] != "GV" or p["tipo"] not in ("escuela", "restaurante"):
        continue
    if p.get("lat") is None:
        sin.append(p["nombre"] + (" (Express)" if p["express"] else " (Self)" if p["self"] else " (otros)"))
        continue
    puntos.append({"id": p["id"], "t": p["tipo"], "n": p["nombre"].replace("Escuela Grandvalira ", "Escuela "), "u": p.get("ubic", ""),
                   "z": p["zona"], "x": p["express"], "s": p["self"], "l": p.get("local", ""), "nota": p.get("nota", ""),
                   "c": [p["lat"], p["lng"]], "w": WEB_ESCUELAS if p["tipo"] == "escuela" else web.get(p["id"], "")})

with open(destino, "w", encoding="utf-8") as fh:
    fh.write("// Generado por herramientas/plano/puntos.py a partir de datos.js (Excel). No editar a mano.\n")
    fh.write("window.PLANO_PUNTOS = " + re.sub(r"\},\{", "},\n{", json.dumps(puntos, ensure_ascii=False, separators=(",", ":"))) + ";\n")
print(f"Plano propio: {len(puntos)} puntos ({sum(p['t'] == 'restaurante' for p in puntos)} restaurantes, {sum(p['t'] == 'escuela' for p in puntos)} escuelas)")
if sin:
    print(f"  Sin coordenadas en el Excel (no salen en el plano): {len(sin)}: " + ", ".join(sin))
