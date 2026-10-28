"""Genera plano/<estación>/lineas.js: pistas (con zonas esquiables), remontes, carreteras y pueblos, a partir de lo descargado
de OpenStreetMap. Y plano/<estación>/calles.js, lo que solo sale en la pestaña Alquiler (se descarga al entrar en ella): las calles
de los pueblos y los símbolos de telecabina / acceso a pistas (comun.py, "accesos").
Solo hace falta repetirlo después de descargar.py (p. ej. cada temporada, para recoger pistas nuevas).
Uso: python herramientas/plano/lineas.py [GV PA ...]   (sin nada: todas las estaciones)"""
import json
import math
import os

from PIL import Image

from comun import CACHE, Z, cajas_calles, elegidas


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


def altura(lat, lon):
    """Metros sobre el mar en ese punto, del relieve descargado (teselas Terrarium de cache/dem)."""
    n = 2 ** Z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    im = Image.open(os.path.join(CACHE, "dem", f"{Z}_{int(x)}_{int(y)}.png")).convert("RGB")
    r, g, b = im.getpixel((int((x - int(x)) * 256), int((y - int(y)) * 256)))
    return r * 256 + g + b / 256 - 32768


def recortar(c, cajas):
    """Trozos de la línea que caen dentro de alguna caja (con un punto más a cada lado, para que lleguen hasta el borde)."""
    dentro = [any(s < p[0] < n and o < p[1] < e for s, o, n, e in cajas) for p in c]
    trozos, t = [], []
    for i, p in enumerate(c):
        if dentro[i] or (i + 1 < len(c) and dentro[i + 1]) or (i > 0 and dentro[i - 1]):
            t.append(p)
        elif t:
            trozos.append(t)
            t = []
    if t:
        trozos.append(t)
    return [t for t in trozos if len(t) > 1]


# Calles que no se dibujan: aparcamientos, entradas de garaje y similares (llenan el plano sin ayudar a orientarse)
SIN = {"parking_aisle", "driveway", "drive-through", "emergency_access"}
PRINCIPAL = ("trunk", "primary", "secondary")


def calles(est):
    cajas = cajas_calles(est)
    margen = [(s - .0015, o - .002, n + .0015, e + .002) for s, o, n, e in cajas]   # ~170 m más, para que no acaben de golpe
    c, p = [], []
    for w in json.load(open(os.path.join(est.cache, "calles.json"), encoding="utf-8"))["elements"]:
        t, g = w.get("tags", {}), w.get("geometry")
        hw = t.get("highway", "")
        if not g or t.get("service") in SIN or hw in ("trunk", "primary", "trunk_link", "primary_link"):
            continue   # las carreteras grandes van enteras, más abajo
        for trozo in recortar(coords(g, 1.5), margen):
            (p if hw.split("_")[0] in PRINCIPAL else c).append(trozo)
    # Carreteras grandes (como en lineas.js, pero con más detalle: en Alquiler se ven de cerca, con las calles)
    extra = json.load(open(os.path.join(est.cache, "extra.json"), encoding="utf-8"))["elements"]
    p += [coords(w["geometry"], 2) for w in extra if w["type"] == "way" and w.get("tags", {}).get("highway") in ("trunk", "primary")]

    # Telecabinas y accesos a pistas: en la estación de abajo del remonte
    remontes = {w["id"]: w for w in json.load(open(os.path.join(est.cache, "pistas.json"), encoding="utf-8"))["elements"]}
    accesos = []
    for a in est.accesos:
        w = remontes.get(a["osm"])
        if not w:
            raise SystemExit(f"{est.nombre}: no encuentro en OpenStreetMap el remonte {a['osm']} ({a['n']}). Revisa 'accesos' en comun.py.")
        ini, fin = w["geometry"][0], w["geometry"][-1]
        abajo = min((ini, fin), key=lambda q: altura(q["lat"], q["lon"]))
        accesos.append({"t": a["tipo"], "n": a["n"], "d": a["d"], "c": [round(abajo["lat"], 5), round(abajo["lon"], 5)]})
        print(f"  {a['n']}: {w['tags'].get('name', '')} · {accesos[-1]['c']} · {altura(abajo['lat'], abajo['lon']):.0f} m")

    out = {"calles": c, "principales": p, "accesos": accesos}
    f = os.path.join(est.plano, "calles.js")
    with open(f, "w", encoding="utf-8") as fh:
        fh.write("// Generado por herramientas/plano/lineas.py a partir de OpenStreetMap. No editar a mano. Solo lo usa la pestaña Alquiler.\n")
        fh.write("window.PLANO_CALLES = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(est.nombre, "calles:", len(c), "trozos de calle,", len(p), "carreteras,", len(accesos), "accesos,", os.path.getsize(f) // 1024, "KB")


for est in elegidas():
    lineas(est)
    if os.path.exists(os.path.join(est.cache, "calles.json")):
        calles(est)
    else:
        print(f"  {est.nombre}: falta cache/{est.cod}/calles.json (ejecuta descargar.py): no se generan las calles")
