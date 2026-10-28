"""Revisión automática del plano (necesita Playwright y Microsoft Edge): en cada tamaño de pantalla, la vista de entrada,
cada sector con cada filtro (y en Escuela y Alquiler), vistas al azar y, en Alquiler, saltos de una telecabina a otra. Mide sobre lo que se ve de verdad (cajas del DOM): nombres que se pisan,
nombres escondidos, burbujas cortadas, nombres encima de una telecabina (Alquiler), errores y archivos que fallan.
Uso: python herramientas/plano/revisar.py [GV PA ...] [pantalla ...] [puerto]   (sin estaciones: todas; sin pantallas: todas)
Resultados en herramientas/plano/cache/revision/."""
import json, os, random, subprocess, sys, time
from playwright.sync_api import sync_playwright

from comun import ESTACIONES, estacion

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
  if (getComputedStyle(ley).opacity === '1' && ley.offsetWidth) fijos.push(['leyenda', R(ley)]);
  // Pestaña Alquiler: los nombres de las tiendas no deben tapar los símbolos de telecabina / acceso a pistas
  document.querySelectorAll('#mapa .acceso').forEach(el => fijos.push(['telecabina ' + el.dataset.n, R(el)]));
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
    args = sys.argv[1:]
    estaciones = [a.upper() for a in args if a.upper() in ESTACIONES] or list(ESTACIONES)
    puerto = next((a for a in args if a.isdigit()), "8790")
    nombres = [a for a in args if a in PANTALLAS] or list(PANTALLAS)
    os.makedirs(SALIDA, exist_ok=True)
    srv = subprocess.Popen([sys.executable, os.path.join(AQUI, "servidor.py"), puerto], cwd=AQUI, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(channel="msedge", headless=True)
            for est, nombre in [(e, n) for e in estaciones for n in nombres]:
                URL = f"http://127.0.0.1:{puerto}/plano/index.html?e={est}"
                S, O, N, E = estacion(est).caja
                rnd = random.Random(42)
                ctx = b.new_context(**PANTALLAS[nombre])
                pg = ctx.new_page()
                errores, fallos = [], []
                pg.on("pageerror", lambda e: errores.append(str(e)))
                pg.on("console", lambda m: m.type == "error" and errores.append("console: " + m.text))
                pg.on("response", lambda r: r.status >= 400 and fallos.append(f"{r.status} {r.url}"))
                pg.on("requestfailed", lambda r: fallos.append(f"falló {r.url} {r.failure}"))
                out = {"estacion": est, "pantalla": nombre, "entrada": {}, "sectores": {}, "azar": [], "saltos": [], "filas": {}}
                menus = None
                for etiqueta, q in (("express", ""), ("self", "&menu=self"), ("carta", "&menu=carta"), ("todos", "&menu=todos"), ("escuela", "&modo=escuela"),
                                     ("alquiler", "&modo=alquiler")):
                    if menus is not None and etiqueta not in ("escuela", "alquiler") and etiqueta not in menus:
                        continue   # filtro que esta estación no tiene (p. ej. Self fuera de GV)
                    t0 = time.time()
                    pg.goto(URL + q, wait_until="networkidle"); esperar(pg)
                    if menus is None:
                        menus = pg.evaluate("Object.keys(MENUS)")
                    a = pg.evaluate(AUDITAR); a["seg"] = round(time.time() - t0, 2)
                    a["alto_plano"] = pg.evaluate("mapa.getSize().y")
                    out["entrada"][etiqueta] = a
                    if etiqueta in ("express", "escuela", "alquiler"):
                        pg.screenshot(path=os.path.join(SALIDA, f"{est}_{nombre}_entrada_{etiqueta}.png"))
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
                        la, lo = rnd.uniform(S, N), rnd.uniform(O, E)
                        mover(pg, f"mapa.setView([{la}, {lo}], {z}, {{ animate: false }})")
                        a = pg.evaluate(AUDITAR); a["vista"] = f"{etiqueta} {la:.4f},{lo:.4f} z{z}"
                        out["azar"].append(a)
                # Alquiler: saltar de un símbolo de telecabina a otro, de cerca y sin animación (así llega quien toca un sector
                # y luego otro). Leaflet recoloca los símbolos después de avisar del movimiento: ningún nombre debe quedar encima.
                accs = pg.evaluate("window.PLANO_CALLES ? PLANO_CALLES.accesos.map(a => [a.n, a.c]) : []")
                zmax = pg.evaluate("mapa.getMaxZoom()")
                for z in sorted({min(z, zmax) for z in (15, 16, 17)}):
                    for i, (n, (la, lo)) in enumerate(accs):
                        la0, lo0 = accs[i - 1][1]
                        mover(pg, f"mapa.setView([{la0}, {lo0}], {z}, {{ animate: false }})")
                        mover(pg, f"mapa.setView([{la}, {lo}], {z}, {{ animate: false }})")
                        a = pg.evaluate(AUDITAR); a["vista"] = f"alquiler salto {accs[i - 1][0]} -> {n} z{z}"
                        out["saltos"].append(a)
                out["errores"], out["fallos"] = errores, fallos
                json.dump(out, open(os.path.join(SALIDA, f"{est}_{nombre}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                tot = list(out["entrada"].values()) + list(out["sectores"].values()) + out["azar"] + out["saltos"]
                cortadas = sum(len(a["burFuera"]) for a in out["entrada"].values())
                reales = [f for f in fallos if "ERR_ABORTED" not in f]   # ERR_ABORTED = teselas que Leaflet cancela al hacer zoom: normal
                print(f"{est} {nombre:9} vistas {len(tot)} | nombres que se pisan {sum(len(a['solapes']) for a in tot)} | nombres escondidos {sum(len(a['ocultas']) for a in tot)}"
                      f" | burbujas cortadas al entrar {cortadas} | errores {len(errores)} | archivos que fallan {len(reales)}", flush=True)
                ctx.close()
            b.close()
    finally:
        srv.terminate()


main()
