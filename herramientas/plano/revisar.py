"""Revisión automática del plano (necesita Playwright y Microsoft Edge): en cada tamaño de pantalla, la vista de entrada,
cada sector con cada filtro y vistas al azar. Mide sobre lo que se ve de verdad (cajas del DOM): nombres que se pisan,
nombres escondidos, burbujas cortadas, errores y archivos que fallan.
Uso: python herramientas/plano/revisar.py [PUERTO] [pantalla ...]   (sin pantallas: todas)
Resultados en herramientas/plano/cache/revision/."""
import json, os, random, subprocess, sys, time
from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "cache", "revision")
PANTALLAS = {
    "320x568": dict(viewport={"width": 320, "height": 568}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "360x640": dict(viewport={"width": 360, "height": 640}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "390x844": dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "412x915": dict(viewport={"width": 412, "height": 915}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "844x390": dict(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "768x1024": dict(viewport={"width": 768, "height": 1024}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "1366x768": dict(viewport={"width": 1366, "height": 768}),
    "1920x1080": dict(viewport={"width": 1920, "height": 1080}),
    "600x450": dict(viewport={"width": 600, "height": 450}),
}
AUDITAR = """() => {
  const C = mapa.getContainer().getBoundingClientRect(), W = C.width, H = C.height;
  const R = el => { const r = el.getBoundingClientRect(); return { l: r.left - C.left, t: r.top - C.top, r: r.right - C.left, b: r.bottom - C.top }; };
  const ov = (a, b, m) => a.l < b.r - m && a.r > b.l + m && a.t < b.b - m && a.b > b.t + m;
  const dentro = k => k.l >= 0 && k.r <= W && k.t >= 0 && k.b <= H;
  const gs = grupos.map(g => ({ n: g.ps.map(p => p.n).join('+'), pin: g.pin.getElement() ? R(g.pin.getElement().firstChild) : null,
                                 el: g.etq.getElement() ? g.etq.getElement().firstChild : null }));
  gs.forEach(g => { g.vis = g.el && !g.el.classList.contains('oculta'); if (g.vis) g.k = R(g.el); });
  const bur = burbujas.map(b => ({ n: b.getElement().textContent, k: R(b.getElement().firstChild) }));
  const fijos = [['zoom', R(document.querySelector('.leaflet-control-zoom'))]];
  const ley = document.getElementById('ley');
  if (getComputedStyle(ley).opacity === '1') fijos.push(['leyenda', R(ley)]);
  const s = [];
  const vis = gs.filter(g => g.vis);
  vis.forEach((a, i) => {
    vis.slice(i + 1).forEach(b => { if (ov(a.k, b.k, 0.5)) s.push('nombre/nombre: ' + a.n + ' | ' + b.n); });
    gs.forEach(b => { if (b.pin && ov(a.k, b.pin, 1.5)) s.push('nombre/pin: ' + a.n + ' | ' + b.n); });
    bur.forEach(b => { if (ov(a.k, b.k, 0.5)) s.push('nombre/burbuja: ' + a.n + ' | ' + b.n); });
    fijos.forEach(([n, k]) => { if (ov(a.k, k, 0.5)) s.push('nombre/' + n + ': ' + a.n); });
    if (!dentro(a.k)) s.push('nombre fuera: ' + a.n);
  });
  bur.forEach((a, i) => { bur.slice(i + 1).forEach(b => { if (ov(a.k, b.k, 1)) s.push('burbuja/burbuja: ' + a.n + ' | ' + b.n); }); });
  const burFuera = bur.filter(b => !dentro(b.k)).map(b => b.n);
  const pinsDentro = gs.filter(g => g.pin && dentro(g.pin));
  const ocultas = pinsDentro.filter(g => !g.vis).map(g => {
    const c = { x: (g.pin.l + g.pin.r) / 2, y: (g.pin.t + g.pin.b) / 2 };
    const borde = Math.min(c.x, W - c.x, c.y, H - c.y);
    return g.n + ' (a ' + Math.round(borde) + ' px del borde)';
  });
  const pinSolape = [];
  pinsDentro.forEach((a, i) => pinsDentro.slice(i + 1).forEach(b => { if (ov(a.pin, b.pin, 5)) pinSolape.push(a.n + ' | ' + b.n); }));
  return { z: mapa.getZoom(), burbujas: bur.length, burFuera, pines: pinsDentro.length, nombres: vis.length, ocultas, solapes: s, pinSolape };
}"""


def esperar(pg):
    pg.wait_for_function("window.listo === true")
    pg.wait_for_timeout(500)


def mover(pg, js):
    """Ejecuta algo que mueve el plano y espera a que termine (moveend) y se coloquen los nombres."""
    pg.evaluate("window.__fin = false; void mapa.once('moveend', () => setTimeout(() => window.__fin = true, 250));")
    pg.evaluate("void (" + js + ")")
    try:
        pg.wait_for_function("window.__fin === true", timeout=5000)
    except Exception:
        pass   # si no se movió (ya estaba ahí), seguimos
    pg.wait_for_timeout(150)


def main():
    puerto = sys.argv[1] if len(sys.argv) > 1 else "8790"
    nombres = sys.argv[2:] or list(PANTALLAS)
    os.makedirs(SALIDA, exist_ok=True)
    srv = subprocess.Popen([sys.executable, os.path.join(AQUI, "servidor.py"), puerto], cwd=AQUI, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    URL = f"http://127.0.0.1:{puerto}/plano/index.html"
    rnd = random.Random(42)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(channel="msedge", headless=True)
            for nombre in nombres:
                ctx = b.new_context(**PANTALLAS[nombre])
                pg = ctx.new_page()
                errores, fallos = [], []
                pg.on("pageerror", lambda e: errores.append(str(e)))
                pg.on("console", lambda m: m.type == "error" and errores.append("console: " + m.text))
                pg.on("response", lambda r: r.status >= 400 and fallos.append(f"{r.status} {r.url}"))
                pg.on("requestfailed", lambda r: fallos.append(f"falló {r.url} {r.failure}"))
                out = {"pantalla": nombre, "entrada": {}, "sectores": {}, "azar": [], "filas": {}}
                for etiqueta, q in (("express", ""), ("self", "?menu=self"), ("carta", "?menu=carta"), ("todos", "?menu=todos"), ("escuela", "?modo=escuela")):
                    t0 = time.time()
                    pg.goto(URL + q, wait_until="networkidle"); esperar(pg)
                    a = pg.evaluate(AUDITAR); a["seg"] = round(time.time() - t0, 2)
                    a["alto_plano"] = pg.evaluate("mapa.getSize().y")
                    out["entrada"][etiqueta] = a
                    if etiqueta in ("express", "escuela"):
                        pg.screenshot(path=os.path.join(SALIDA, f"{nombre}_entrada_{etiqueta}.png"))
                    out["filas"][etiqueta] = pg.evaluate("""[...document.querySelectorAll('.fila')].filter(f => f.offsetHeight).map(f => ({ id: f.id, cabe: f.scrollWidth <= f.clientWidth + 1,
                        visibles: [...f.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(), c = f.getBoundingClientRect(); return r.right <= c.right + 1; }).length,
                        total: f.querySelectorAll('button').length }))""")
                    sectores = pg.evaluate("[...document.querySelectorAll('.sectores button')].map(b => b.dataset.z)")
                    for s in sectores:
                        mover(pg, f"irA({json.dumps(s)})")
                        out["sectores"][f"{etiqueta}/{s}"] = pg.evaluate(AUDITAR)
                    # Vistas al azar dentro del relieve
                    for i in range(8):
                        z = round(rnd.uniform(12, 17) * 4) / 4
                        la, lo = rnd.uniform(42.525, 42.585), rnd.uniform(1.60, 1.74)
                        mover(pg, f"mapa.setView([{la}, {lo}], {z}, {{ animate: false }})")
                        a = pg.evaluate(AUDITAR); a["vista"] = f"{etiqueta} {la:.4f},{lo:.4f} z{z}"
                        out["azar"].append(a)
                out["errores"], out["fallos"] = errores, fallos
                json.dump(out, open(os.path.join(SALIDA, f"{nombre}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                tot = list(out["entrada"].values()) + list(out["sectores"].values()) + out["azar"]
                cortadas = sum(len(a["burFuera"]) for a in out["entrada"].values())
                reales = [f for f in fallos if "ERR_ABORTED" not in f]   # ERR_ABORTED = teselas que Leaflet cancela al hacer zoom: normal
                print(f"{nombre:9} vistas {len(tot)} | nombres que se pisan {sum(len(a['solapes']) for a in tot)} | nombres escondidos {sum(len(a['ocultas']) for a in tot)}"
                      f" | burbujas cortadas al entrar {cortadas} | errores {len(errores)} | archivos que fallan {len(reales)}", flush=True)
                ctx.close()
            b.close()
    finally:
        srv.terminate()


main()
