"""Rutas y zona del plano propio de Grandvalira (lo usan los demás programas de esta carpeta)."""
import math
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
PLANO = os.path.join(REPO, "plano")              # lo que se publica
CACHE = os.path.join(AQUI, "cache")              # descargas (no se suben a git)

# Zona del relieve: teselas z14 de x 8262 a 8273 y de y 6041 a 6054 (de Encamp a Pas de la Casa, con margen
# para que en el móvil se pueda alejar hasta ver toda la estación sin bandas vacías).
# Si se cambia, hay que cambiar también REL en plano/index.html.
Z, X0, Y0, X1, Y1 = 14, 8262, 6041, 8273, 6054


def t2ll(x, y, z=Z):
    """Esquina noroeste de la tesela (x, y) de zoom z, en latitud y longitud."""
    n = 2 ** z
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n)))), x / n * 360 - 180


NORTE, OESTE = t2ll(X0, Y0)
SUR, ESTE = t2ll(X1 + 1, Y1 + 1)
