"""Descarga lo que necesita el plano propio (una vez por temporada, o si cambian las pistas):
  - relieve: teselas de elevación Terrarium (AWS Terrain Tiles, z14)
  - OpenStreetMap: pistas y remontes, pueblos y carreteras, bosques y lagos
Todo va a herramientas/plano/cache/. Después: relieve.py (solo si quieres rehacer el relieve) y lineas.py."""
import json
import os
import subprocess
import time

from comun import CACHE, ESTE, NORTE, OESTE, SUR, X0, X1, Y0, Y1, Z

os.makedirs(os.path.join(CACHE, "dem"), exist_ok=True)
n = 0
for x in range(X0, X1 + 1):
    for y in range(Y0, Y1 + 1):
        f = os.path.join(CACHE, "dem", f"{Z}_{x}_{y}.png")
        if not os.path.exists(f):
            subprocess.run(["curl", "-sS", "-o", f, f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png"], check=True)
            n += 1
print("Relieve: teselas nuevas", n)

# Overpass pide identificarse (sin User-Agent responde 406) y a veces está lleno: se reintenta y se prueba otro servidor
UA = "mapa-bonos-grandvalira/1.0"
SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
CONSULTAS = {
    "pistas.json": 'way["piste:type"]({b}); way["aerialway"]({b});',
    "extra.json": 'node["place"~"town|village|hamlet"]({b}); way["highway"~"trunk|primary|secondary"]({b});',
    "bosque.json": 'way["natural"="wood"]({b}); way["landuse"="forest"]({b}); relation["natural"="wood"]({b}); relation["landuse"="forest"]({b});'
                   ' way["natural"="water"]({b}); relation["natural"="water"]({b});',
}
caja = f"{SUR - .01},{OESTE - .01},{NORTE + .01},{ESTE + .01}"
for nombre, cuerpo in CONSULTAS.items():
    q = "[out:json][timeout:180];(" + cuerpo.format(b=caja) + ");out geom;"
    destino, tmp = os.path.join(CACHE, nombre), os.path.join(CACHE, nombre + ".tmp")
    for intento in range(6):
        url = SERVIDORES[intento % 2]
        subprocess.run(["curl", "-sS", "-A", UA, "-o", tmp, "--data-urlencode", "data=" + q, url], check=False)
        try:
            n = len(json.load(open(tmp, encoding="utf-8"))["elements"])
        except Exception:
            print(f"  {nombre}: {url} no ha respondido bien, reintento en {15 * (intento + 1)} s")
            time.sleep(15 * (intento + 1))
            continue
        os.replace(tmp, destino)
        print(f"OpenStreetMap {nombre}: {n} elementos")
        break
    else:
        raise SystemExit(f"No se ha podido descargar {nombre}. Prueba más tarde (se conserva la descarga anterior).")
