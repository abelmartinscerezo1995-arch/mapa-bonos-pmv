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
        # solo tienen tiendas de alquiler, y Encamp – Funicamp, el restaurante de la base del Funicamp, en el pueblo)
        sectores=["Encamp", "Encamp – Solanelles", "Encamp – Funicamp", "Canillo", "El Tarter", "Soldeu", "Bordes d'Envalira", "Grau Roig",
                  "Peretol", "Pas de la Casa"],
        # Por debajo de este zoom, en Dónde comer y Alquiler los puntos van en una burbuja por sector (estación grande: más alto)
        burbujas=13.75,
        escuelas="https://www.grandvalira.com/es/escuelas",
    ),
    "PA": dict(
        nombre="Pal Arinsal",
        zona=(8254, 6043, 8263, 6052),
        caja=(42.515, 1.420, 42.595, 1.540),
        pueblos={"Arinsal": "Arinsal", "Pal": "Pal", "La Massana": "La Massana"},
        sectores=["Pal", "Arinsal", "La Massana"],   # La Massana: solo tiendas de alquiler
        burbujas=13,
        escuelas="https://www.palarinsal.com/es/clases-escuelas/escuela-invierno",
    ),
    "OA": dict(
        nombre="Ordino Arcalís",
        zona=(8256, 6039, 8263, 6046),
        caja=(42.600, 1.440, 42.670, 1.540),
        pueblos={"el Serrat": "El Serrat", "Llorts": "Llorts"},
        sectores=["Ordino Arcalís"],
        burbujas=13,
        escuelas="https://www.ordinoarcalis.com/es/escuela",
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


def elegidas():
    """Las estaciones que se piden al ejecutar el programa (p. ej. "python lineas.py PA"); sin nada, todas."""
    pedidas = [a.upper() for a in sys.argv[1:]]
    malas = [a for a in pedidas if a not in ESTACIONES]
    if malas:
        raise SystemExit(f"No conozco la estación {', '.join(malas)}. Las que hay: {', '.join(ESTACIONES)}")
    return [estacion(c) for c in pedidas or ESTACIONES]
