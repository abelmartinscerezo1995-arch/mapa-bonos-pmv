/*!
 * Mapa de los bonos · widget embebible (v0.2)
 *
 * Uso en cualquier web:
 *   <div data-mapa-bonos data-estacion="GV" data-servicios="c,m,a" data-menu="express"></div>
 *   <script src="https://abelmartinscerezo1995-arch.github.io/mapa-bonos-pmv/mapa-bonos.js" defer></script>
 *
 * Atributos (todos opcionales):
 *   data-estacion     GV | PA | OA                         (GV)
 *   data-servicios    c (clases), m (menú), a (alquiler)    (c,m,a)  Con uno solo no se muestran pestañas.
 *   data-menu         express | self (self solo en GV)      (express)
 *   data-ver          pestaña inicial: escuela | comer | alquiler
 *   data-zona         abre las tiendas acercado a una población (p. ej. "Pas de la Casa")
 *   data-marca        filtra las tiendas por marca (p. ej. "Pic Negre")
 *   data-resumen      no → oculta el recuadro de texto de cada pestaña
 *   data-condiciones  no → oculta el desplegable de condiciones
 *   data-alto         alto del mapa (CSS), p. ej. "480px"
 *   data-datos        URL de los datos (por defecto, datos.js junto a este script)
 *   data-leer-url     si → toma estacion/servicios/menu/ver/zona/marca de la dirección de la página
 *
 * También desde JS:  MapaBonos.montar(elemento, { estacion: 'PA', servicios: 'a' })
 * Carga Leaflet por su cuenta si la página no lo tiene. Estilos con prefijo "mb-" para no chocar con la web.
 */
(function () {
  'use strict';
  if (window.MapaBonos) return;

  var SCRIPT = document.currentScript;
  var BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^\/?#]*([?#].*)?$/, '') : '';
  var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  var LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';

  // ---------- Configuración ----------
  var ZONAS_GV = ['Encamp', 'Encamp – Solanelles (pistas)', 'Canillo', 'El Tarter', 'Soldeu', "Bordes d'Envalira",
    'Grau Roig', 'Pas de la Casa', 'La Massana', 'Pal', 'Arinsal', 'Ordino Arcalís'];
  var ZONAS_PA = ['La Massana', 'Pal', 'Arinsal', 'Ordino Arcalís', 'Encamp', 'Encamp – Solanelles (pistas)', 'Canillo',
    'El Tarter', 'Soldeu', "Bordes d'Envalira", 'Grau Roig', 'Pas de la Casa'];
  var ZONAS_OA = ['Ordino Arcalís', 'La Massana', 'Pal', 'Arinsal', 'Encamp', 'Encamp – Solanelles (pistas)', 'Canillo',
    'El Tarter', 'Soldeu', "Bordes d'Envalira", 'Grau Roig', 'Pas de la Casa'];
  var ESTACIONES = {
    GV: { nombre: 'Grandvalira', img: 'img/plano_GV.jpg', self: true, ordenTiendas: ZONAS_GV,
      inicio: '2 días: empiezan en sábado. 3 o más días: en lunes (en Soldeu y El Tarter, también en sábado).' },
    PA: { nombre: 'Pal Arinsal', img: 'img/plano_PA.jpg', self: false, ordenTiendas: ZONAS_PA,
      inicio: '2 días: empiezan en sábado. 3 o más días: en lunes o en sábado.' },
    OA: { nombre: 'Ordino Arcalís', img: 'img/plano_OA.jpg', self: false, ordenTiendas: ZONAS_OA,
      inicio: '2 días: empiezan en sábado. 3 o más días: en lunes.' }
  };
  var LADO_ZONA = { 'Pas de la Casa': 'top', 'Grau Roig': 'bottom', "Bordes d'Envalira": 'right', 'Soldeu': 'top', 'El Tarter': 'left',
    'Canillo': 'left', 'Encamp': 'bottom', 'Encamp – Solanelles (pistas)': 'left', 'La Massana': 'right', 'Pal': 'bottom',
    'Arinsal': 'top', 'Ordino Arcalís': 'right' };
  var NOMBRE_CORTO_ZONA = { 'Encamp – Solanelles (pistas)': 'Solanelles (en pistas)' };
  var MARCAS = {
    'Pic Negre': { c: '#1f1f1f', t: 'PN' }, 'Viladomat': { c: '#c62828', t: 'V' }, 'Shusski': { c: '#1565c0', t: 'S' },
    'Esports Pirot': { c: '#e67700', t: 'EP' }, 'Skiset': { c: '#a61e4d', t: 'SK' }, 'Esports Rossell': { c: '#2b8a3e', t: 'R' },
    'Sports Calbó': { c: '#6741d9', t: 'C' }, 'Sant Moritz': { c: '#6d4c41', t: 'SM' }
  };
  var ICON = {
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 22V3h2v1.2l10 .1-2.6 4.2L18 13H8v9z"/></svg>',
    fork: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h1.5v6.5h1V2H11v6.5h1V2h1.5v7.5A2.5 2.5 0 0 1 11 12v10H9V12a2.5 2.5 0 0 1-2-2.5zM18 2v20h-2v-7h-2V7c0-2.8 1.8-5 4-5z"/></svg>',
    boot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h7v8l5 4v4H5v-2h2zM3 20h18v2H3z"/></svg>'
  };

  var CSS = [
    '.mb{--mb-ink:#17202b;--mb-muted:#5a6573;--mb-line:#dfe5ec;--mb-bg:#f4f6f9;--mb-card:#fff;--mb-accent:#0a6ebd;--mb-express:#d9480f;',
    '--mb-self:#2b8a3e;--mb-no:#98a2ae;--mb-brand:#0b2b4c;--mb-radius:12px;color:var(--mb-ink);font-size:15px;line-height:1.5;text-align:left}',
    '.mb *,.mb *::before,.mb *::after{box-sizing:border-box}',
    '.mb button,.mb select,.mb input{font:inherit;letter-spacing:normal;text-transform:none}',
    '.mb .mb-tabs{display:flex;gap:6px;margin:0 0 12px;overflow-x:auto}',
    '.mb .mb-tab{flex:1 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--mb-line);background:var(--mb-card);color:var(--mb-ink);padding:10px 14px;border-radius:10px;cursor:pointer;font-weight:600;margin:0;line-height:1.3}',
    '.mb .mb-tab svg{width:18px;height:18px}',
    '.mb .mb-tab[aria-selected="true"]{background:var(--mb-accent);border-color:var(--mb-accent);color:#fff}',
    '.mb .mb-panel[hidden]{display:none!important}',
    '.mb .mb-card{background:var(--mb-card);border:1px solid var(--mb-line);border-radius:var(--mb-radius);padding:14px 16px;margin:0 0 12px}',
    '.mb .mb-h{margin:0 0 6px;font-size:18px;line-height:1.3;font-weight:700;color:var(--mb-ink)}',
    '.mb ul.mb-puntos{margin:0;padding-left:18px;list-style:disc}',
    '.mb ul.mb-puntos li{margin:2px 0}',
    '.mb .mb-muted{color:var(--mb-muted)}',
    '.mb .mb-controles{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}',
    '.mb .mb-seg{display:inline-flex;border:1px solid var(--mb-line);border-radius:10px;overflow:hidden;background:var(--mb-card)}',
    '.mb .mb-seg button{border:0;background:transparent;padding:7px 12px;cursor:pointer;color:var(--mb-ink);margin:0}',
    '.mb .mb-seg button[aria-pressed="true"]{background:var(--mb-ink);color:#fff}',
    '.mb .mb-filtro{border:1px solid var(--mb-line);background:var(--mb-card);border-radius:999px;padding:5px 12px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:6px;color:var(--mb-ink);margin:0}',
    '.mb .mb-filtro[aria-pressed="true"]{border-color:var(--mb-ink);box-shadow:inset 0 0 0 1px var(--mb-ink);font-weight:600}',
    '.mb .mb-filtro i{width:10px;height:10px;border-radius:50%;display:inline-block}',
    '.mb .mb-link{border:0;background:none;color:var(--mb-accent);cursor:pointer;padding:0;font-weight:600}',
    '.mb .mb-mapa{height:var(--mb-alto,62vh);min-height:340px;max-height:620px;border-radius:var(--mb-radius);border:1px solid var(--mb-line);overflow:hidden;background:#e9eef3;position:relative;z-index:0}',
    '.mb .leaflet-container{font:inherit}',
    '.mb .mb-aviso{background:rgba(23,32,43,.85);color:#fff;font-size:12.5px;padding:4px 10px;border-radius:999px}',
    '.mb .mb-pin{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);position:relative}',
    '.mb .mb-pin svg{width:18px;height:18px}',
    '.mb .mb-pin b{position:absolute;top:-7px;right:-9px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--mb-ink);color:#fff;font-size:12px;line-height:20px;text-align:center;border:2px solid #fff}',
    '.mb .mb-pin.escuela{background:var(--mb-accent)}',
    '.mb .mb-pin.rest{background:var(--mb-express)}',
    '.mb .mb-pin.rest.selfm{background:var(--mb-self)}',
    '.mb .mb-pin.rest.no{background:var(--mb-no)}',
    '.mb .mb-pin.tienda{width:30px;height:30px;font-size:11px;font-weight:700;letter-spacing:-.02em}',
    '.mb .mb-burbuja{border-radius:50%;display:grid;place-items:center;background:var(--mb-brand);color:#fff;font-weight:700;font-size:16px;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);cursor:pointer}',
    '.mb .leaflet-tooltip.mb-etq{background:rgba(255,255,255,.95);border:0;box-shadow:0 1px 3px rgba(0,0,0,.3);font-weight:600;font-size:12.5px;padding:2px 7px;color:var(--mb-ink)}',
    '.mb .leaflet-tooltip.mb-etq::before{display:none}',
    '.mb .leaflet-popup-content{margin:12px 14px;font-size:14px;line-height:1.45}',
    '.mb .mb-pop h4{margin:0 0 4px;font-size:15px;line-height:1.3}',
    '.mb .mb-pop ul{margin:6px 0 0;padding:0;list-style:none}',
    '.mb .mb-pop li{padding:6px 0;border-top:1px solid var(--mb-line)}',
    '.mb .mb-pop small{color:var(--mb-muted);display:block}',
    '.mb .mb-pop p{margin:6px 0 0}',
    '.mb .mb-pop a.mb-ir{display:inline-block;margin-top:8px;font-weight:600;color:var(--mb-accent)}',
    '.mb .mb-b{display:inline-block;font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:999px;color:#fff;vertical-align:1px;white-space:nowrap;margin-left:4px}',
    '.mb .mb-b.exp{background:var(--mb-express)}',
    '.mb .mb-b.self{background:var(--mb-self)}',
    '.mb .mb-b.no{background:#eef1f4;color:var(--mb-muted)}',
    '.mb .mb-b.partner{background:#fff3bf;color:#7a5b00}',
    '.mb .mb-lista{margin-top:12px}',
    '.mb .mb-grupo{background:var(--mb-card);border:1px solid var(--mb-line);border-radius:var(--mb-radius);margin:0 0 8px}',
    '.mb .mb-grupo>summary{cursor:pointer;padding:10px 14px;font-weight:600;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}',
    '.mb .mb-grupo>summary .mb-muted{font-weight:400;font-size:13px}',
    '.mb .mb-grupo ul{list-style:none;margin:0;padding:0 8px 8px}',
    '.mb .mb-item{width:100%;text-align:left;border:0;background:none;padding:8px 6px;border-radius:8px;cursor:pointer;color:var(--mb-ink);display:block;margin:0}',
    '.mb .mb-item:hover:not([disabled]){background:var(--mb-bg)}',
    '.mb .mb-item[disabled]{cursor:default;opacity:.75}',
    '.mb .mb-item .mb-nom{font-weight:600}',
    '.mb .mb-item small{display:block;color:var(--mb-muted)}',
    '.mb .mb-cond{margin-top:12px;font-size:14px;color:var(--mb-muted)}',
    '.mb .mb-cond summary{cursor:pointer;color:var(--mb-ink);font-weight:600}',
    '.mb .mb-cond p{margin:6px 0}',
    '.mb .mb-estado{padding:16px;color:var(--mb-muted)}',
    '.mb .mb-estado.error{color:#c92a2a;font-weight:600}',
    '@media (max-width:560px){.mb .mb-tab{padding:9px 10px;font-size:14px}.mb .mb-mapa{height:var(--mb-alto,58vh)}}'
  ].join('\n');

  // ---------- Utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lis(arr) { return arr.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join(''); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  var cargas = {};
  function cargarScript(src) {
    if (!cargas[src]) {
      cargas[src] = new Promise(function (ok, ko) {
        var s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = function () { ok(); };
        s.onerror = function () { ko(new Error('No se pudo cargar ' + src)); };
        document.head.appendChild(s);
      });
    }
    return cargas[src];
  }
  function cargarCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }
  function inyectarCss() {
    if (document.getElementById('mapa-bonos-css')) return;
    var st = document.createElement('style');
    st.id = 'mapa-bonos-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function asegurarLeaflet() {
    cargarCss(LEAFLET_CSS);
    return window.L && window.L.map ? Promise.resolve() : cargarScript(LEAFLET_JS);
  }
  var datosCache = {};
  function cargarDatos(url) {
    if (!datosCache[url]) {
      datosCache[url] = /\.json(\?|$)/i.test(url)
        ? fetch(url).then(function (r) { if (!r.ok) throw new Error('Datos: HTTP ' + r.status); return r.json(); })
        : cargarScript(url).then(function () {
          if (!window.DATOS) throw new Error('El fichero de datos no define window.DATOS');
          return window.DATOS;
        });
    }
    return datosCache[url];
  }
  var imgs = {};
  function cargarImg(src) {
    if (!imgs[src]) {
      imgs[src] = new Promise(function (ok, ko) {
        var i = new Image();
        i.onload = function () { ok(i); };
        i.onerror = function () { ko(new Error('No se pudo cargar ' + src)); };
        i.src = src;
      });
    }
    return imgs[src];
  }
  // Ejecuta cb cuando el elemento tenga tamaño (útil dentro de acordeones, pestañas o modales cerrados).
  function cuandoVisible(el, cb) {
    if (el.offsetWidth > 0 && el.offsetHeight > 0) { cb(); return; }
    if (!('ResizeObserver' in window)) { setTimeout(function () { cuandoVisible(el, cb); }, 400); return; }
    var ro = new ResizeObserver(function () {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) { ro.disconnect(); cb(); }
    });
    ro.observe(el);
  }
  function vigilarTamano(el, map) {
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (el.offsetWidth) map.invalidateSize(); }).observe(el);
  }
  function pinIcon(clase, contenido, numero) {
    return L.divIcon({
      className: '', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -17], tooltipAnchor: [17, 0],
      html: '<div class="mb-pin ' + clase + '">' + contenido + (numero ? '<b>' + numero + '</b>' : '') + '</div>'
    });
  }
  function marcaInfo(m) {
    return MARCAS[m] || { c: '#546e7a', t: String(m || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase() };
  }

  // Plano de pistas como mapa navegable (coordenadas = píxeles de la imagen).
  function crearPlano(el, E) {
    return cargarImg(BASE + E.img).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight;
      var map = L.map(el, { crs: L.CRS.Simple, minZoom: -5, maxZoom: 1, zoomSnap: 0.25, zoomDelta: 0.5 });
      map.attributionControl.setPrefix(false);
      var b = L.latLngBounds([[0, 0], [h, w]]);
      L.imageOverlay(img.src, b, { attribution: 'Plano © Grandvalira Resorts' }).addTo(map);
      map.fitBounds(b);
      map.setMinZoom(map.getZoom() - 0.5);
      map.setMaxBounds(b.pad(0.15));
      vigilarTamano(el, map);
      return { map: map, h: h, ll: function (x, y) { return L.latLng(h - y, x); } };
    });
  }
  // Encuadre inicial: en pantallas verticales la imagen llena el alto; si quedan puntos fuera, se avisa.
  function encuadrar(pl, pos) {
    var map = pl.map, size = map.getSize(), b = L.latLngBounds(pos);
    var z = Math.min(map.getBoundsZoom(b, false, L.point(80, 80)), -0.75);
    if (size.x < size.y * 1.3) z = Math.min(Math.max(z, Math.log(size.y / pl.h) / Math.LN2), -0.75);
    var centro = L.latLng(pos.reduce(function (s, p) { return s + p.lat; }, 0) / pos.length,
      pos.reduce(function (s, p) { return s + p.lng; }, 0) / pos.length);
    map.setView(centro, z, { animate: false });
    if (!pos.some(function (p) { return map.getBounds().contains(p); })) {
      map.setView(pos.slice().sort(function (a, c) { return centro.distanceTo(a) - centro.distanceTo(c); })[0], z, { animate: false });
    }
    if (pos.some(function (p) { return !map.getBounds().contains(p); })) {
      var Aviso = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
          var d = L.DomUtil.create('div', 'mb-aviso');
          d.textContent = 'Desliza o aleja el plano para ver todos los puntos';
          return d;
        }
      });
      var aviso = new Aviso().addTo(map);
      map.once('dragstart zoomstart', function () { map.removeControl(aviso); });
    }
  }

  // ---------- Opciones ----------
  var CLAVES = ['estacion', 'servicios', 'menu', 'ver', 'zona', 'marca', 'resumen', 'condiciones', 'alto', 'datos', 'leerUrl'];
  function leerOpciones(el, extra) {
    var src = {}, d = el.dataset || {};
    CLAVES.forEach(function (k) { if (d[k] != null) src[k] = d[k]; });
    if (extra) Object.keys(extra).forEach(function (k) { src[k] = extra[k]; });
    if (src.leerUrl != null && src.leerUrl !== 'no' && src.leerUrl !== false) {
      var qs = new URLSearchParams(location.search);
      ['estacion', 'servicios', 'menu', 'ver', 'zona', 'marca'].forEach(function (k) { if (qs.get(k) !== null) src[k] = qs.get(k); });
    }
    var est = String(src.estacion || 'GV').toUpperCase();
    if (!ESTACIONES[est]) est = 'GV';
    var serv = String(src.servicios == null ? 'c,m,a' : src.servicios).split(',')
      .map(function (s) { return s.trim(); }).filter(function (s) { return ['c', 'm', 'a'].indexOf(s) >= 0; });
    return {
      est: est, serv: serv,
      menu: String(src.menu || 'express').toLowerCase() === 'self' && ESTACIONES[est].self ? 'self' : 'express',
      ver: src.ver, zona: src.zona, marca: src.marca,
      resumen: src.resumen !== 'no' && src.resumen !== false,
      condiciones: src.condiciones !== 'no' && src.condiciones !== false,
      alto: src.alto, datos: src.datos || BASE + 'datos.js'
    };
  }

  // ---------- Widget ----------
  function crearWidget(root, o, D) {
    var E = ESTACIONES[o.est], menu = o.menu;
    var TABS = [
      { id: 'escuela', serv: 'c', txt: 'Escuela', icon: ICON.flag, init: initEscuela },
      { id: 'comer', serv: 'm', txt: 'Dónde comer', icon: ICON.fork, init: initComer },
      { id: 'alquiler', serv: 'a', txt: 'Alquiler', icon: ICON.boot, init: initAlquiler }
    ].filter(function (t) { return o.serv.indexOf(t.serv) >= 0; });
    if (!TABS.length) { root.innerHTML = '<p class="mb-estado">Este pack no incluye clases, menú ni alquiler.</p>'; return; }
    if (o.alto) root.style.setProperty('--mb-alto', o.alto);

    var cond = o.condiciones;
    var PANEL = {
      escuela: (o.resumen ? '<div class="mb-card"><h3 class="mb-h">Clases colectivas</h3><ul class="mb-puntos" data-r="resumen"></ul></div>' : '') +
        '<div class="mb-mapa" data-r="mapa" aria-label="Plano de pistas con las escuelas"></div><div class="mb-lista" data-r="lista"></div>' +
        (cond ? '<details class="mb-cond"><summary>Condiciones</summary><p>Clases en grupo de la modalidad elegida (esquí o snow) con personas de nivel parecido. El primer día se hace una prueba de nivel y se forman grupos de 12 personas como máximo.</p><p>No podemos garantizar el idioma elegido. Si necesitas un profesor en un idioma concreto, te recomendamos las clases particulares.</p></details>' : ''),
      comer: (o.resumen ? '<div class="mb-card"><h3 class="mb-h" data-r="titulo"></h3><ul class="mb-puntos" data-r="resumen"></ul></div>' : '') +
        '<div class="mb-controles"><div class="mb-seg" role="group" aria-label="Qué restaurantes ver"><button type="button" data-r="mio" aria-pressed="true">Aceptan mi menú</button>' +
        '<button type="button" data-r="todos" aria-pressed="false">Todos los restaurantes</button></div><span class="mb-muted" data-r="cuenta"></span></div>' +
        '<div class="mb-mapa" data-r="mapa" aria-label="Plano de pistas con los restaurantes"></div><div class="mb-lista" data-r="lista"></div>' +
        (cond ? '<details class="mb-cond"><summary>Condiciones</summary><p data-r="cond"></p><p>Los menús son orientativos y dependen de la oferta de cada restaurante.</p><p>Promoción exclusiva de venta anticipada: no se vende en los restaurantes de la estación.</p></details>' : ''),
      alquiler: (o.resumen ? '<div class="mb-card"><h3 class="mb-h">Alquiler de material</h3><ul class="mb-puntos">' +
        '<li>Recógelo en cualquiera de estas tiendas. Toca una población para ver dónde están.</li>' +
        '<li>Equipo completo: esquís, botas y bastones, o tabla y botas. <strong>No incluye casco.</strong></li>' +
        '<li>En temporada alta, reserva el material con antelación.</li></ul></div>' : '') +
        '<div class="mb-controles" data-r="marcas" role="group" aria-label="Filtrar por marca"></div>' +
        '<div class="mb-controles"><button type="button" class="mb-link" data-r="andorra" hidden>← Ver toda Andorra</button></div>' +
        '<div class="mb-mapa" data-r="mapa" aria-label="Mapa de Andorra con las tiendas de alquiler"></div><div class="mb-lista" data-r="lista"></div>' +
        (cond ? '<details class="mb-cond"><summary>Condiciones</summary><p>Gamas bronce, plata y oro para adultos, y bronce y plata para niños. Si quieres material de gama superior, pagas la diferencia en la tienda.</p><p>★ Partner Grandvalira Resorts.</p></details>' : '')
    };
    root.innerHTML = (TABS.length > 1 ? '<div class="mb-tabs" role="tablist">' + TABS.map(function (t) {
      return '<button type="button" class="mb-tab" role="tab" data-tab="' + t.id + '">' + t.icon + esc(t.txt) + '</button>';
    }).join('') + '</div>' : '') + TABS.map(function (t) {
      return '<section class="mb-panel" role="tabpanel" data-panel="' + t.id + '" hidden>' + PANEL[t.id] + '</section>';
    }).join('');

    var paneles = {}, iniciados = {}, mapas = {};
    root.mapaBonos = { mapas: mapas, opciones: o };  // acceso para la web anfitriona (p. ej. forzar invalidateSize)
    TABS.forEach(function (t) { paneles[t.id] = root.querySelector('[data-panel="' + t.id + '"]'); });
    function q(panel, r) { return panel.querySelector('[data-r="' + r + '"]'); }
    function fallo(e) { root.insertAdjacentHTML('afterbegin', '<p class="mb-estado error">No se pudo cargar el mapa: ' + esc(e && e.message || e) + '</p>'); }

    function mostrar(id) {
      TABS.forEach(function (t) {
        var activo = t.id === id;
        var b = root.querySelector('[data-tab="' + t.id + '"]');
        if (b) b.setAttribute('aria-selected', activo ? 'true' : 'false');
        paneles[t.id].hidden = !activo;
        if (activo && !iniciados[t.id]) { iniciados[t.id] = true; t.init(paneles[t.id]); }
        else if (activo && mapas[t.id]) mapas[t.id].invalidateSize();
      });
    }
    each(root.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () { mostrar(b.getAttribute('data-tab')); });
    });
    mostrar(TABS.some(function (t) { return t.id === o.ver; }) ? o.ver : TABS[0].id);

    // ----- Escuela -----
    function initEscuela(P) {
      if (o.resumen) q(P, 'resumen').innerHTML = lis(['3 horas de clase al día, en grupos de nivel parecido (máximo 12 personas).',
        E.inicio, 'Toca un punto del plano para ver la escuela de cada sector.']);
      var escuelas = D.puntos.filter(function (p) { return p.tipo === 'escuela' && p.est === o.est; });
      var mapEl = q(P, 'mapa'), marc = {};
      q(P, 'lista').innerHTML = '<div class="mb-grupo"><ul>' + escuelas.map(function (p) {
        return '<li><button type="button" class="mb-item" data-id="' + esc(p.id) + '"><span class="mb-nom">' + esc(p.nombre) +
          '</span><small>' + esc(p.ubic) + ' · ' + esc(p.nota) + '</small></button></li>';
      }).join('') + '</ul></div>';
      cuandoVisible(mapEl, function () {
        crearPlano(mapEl, E).then(function (pl) {
          mapas.escuela = pl.map;
          var pos = [];
          escuelas.forEach(function (p) {
            var n = D.nucleos[p.nucleo];
            if (!n) return;
            var ll = pl.ll(n.x, n.y);
            pos.push(ll);
            marc[p.id] = L.marker(ll, { icon: pinIcon('escuela', ICON.flag), title: p.nombre }).addTo(pl.map)
              .bindTooltip(esc(p.zona), { permanent: true, direction: 'right', className: 'mb-etq', offset: [4, 0] })
              .bindPopup('<div class="mb-pop"><h4>' + esc(p.nombre) + '</h4><small>' + esc(p.ubic) + '</small><p>' + esc(p.nota) + '</p></div>');
          });
          if (pos.length) encuadrar(pl, pos);
          each(q(P, 'lista').querySelectorAll('.mb-item'), function (b) {
            b.addEventListener('click', function () {
              var m = marc[b.getAttribute('data-id')];
              if (!m) return;
              mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              pl.map.flyTo(m.getLatLng(), Math.max(pl.map.getZoom(), -0.5));
              m.openPopup();
            });
          });
        }).catch(fallo);
      });
    }

    // ----- Dónde comer -----
    function acepta(p) { return menu === 'self' ? (p.self || p.express) : p.express; }
    function etiqueta(p) {
      if (menu === 'self') {
        if (p.self) return '<span class="mb-b self">Self</span>';
        if (p.express) return '<span class="mb-b exp">Express (canje)</span>';
      } else if (p.express) {
        return '<span class="mb-b exp">Express</span>';
      }
      return '<span class="mb-b no">No acepta tu menú</span>';
    }
    function initComer(P) {
      if (o.resumen) {
        q(P, 'titulo').textContent = menu === 'self' ? 'Tu menú: Self Service' : 'Tu menú: Express';
        q(P, 'resumen').innerHTML = lis(menu === 'self' ? [
          'Entrante, plato principal con guarnición, postre y bebida (agua, refresco o cerveza).',
          'Niños: plato combinado, postre y agua o refresco.',
          'También puedes cambiarlo por un menú Express (sin reembolso).'
        ] : [
          'Bocadillo con patatas fritas y una bebida (agua o refresco de 300 cc).',
          'En algunos restaurantes el plato cambia (pasta, pizza…): lo verás al tocar cada punto.'
        ]);
      }
      if (cond) q(P, 'cond').textContent = menu === 'self'
        ? 'El menú Self se puede sustituir por un menú Express, sin reembolso de la diferencia.'
        : 'La bebida es agua o refresco de 300 cc; no incluye vino ni aguas con sabor.';
      var rest = D.puntos.filter(function (p) { return p.tipo === 'restaurante' && p.est === o.est; });
      var modo = 'mio', pl = null, capa = null, marcHub = {}, primeraVez = true;
      var mapEl = q(P, 'mapa');

      function pintarMapa() {
        if (!pl) return;
        capa.clearLayers(); marcHub = {};
        var porHub = {}, pos = [];
        rest.forEach(function (p) { if (p.nucleo && D.nucleos[p.nucleo]) (porHub[p.nucleo] = porHub[p.nucleo] || []).push(p); });
        Object.keys(porHub).forEach(function (hid) {
          var lista = porHub[hid], ok = lista.filter(acepta);
          if (modo === 'mio' && !ok.length) return;
          var visibles = modo === 'mio' ? ok : lista.slice().sort(function (a, b) { return acepta(b) - acepta(a); });
          var n = D.nucleos[hid];
          var clase = ok.length ? (menu === 'self' && ok.some(function (p) { return p.self; }) ? 'rest selfm' : 'rest') : 'rest no';
          var html = '<div class="mb-pop"><h4>' + esc(n.nombre) + '</h4><ul>' + visibles.map(function (p) {
            return '<li><strong>' + esc(p.nombre) + '</strong>' + etiqueta(p) + '<small>' +
              esc([p.local, acepta(p) ? p.nota : ''].filter(Boolean).join(' · ')) + '</small></li>';
          }).join('') + '</ul></div>';
          var ll = pl.ll(n.x, n.y);
          pos.push(ll);
          marcHub[hid] = L.marker(ll, { icon: pinIcon(clase, ICON.fork, ok.length || ''), zIndexOffset: ok.length ? 500 : 0, title: n.nombre })
            .bindPopup(html, { maxWidth: 300 }).addTo(capa);
        });
        if (primeraVez && pos.length) { encuadrar(pl, pos); primeraVez = false; }
      }
      function pintarLista() {
        var visibles = rest.filter(function (p) { return modo === 'todos' || acepta(p); });
        var zonas = [];
        visibles.forEach(function (p) { if (zonas.indexOf(p.zona) < 0) zonas.push(p.zona); });
        q(P, 'lista').innerHTML = zonas.map(function (z) {
          var items = visibles.filter(function (p) { return p.zona === z; });
          return '<details class="mb-grupo"' + (zonas.length <= 3 ? ' open' : '') + '><summary>' + esc(z) +
            ' <span class="mb-muted">' + items.length + '</span></summary><ul>' + items.map(function (p) {
              var sin = !(p.nucleo && D.nucleos[p.nucleo]);
              return '<li><button type="button" class="mb-item" data-hub="' + esc(p.nucleo) + '"' + (sin ? ' disabled' : '') + '>' +
                '<span class="mb-nom">' + esc(p.nombre) + '</span>' + etiqueta(p) + '<small>' +
                esc([p.ubic, acepta(p) ? p.nota : p.local].filter(Boolean).join(' · ')) +
                (sin ? ' · <i>todavía sin ubicar en el plano</i>' : '') + '</small></button></li>';
            }).join('') + '</ul></details>';
        }).join('');
        each(q(P, 'lista').querySelectorAll('.mb-item:not([disabled])'), function (b) {
          b.addEventListener('click', function () {
            var m = marcHub[b.getAttribute('data-hub')];
            if (!m || !pl) return;
            mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            pl.map.flyTo(m.getLatLng(), Math.max(pl.map.getZoom(), -0.5));
            m.openPopup();
          });
        });
        q(P, 'cuenta').textContent = rest.filter(acepta).length + ' restaurantes aceptan tu menú';
      }
      function setModo(m) {
        modo = m;
        q(P, 'mio').setAttribute('aria-pressed', m === 'mio' ? 'true' : 'false');
        q(P, 'todos').setAttribute('aria-pressed', m === 'todos' ? 'true' : 'false');
        pintarMapa(); pintarLista();
      }
      q(P, 'mio').addEventListener('click', function () { setModo('mio'); });
      q(P, 'todos').addEventListener('click', function () { setModo('todos'); });
      pintarLista();
      cuandoVisible(mapEl, function () {
        crearPlano(mapEl, E).then(function (p) {
          pl = p; mapas.comer = p.map;
          capa = L.layerGroup().addTo(p.map);
          pintarMapa();
        }).catch(fallo);
      });
    }

    // ----- Alquiler -----
    function initAlquiler(P) {
      var tiendas = D.puntos.filter(function (p) { return p.tipo === 'tienda'; });
      var conteo = {};
      tiendas.forEach(function (p) { conteo[p.marca] = (conteo[p.marca] || 0) + 1; });
      var principales = Object.keys(conteo).filter(function (m) { return conteo[m] >= 2; })
        .sort(function (a, b) { return conteo[b] - conteo[a]; });
      var marcaSel = o.marca && (principales.indexOf(o.marca) >= 0 || o.marca === 'Otras') ? o.marca : 'Todas';
      function pasaFiltro(p) {
        if (marcaSel === 'Todas') return true;
        if (marcaSel === 'Otras') return principales.indexOf(p.marca) < 0;
        return p.marca === marcaSel;
      }
      q(P, 'marcas').innerHTML = ['Todas'].concat(principales, ['Otras']).map(function (m) {
        var n = m === 'Todas' ? tiendas.length : m === 'Otras'
          ? tiendas.filter(function (p) { return principales.indexOf(p.marca) < 0; }).length : conteo[m];
        var dot = MARCAS[m] ? '<i style="background:' + MARCAS[m].c + '"></i>' : '';
        return '<button type="button" class="mb-filtro" data-marca="' + esc(m) + '">' + dot + esc(m) + ' <span class="mb-muted">' + n + '</span></button>';
      }).join('');
      var mapEl = q(P, 'mapa');

      cuandoVisible(mapEl, function () {
        var map = L.map(mapEl, { zoomSnap: 0.5 });
        mapas.alquiler = map;
        vigilarTamano(mapEl, map);
        // Teselas sin clave para el PMV (OSM France, estilo HOT). En producción: proveedor con clave.
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          subdomains: 'abc', maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · estilo HOT, <a href="https://www.openstreetmap.fr/">OSM France</a>'
        }).addTo(map);
        var UMBRAL = 14, ESTRECHO = mapEl.clientWidth < 560, TAM = ESTRECHO ? 34 : 44;
        var MARGEN = ESTRECHO ? { padding: [22, 22] } : { paddingTopLeft: [60, 50], paddingBottomRight: [70, 50] };
        var capaZonas = L.layerGroup(), capaPins = L.layerGroup();
        var marcTienda = {}, zonas = {}, burbujas = [];
        var todas = L.latLngBounds(tiendas.filter(function (p) { return p.lat != null; }).map(function (p) { return [p.lat, p.lng]; }));
        var btnAndorra = q(P, 'andorra');

        function irAZona(z) {
          var zo = zonas[z];
          if (!zo || !zo.bounds) return;
          map.flyToBounds(zo.bounds, { padding: [50, 50], maxZoom: 17, duration: 0.8 });
          map.once('moveend', function () { if (map.getZoom() < UMBRAL) map.setZoom(UMBRAL); });
        }
        function pintar() {
          capaZonas.clearLayers(); capaPins.clearLayers(); marcTienda = {}; zonas = {}; burbujas = [];
          tiendas.filter(pasaFiltro).forEach(function (p) {
            var zo = zonas[p.zona] = zonas[p.zona] || { items: [], marcas: {} };
            zo.items.push(p);
            zo.marcas[p.marca] = (zo.marcas[p.marca] || 0) + 1;
          });
          Object.keys(zonas).forEach(function (z) {
            var zo = zonas[z], con = zo.items.filter(function (p) { return p.lat != null; });
            if (!con.length) return;
            zo.bounds = L.latLngBounds(con.map(function (p) { return [p.lat, p.lng]; }));
            var lat = con.reduce(function (s, p) { return s + p.lat; }, 0) / con.length;
            var lng = con.reduce(function (s, p) { return s + p.lng; }, 0) / con.length;
            var off = TAM / 2 - 2, lado = LADO_ZONA[z] || 'right';
            var burbuja = L.marker([lat, lng], {
              icon: L.divIcon({ className: '', iconSize: [TAM, TAM], iconAnchor: [TAM / 2, TAM / 2], tooltipAnchor: [0, 0],
                html: '<div class="mb-burbuja" style="width:' + TAM + 'px;height:' + TAM + 'px">' + zo.items.length + '</div>' }),
              title: z, keyboard: true, zIndexOffset: zo.items.length * 10
            }).bindTooltip(esc(NOMBRE_CORTO_ZONA[z] || z), { permanent: true, direction: lado, className: 'mb-etq',
              offset: lado === 'top' ? [0, -off] : lado === 'bottom' ? [0, off] : lado === 'left' ? [-off, 0] : [off, 0] })
              .on('click', function () { irAZona(z); }).addTo(capaZonas);
            burbujas.push({ m: burbuja, n: zo.items.length });
            con.forEach(function (p) {
              var mi = marcaInfo(p.marca);
              var html = '<div class="mb-pop"><h4>' + esc(p.nombre) + '</h4><small>' + esc([p.ubic, p.dir].filter(Boolean).join(' · ')) + '</small>' +
                (p.partner ? '<p><span class="mb-b partner" style="margin-left:0">★ Partner Grandvalira Resorts</span></p>' : '') +
                (p.nota ? '<p>' + esc(p.nota) + '</p>' : '') +
                '<a class="mb-ir" href="https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener">Cómo llegar →</a></div>';
              marcTienda[p.id] = L.marker([p.lat, p.lng], {
                icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14],
                  html: '<div class="mb-pin tienda" style="background:' + mi.c + '">' + esc(mi.t) + '</div>' }),
                title: p.nombre
              }).bindPopup(html, { maxWidth: 280 }).addTo(capaPins);
            });
          });
          each(q(P, 'marcas').querySelectorAll('.mb-filtro'), function (b) {
            b.setAttribute('aria-pressed', b.getAttribute('data-marca') === marcaSel ? 'true' : 'false');
          });
          capas();
          pintarLista();
        }
        function capas() {
          var cerca = map.getZoom() >= UMBRAL;
          if (cerca) { map.removeLayer(capaZonas); capaPins.addTo(map); }
          else { map.removeLayer(capaPins); capaZonas.addTo(map); despejarEtiquetas(); }
          btnAndorra.hidden = !cerca;
        }
        // Oculta las etiquetas de población que se pisan (gana la población con más tiendas).
        function despejarEtiquetas() {
          var cajas = burbujas.map(function (b) {
            var e = b.m.getElement();
            return { m: b.m, r: e ? e.getBoundingClientRect() : null };
          }).filter(function (c) { return c.r; });
          var puestas = [];
          function choca(r, s) { return r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top; }
          burbujas.slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (b) {
            var t = b.m.getTooltip(), el = t && t.getElement();
            if (!el) return;
            el.style.visibility = 'visible';
            var r = el.getBoundingClientRect();
            var mal = puestas.some(function (s) { return choca(r, s); }) ||
              cajas.some(function (c) { return c.m !== b.m && choca(r, c.r); });
            if (mal) el.style.visibility = 'hidden'; else puestas.push(r);
          });
        }
        function pintarLista() {
          var orden = E.ordenTiendas.filter(function (z) { return zonas[z]; });
          q(P, 'lista').innerHTML = orden.map(function (z) {
            var zo = zonas[z];
            var resumen = Object.keys(zo.marcas).sort(function (a, b) { return zo.marcas[b] - zo.marcas[a]; })
              .map(function (m) { return m + (zo.marcas[m] > 1 ? ' ×' + zo.marcas[m] : ''); }).join(' · ');
            return '<details class="mb-grupo"><summary><span>' + esc(z) + '</span><span class="mb-muted">' + zo.items.length + ' · ' + esc(resumen) +
              '</span></summary><ul>' + zo.items.map(function (p) {
                var sin = p.lat == null;
                return '<li><button type="button" class="mb-item" data-id="' + esc(p.id) + '"' + (sin ? ' disabled' : '') + '><span class="mb-nom">' + esc(p.nombre) + '</span>' +
                  (p.partner ? '<span class="mb-b partner">★ Partner</span>' : '') + '<small>' + esc([p.ubic, p.dir].filter(Boolean).join(' · ')) +
                  (sin ? ' · <i>todavía sin ubicar</i>' : '') + '</small></button></li>';
              }).join('') + '</ul></details>';
          }).join('');
          each(q(P, 'lista').querySelectorAll('details.mb-grupo'), function (d, i) {
            d.addEventListener('toggle', function () { if (d.open) irAZona(orden[i]); });
          });
          each(q(P, 'lista').querySelectorAll('.mb-item:not([disabled])'), function (b) {
            b.addEventListener('click', function () {
              var m = marcTienda[b.getAttribute('data-id')];
              if (!m) return;
              mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              map.flyTo(m.getLatLng(), 18, { duration: 0.8 });
              map.once('moveend', function () { m.openPopup(); });
            });
          });
        }

        each(q(P, 'marcas').querySelectorAll('.mb-filtro'), function (b) {
          b.addEventListener('click', function () { marcaSel = b.getAttribute('data-marca'); pintar(); });
        });
        btnAndorra.addEventListener('click', function () { map.flyToBounds(todas, L.extend({ duration: 0.8 }, MARGEN)); });
        map.on('zoomend', capas);
        map.on('resize', function () { if (map.hasLayer(capaZonas)) despejarEtiquetas(); });
        map.fitBounds(todas, MARGEN);
        pintar();
        if (o.zona && zonas[o.zona] && zonas[o.zona].bounds) {
          // Sin animación: si Leaflet anima, el setZoom de después se aplicaría sobre el centro antiguo.
          map.fitBounds(zonas[o.zona].bounds, { padding: [50, 50], maxZoom: 17, animate: false });
          if (map.getZoom() < UMBRAL) map.setZoom(UMBRAL, { animate: false });
        }
      });
    }
  }

  // ---------- Montaje ----------
  function montar(el, extra) {
    var o = leerOpciones(el, extra);
    inyectarCss();
    el.classList.add('mb');
    el.innerHTML = '<p class="mb-estado">Cargando mapa…</p>';
    return Promise.all([asegurarLeaflet(), cargarDatos(o.datos)]).then(function (r) {
      crearWidget(el, o, r[1]);
    }).catch(function (e) {
      el.innerHTML = '<p class="mb-estado error">No se pudo cargar el mapa: ' + esc(e && e.message || e) + '</p>';
    });
  }
  function montarTodos() {
    each(document.querySelectorAll('[data-mapa-bonos]'), function (el) {
      if (el.__mapaBonos) return;
      el.__mapaBonos = true;
      montar(el);
    });
  }
  window.MapaBonos = { montar: montar, montarTodos: montarTodos, estaciones: ESTACIONES, version: '0.2' };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarTodos);
  else montarTodos();
})();
