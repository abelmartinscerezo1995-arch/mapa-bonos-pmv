"""Servidor local para probar el plano: python herramientas/plano/servidor.py 8000  →  http://127.0.0.1:8000/plano/
(aguanta muchas peticiones a la vez; el de Python por defecto solo encola 5 y con las teselas se queda corto)."""
import functools
import http.server
import sys

from comun import REPO


class Servidor(http.server.ThreadingHTTPServer):
    request_queue_size = 256


h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO)
h.log_message = lambda *a: None
Servidor(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8000), h).serve_forever()
