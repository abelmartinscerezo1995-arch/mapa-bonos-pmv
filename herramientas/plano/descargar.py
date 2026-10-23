"""Descarga lo que necesita el plano propio (una vez por temporada, o si cambian las pistas):
  - relieve: teselas de elevación Terrarium (AWS Terrain Tiles, z14)
  - OpenStreetMap: pistas y remontes, pueblos y carreteras, bosques y lagos
Todo va a herramientas/plano/cache/. Después: relieve.py (solo si quieres rehacer el relieve) y lineas.py.
Uso: python herramientas/plano/descargar.py [GV PA ...]   (sin nada: todas las estaciones)"""
import json
import os
import subprocess
import time

from comun import CACHE, Z, elegidas

# Overpass pide identificarse (sin User-Agent responde 406) y a veces está lleno: se reintenta y se prueba otro servidor
UA = "mapa-bonos-grandvalira/1.0"
SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
CONSULTAS = {
    "pistas.json": 'way["piste:type"]({b}); way["aerialway"]({b});',
    "extra.json": 'node["place"~"town|village|hamlet"]({b}); way["highway"~"trunk|primary|secondary"]({b});',
    "bosque.json": 'way["natural"="wood"]({b}); way["landuse"="forest"]({b}); relation["natural"="wood"]({b}); relation["landuse"="forest"]({b});'
                   ' way["natural"="water"]({b}); relation["natural"="water"]({b});',
}


def relieve(e):
    os.makedirs(os.path.join(CACHE, "dem"), exist_ok=True)
    n = 0
    for x in range(e.x0, e.x1 + 1):
        for y in range(e.y0, e.y1 + 1):
            f = os.path.join(CACHE, "dem", f"{Z}_{x}_{y}.png")
            if not os.path.exists(f):
                # -f: si el servidor da error no se guarda nada; .tmp: una descarga cortada no se queda como buena
                subprocess.run(["curl", "-fsS", "-o", f + ".tmp", f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png"], check=True)
                os.replace(f + ".tmp", f)
                n += 1
    print("Relieve: teselas nuevas", n)


def osm(e):
    os.makedirs(e.cache, exist_ok=True)
    caja = f"{e.sur - .01},{e.oeste - .01},{e.norte + .01},{e.este + .01}"
    for nombre, cuerpo in CONSULTAS.items():
        q = "[out:json][timeout:180];(" + cuerpo.format(b=caja) + ");out geom;"
        destino, tmp = os.path.join(e.cache, nombre), os.path.join(e.cache, nombre + ".tmp")
        for intento in range(6):
            url = SERVIDORES[intento % 2]
            subprocess.run(["curl", "-sS", "-A", UA, "-o", tmp, "--data-urlencode", "data=" + q, url], check=False)
            try:
                d = json.load(open(tmp, encoding="utf-8"))
                n = len(d["elements"])
                # Saturado, Overpass a veces responde "bien" pero vacío y con el error en "remark": no se da por buena
                if not n or "error" in d.get("remark", ""):
                    raise ValueError(d.get("remark", "sin elementos"))
            except Exception:
                print(f"  {nombre}: {url} no ha respondido bien, reintento en {15 * (intento + 1)} s")
                time.sleep(15 * (intento + 1))
                continue
            os.replace(tmp, destino)
            print(f"OpenStreetMap {nombre}: {n} elementos")
            break
        else:
            raise SystemExit(f"No se ha podido descargar {nombre}. Prueba más tarde (se conserva la descarga anterior).")


for e in elegidas():
    print(f"== {e.nombre} ==")
    relieve(e)
    osm(e)
