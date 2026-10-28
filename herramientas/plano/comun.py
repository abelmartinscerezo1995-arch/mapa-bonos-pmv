"""Estaciones y rutas del plano propio (lo usan los demás programas de esta carpeta).

Cada programa trabaja con las estaciones que le digas (python herramientas/plano/lineas.py PA) o, sin decir nada, con todas.
Para añadir una estación: copia un bloque de ESTACIONES, cambia sus datos, ejecuta descargar.py, relieve.py, lineas.py y puntos.py
con su código y añade su código y nombre a ESTACIONES en plano/index.html (son los botones de arriba)."""
import math
import os
import sys
from types import SimpleNamespace

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
PLANO = os.path.join(REPO, "plano")              # lo que se publica (una carpeta por estación)
CACHE = os.path.join(AQUI, "cache")              # descargas (no se suben a git)
Z = 14                                           # zoom de las teselas de elevación

ESTACIONES = {
    "GV": dict(
        nombre="Grandvalira",
        # Teselas z14 que cubre el relieve (x desde, y desde, x hasta, y hasta): de Encamp a Pas de la Casa, con margen para que
        # en el móvil se pueda alejar hasta ver toda la estación sin bandas vacías
        zona=(8262, 6041, 8273, 6054),
        # Solo se dibujan las pistas y remontes cuyo centro cae aquí (sur, oeste, norte, este), y las tiendas de alquiler que caen aquí
        caja=(42.515, 1.570, 42.605, 1.765),
        # Pueblos que salen en el plano: nombre en OpenStreetMap → cómo se escribe en el plano
        pueblos={"Encamp": "Encamp", "Canillo": "Canillo", "el Tarter": "El Tarter", "Soldeu": "Soldeu", "Grau Roig": "Grau Roig",
                 "Pas de la Casa": "Pas de la Casa"},
        # Botones de sector, en este orden (como en la columna Zona del Excel; Encamp – Solanelles y Bordes d'Envalira
        # solo tienen tiendas de alquiler, y Encamp – Funicamp, el restaurante de la base del Funicamp, en el pueblo).
        # Peretol ya no es sector: su único restaurante (Bordes 1957) va con Encamp (decidido el 28-oct-2026)
        sectores=["Encamp", "Encamp – Solanelles", "Encamp – Funicamp", "Canillo", "El Tarter", "Soldeu", "Bordes d'Envalira", "Grau Roig",
                  "Pas de la Casa"],
        # Por debajo de este zoom, en Dónde comer y Alquiler los puntos van en una burbuja por sector (estación grande: más alto)
        burbujas=13.75,
        escuelas="https://www.grandvalira.com/es/escuelas",
        # Pestaña Alquiler: dónde se sube a pistas desde el pueblo. Cada uno es un remonte de OpenStreetMap (su número de vía, "way")
        # y el símbolo va en su estación de abajo. tipo "telecabina" = símbolo de telecabina; "pie" = pistas a pie de pueblo.
        accesos=[
            dict(osm=52172905, tipo="telecabina", n="Telecabina Funicamp", d="Subida a pistas desde Encamp"),   # TC Funicamp 1
            dict(osm=6563683, tipo="telecabina", n="Telecabina de Canillo", d="Subida a pistas desde el pueblo"),   # TC8 Canillo
            dict(osm=52110420, tipo="telecabina", n="Telecabina de El Tarter", d="Subida a pistas desde el pueblo"),   # TC10 Tarter
            dict(osm=6561468, tipo="telecabina", n="Telecabina de Soldeu", d="Subida a pistas desde el pueblo"),   # TC8 Soldeu
            dict(osm=48957249, tipo="pie", n="Acceso a pistas de Grau Roig", d="Pistas a pie de pueblo: aquí salen los remontes"),   # TSD6 Pic Blanc
            dict(osm=52174946, tipo="pie", n="Acceso a pistas de Pas de la Casa", d="Pistas a pie de pueblo: aquí salen los remontes"),   # TSD4 Pas de la Casa
        ],
    ),
    "PA": dict(
        nombre="Pal Arinsal",
        zona=(8254, 6043, 8263, 6052),
        caja=(42.515, 1.420, 42.595, 1.540),
        pueblos={"Arinsal": "Arinsal", "Pal": "Pal", "La Massana": "La Massana"},
        sectores=["Pal", "Arinsal", "La Massana"],   # La Massana: solo tiendas de alquiler
        burbujas=13,
        escuelas="https://www.palarinsal.com/es/clases-escuelas/escuela-invierno",
        accesos=[
            dict(osm=29376356, tipo="telecabina", n="Telecabina de Arinsal", d="Subida a pistas desde el pueblo (Els Orriols)"),   # els Orriols
            dict(osm=29376254, tipo="telecabina", n="Telecabina de La Massana", d="Subida a pistas desde el pueblo"),   # Telecabina La Massana
        ],
    ),
    "OA": dict(
        nombre="Ordino Arcalís",
        zona=(8256, 6039, 8263, 6046),
        caja=(42.600, 1.440, 42.670, 1.540),
        pueblos={"el Serrat": "El Serrat", "Llorts": "Llorts"},
        sectores=["Ordino Arcalís"],
        burbujas=13,
        escuelas="https://www.ordinoarcalis.com/es/escuela",
        accesos=[],   # ningún remonte sale de un pueblo: todos salen de la base de la estación (La Coma, a 1.940 m)
    ),
}


def t2ll(x, y, z=Z):
    """Esquina noroeste de la tesela (x, y) de zoom z, en latitud y longitud."""
    n = 2 ** z
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n)))), x / n * 360 - 180


def estacion(cod):
    """Datos de una estación, con sus carpetas y los bordes del relieve en latitud y longitud."""
    e = SimpleNamespace(cod=cod, **ESTACIONES[cod])
    e.plano, e.cache = os.path.join(PLANO, cod), os.path.join(CACHE, cod)
    e.x0, e.y0, e.x1, e.y1 = e.zona
    e.norte, e.oeste = t2ll(e.x0, e.y0)
    e.sur, e.este = t2ll(e.x1 + 1, e.y1 + 1)
    return e


def cajas_calles(e):
    """Zonas de las que se dibujan las calles en la pestaña Alquiler (sur, oeste, norte, este): alrededor de cada pueblo del plano
    (los pueblos grandes, más) y de cada grupo de tiendas de alquiler. Necesita extra.json (descargar.py) y datos.js (Excel)."""
    import json
    cajas = []
    extra = json.load(open(os.path.join(e.cache, "extra.json"), encoding="utf-8"))["elements"]
    for p in extra:
        if p["type"] == "node" and p["tags"].get("name") in e.pueblos:
            r = 900 if p["tags"].get("place") == "town" else 600   # metros
            cajas.append((p["lat"] - r / 111000, p["lon"] - r / 82000, p["lat"] + r / 111000, p["lon"] + r / 82000))
    t = open(os.path.join(REPO, "datos.js"), encoding="utf-8").read()
    s, o, n, es = e.caja
    grupos = {}
    for p in json.loads(t[t.index("{"):t.rindex("}") + 1])["puntos"]:
        if p["tipo"] == "tienda" and p.get("lat") is not None and s < p["lat"] < n and o < p["lng"] < es:
            grupos.setdefault(p["zona"], []).append((p["lat"], p["lng"]))
    for cs in grupos.values():
        cajas.append((min(c[0] for c in cs) - 300 / 111000, min(c[1] for c in cs) - 300 / 82000,
                      max(c[0] for c in cs) + 300 / 111000, max(c[1] for c in cs) + 300 / 82000))
    return [tuple(round(v, 5) for v in c) for c in cajas]


def elegidas():
    """Las estaciones que se piden al ejecutar el programa (p. ej. "python lineas.py PA"); sin nada, todas."""
    pedidas = [a.upper() for a in sys.argv[1:]]
    malas = [a for a in pedidas if a not in ESTACIONES]
    if malas:
        raise SystemExit(f"No conozco la estación {', '.join(malas)}. Las que hay: {', '.join(ESTACIONES)}")
    return [estacion(c) for c in pedidas or ESTACIONES]
