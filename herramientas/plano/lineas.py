"""Genera plano/<estación>/lineas.js: pistas (con zonas esquiables), remontes, carreteras y pueblos, a partir de lo descargado
de OpenStreetMap. Solo hace falta repetirlo después de descargar.py (p. ej. cada temporada, para recoger pistas nuevas).
Uso: python herramientas/plano/lineas.py [GV PA ...]   (sin nada: todas las estaciones)"""
import json
import math
import os

from comun import elegidas


def dentro(g, caja):
    """¿Cae el centro de la línea dentro de la estación?"""
    s, o, n, e = caja
    return s < sum(p["lat"] for p in g) / len(g) < n and o < sum(p["lon"] for p in g) / len(g) < e


def coords(g, tol=0):
    """Coordenadas redondeadas a 5 decimales (~1 m) y, si se da tol, sin los vértices que se apartan menos de tol metros de la línea."""
    c = [[round(p["lat"], 5), round(p["lon"], 5)] for p in g]
    return simplificar(c, tol) if tol else c


def simplificar(c, tol):
    """Douglas-Peucker en metros: deja solo los vértices que cambian el dibujo más de tol (a zoom 16,5, 1 px ≈ 1,2 m)."""
    if len(c) < 3:
        return c
    P = [(p[0] * 111000, p[1] * 82000) for p in c]
    deja = [False] * len(c)
    deja[0] = deja[-1] = True
    pila = [(0, len(c) - 1)]
    while pila:
        a, b = pila.pop()
        (ax, ay), (bx, by) = P[a], P[b]
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        dmax, imax = 0, None
        for i in range(a + 1, b):
            px, py = P[i]
            t = 0 if l2 == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
            d = math.hypot(px - ax - t * dx, py - ay - t * dy)
            if d > dmax:
                dmax, imax = d, i
        if imax is not None and dmax > tol:
            deja[imax] = True
            pila += [(a, imax), (imax, b)]
    return [p for p, k in zip(c, deja) if k]


def largo(c):
    return sum(math.dist((a[0] * 111000, a[1] * 82000), (b[0] * 111000, b[1] * 82000)) for a, b in zip(c, c[1:]))


def lineas(est):
    pistas, zonas, remontes = [], [], []
    for e in json.load(open(os.path.join(est.cache, "pistas.json"), encoding="utf-8"))["elements"]:
        t, g = e.get("tags", {}), e.get("geometry")
        if not g or not dentro(g, est.caja):
            continue
        if t.get("piste:type") == "downhill":
            dif = t.get("piste:difficulty") or "?"
            if g[0] == g[-1] or t.get("area") == "yes":
                zonas.append({"d": dif, "c": coords(g, 8)})   # zona: relleno muy tenue, no necesita detalle
            else:
                c = coords(g, 1.5)
                nombre = t.get("piste:name") or t.get("name") or ""
                # k = tramo corto sin nombre (enlaces entre pistas): solo se dibuja de cerca
                pistas.append({"d": dif, "n": nombre, "k": int(not nombre and largo(c) < 250), "c": c})
        elif t.get("aerialway") and t["aerialway"] != "station":
            remontes.append({"t": t["aerialway"], "n": t.get("name") or "", "c": coords(g, 1)})

    extra = json.load(open(os.path.join(est.cache, "extra.json"), encoding="utf-8"))["elements"]
    carreteras = [coords(e["geometry"], 10) for e in extra if e["type"] == "way" and e.get("tags", {}).get("highway") in ("trunk", "primary")]
    pueblos = [{"n": est.pueblos[e["tags"]["name"]], "c": [e["lat"], e["lon"]]}
               for e in extra if e["type"] == "node" and e["tags"].get("name") in est.pueblos]

    out = {"pistas": pistas, "zonas": zonas, "remontes": remontes, "carreteras": carreteras, "pueblos": pueblos}
    os.makedirs(est.plano, exist_ok=True)
    f = os.path.join(est.plano, "lineas.js")
    with open(f, "w", encoding="utf-8") as fh:
        fh.write("// Generado por herramientas/plano/lineas.py a partir de OpenStreetMap. No editar a mano.\n")
        fh.write("window.PLANO_LINEAS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(est.nombre, {k: len(v) for k, v in out.items()}, os.path.getsize(f) // 1024, "KB")


for est in elegidas():
    lineas(est)
