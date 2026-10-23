/*!
 * Mapa de los bonos · v1.0.0
 * Escuela, restaurantes y tiendas de alquiler de cada pack, sobre el plano de pistas y el mapa de Andorra.
 *
 * Un solo código, tres formas de usarlo:
 *  1. Página propia (la del QR):      index.html?e=GV&s=cma&m=self
 *  2. Dentro de otra web con iframe (lo más seguro en Drupal):
 *       <iframe src="https://SERVIDOR/embed.html?e=GV&s=a" style="width:100%;height:560px;border:0"
 *               loading="lazy" allow="geolocation" title="Mapa de tiendas de alquiler"></iframe>
 *  3. Dentro de otra web con script:
 *       <div data-mapa-bonos data-estacion="GV" data-servicios="a"></div>
 *       <script src="https://SERVIDOR/mapa-bonos.js" defer></script>
 *
 * Parámetros (en la dirección, forma larga o corta, o como data-* en el <div>):
 *   estacion | e     GV, PA, OA                                   (GV)
 *   servicios | s    c clases, m menú, a alquiler: "c,m,a" o "cma" (c,m,a). También pack | p = "f_c_m_a".
 *   menu | m         express | self (self solo en GV)             (express)
 *   ver | v          pestaña inicial: escuela | comer | alquiler
 *   zona | z         abre las tiendas acercado a una población ("Pas de la Casa")
 *   sector           tiendas de un sector: GV (Grandvalira) | NP (Nord Pass = Pal Arinsal + Ordino Arcalís)
 *   lang | l         es | ca | fr | en (si no, el idioma del navegador o de la web)
 * Solo en el <div>: data-modo (insertado | pagina | iframe), data-alto ("560px"), data-datos (URL de datos.js),
 *   data-leer-url="si" (toma los parámetros de la dirección de la página).
 * Desde JS: MapaBonos.montar(elemento, { estacion: 'PA', servicios: 'a' }).
 * Avisa a la web anfitriona con el evento "mapabonos" (detail: { accion, ... }) por si quiere medir el uso.
 */
(function () {
  'use strict';
  if (window.MapaBonos) return;

  const VERSION = '1.0.0';
  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/?#]*([?#].*)?$/, '') : new URL('.', location.href).href;

  // ---------- Configuración ----------
  const CONFIG = {
    leafletJs: BASE + 'vendor/leaflet/leaflet.js',
    leafletCss: BASE + 'vendor/leaflet/leaflet.css',
    datos: BASE + 'datos.js',
    paginaCompleta: BASE + 'index.html',
    // Mapa de fondo de las tiendas. De momento, las teselas libres de OpenStreetMap France (estilo HOT).
    // Antes de producción hay que decidir proveedor (ver docs/PLAN.md): solo se cambia aquí.
    fondo: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      opciones: {
        subdomains: 'abc', maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · ' +
          '<a href="https://www.openstreetmap.fr/" target="_blank" rel="noopener">OSM France</a>'
      }
    },
    idiomas: ['es', 'ca', 'fr', 'en'],
    anchoColumnas: 760  // a partir de este ancho, lista fija a la izquierda (igual que el @container del CSS)
  };

  const ZONAS_GV = ['Encamp', 'Encamp – Solanelles (pistas)', 'Canillo', 'El Tarter', 'Soldeu', "Bordes d'Envalira",
    'Grau Roig', 'Pas de la Casa', 'La Massana', 'Pal', 'Arinsal', 'Ordino Arcalís'];
  const ZONAS_PA = ['La Massana', 'Pal', 'Arinsal', 'Ordino Arcalís', 'Encamp', 'Encamp – Solanelles (pistas)', 'Canillo',
    'El Tarter', 'Soldeu', "Bordes d'Envalira", 'Grau Roig', 'Pas de la Casa'];
  const ZONAS_OA = ['Ordino Arcalís', 'La Massana', 'Pal', 'Arinsal', 'Encamp', 'Encamp – Solanelles (pistas)', 'Canillo',
    'El Tarter', 'Soldeu', "Bordes d'Envalira", 'Grau Roig', 'Pas de la Casa'];
  // sector: el de las tiendas que salen primero (GV = Grandvalira, NP = Nord Pass). El sector de cada tienda viene del Excel.
  const ESTACIONES = {
    GV: { nombre: 'Grandvalira', color: '#0a6ebd', oscuro: '#0b2b4c', self: true, ordenTiendas: ZONAS_GV, sector: 'GV' },
    PA: { nombre: 'Pal Arinsal', color: '#c8202f', oscuro: '#4a1016', self: false, ordenTiendas: ZONAS_PA, sector: 'NP' },
    OA: { nombre: 'Ordino Arcalís', color: '#1f5aa6', oscuro: '#14284b', self: false, ordenTiendas: ZONAS_OA, sector: 'NP' }
  };
  const SECTORES = {
    GV: { nombre: 'Grandvalira', color: '#0a6ebd' },
    NP: { nombre: 'Nord Pass', color: '#c8202f' }  // Pal Arinsal + Ordino Arcalís
  };
  const LADO_ZONA = { 'Pas de la Casa': 'top', 'Grau Roig': 'bottom', "Bordes d'Envalira": 'right', 'Soldeu': 'top', 'El Tarter': 'left',
    'Canillo': 'left', 'Encamp': 'bottom', 'Encamp – Solanelles (pistas)': 'left', 'La Massana': 'right', 'Pal': 'bottom',
    'Arinsal': 'top', 'Ordino Arcalís': 'right' };
  const NOMBRE_CORTO_ZONA = { 'Encamp – Solanelles (pistas)': 'Solanelles (en pistas)' };
  const UMBRAL_TIENDAS = 14;  // a partir de este zoom se ven las tiendas una a una
  const ICON = {
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 22V3h2v1.2l10 .1-2.6 4.2L18 13H8v9z"/></svg>',
    fork: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h1.5v6.5h1V2H11v6.5h1V2h1.5v7.5A2.5 2.5 0 0 1 11 12v10H9V12a2.5 2.5 0 0 1-2-2.5zM18 2v20h-2v-7h-2V7c0-2.8 1.8-5 4-5z"/></svg>',
    boot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h7v8l5 4v4H5v-2h2zM3 20h18v2H3z"/></svg>',
    lista: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h2v2H3zm4 0h14v2H7zM3 11h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z"/></svg>',
    mapa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m15 4-6-2-7 2.5V22l7-2.5 6 2 7-2.5V2zm-1 15.6-4-1.3V4.4l4 1.3z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z" transform="translate(1 0)"/></svg>',
    yo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 3h-2.1A7 7 0 0 0 13 5.1V3h-2v2.1A7 7 0 0 0 5.1 11H3v2h2.1a7 7 0 0 0 5.9 5.9V21h2v-2.1a7 7 0 0 0 5.9-5.9H21zm-9 6a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>',
    ampliar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h6v2H7.4l4.3 4.3-1.4 1.4L6 7.4V10H4zm10 0h6v6h-2V7.4l-4.3 4.3-1.4-1.4L16.6 6H14zM4 14h2v2.6l4.3-4.3 1.4 1.4L7.4 18H10v2H4zm16 0v6h-6v-2h2.6l-4.3-4.3 1.4-1.4 4.3 4.3V14z"/></svg>',
    casa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3z"/></svg>',
    todo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 3h7v2H5v5H3zm11 0h7v7h-2V5h-5zM3 14h2v5h5v2H3zm16 0h2v7h-7v-2h5z"/></svg>',
    ir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5z"/></svg>'
  };
  // Lo poco que se ve antes de tener los datos (con los textos del Excel).
  const TEXTOS_BASE = {
    'app.cargando': { es: 'Cargando mapa…', ca: 'Carregant el mapa…', fr: 'Chargement de la carte…', en: 'Loading map…' },
    'app.error': {
      es: 'No se ha podido cargar el mapa. Comprueba la conexión.', ca: "No s'ha pogut carregar el mapa. Comprova la connexió.",
      fr: 'Impossible de charger la carte. Vérifiez votre connexion.', en: 'The map could not be loaded. Check your connection.'
    },
    'app.reintentar': { es: 'Reintentar', ca: 'Tornar-ho a provar', fr: 'Réessayer', en: 'Try again' }
  };

  const CSS = `
.mb{--mb-ink:#16202b;--mb-muted:#5b6673;--mb-line:#dde3ea;--mb-bg:#f3f5f8;--mb-card:#fff;--mb-acento:#0a6ebd;--mb-oscuro:#0b2b4c;
--mb-express:#d9480f;--mb-self:#2b8a3e;--mb-no:#8f99a5;--mb-r:12px;container:mb/inline-size;display:flex;flex-direction:column;
height:var(--mb-alto,560px);min-height:360px;position:relative;isolation:isolate;overflow:hidden;color:var(--mb-ink);background:var(--mb-bg);
font-size:15px;line-height:1.45;text-align:left;border:1px solid var(--mb-line);border-radius:var(--mb-r);-webkit-tap-highlight-color:transparent}
.mb.mb--pagina{height:100%;min-height:0;border:0;border-radius:0}
.mb.mb--iframe{height:100vh;height:100dvh;min-height:0;border:0;border-radius:0}
.mb *,.mb *::before,.mb *::after{box-sizing:border-box}
.mb button,.mb select,.mb input{font:inherit;color:inherit;letter-spacing:normal;text-transform:none;margin:0}
.mb button{cursor:pointer}
.mb h1,.mb h2,.mb h3,.mb h4,.mb p,.mb ul{margin:0;padding:0;font-family:inherit;letter-spacing:normal;text-transform:none}
.mb ul{list-style:none}
.mb a{color:var(--mb-acento)}
.mb :focus-visible{outline:2px solid var(--mb-acento);outline-offset:2px}
.mb .mb-oculto{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.mb .mb-cab{flex:none;height:60px;display:flex;align-items:center;gap:12px;padding:9px 14px 9px 16px;background:var(--mb-oscuro);color:#fff}
.mb .mb-cab-txt{flex:1;min-width:0}
.mb .mb-cab-sup{font-size:12.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mb .mb-cab-tit{font-size:19px;line-height:1.25;font-weight:700;color:#fff}
.mb .mb-idioma select{-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);color:#fff;
border-radius:8px;padding:6px 10px;font-weight:700;font-size:14px;cursor:pointer}
.mb .mb-idioma option{color:#16202b}
.mb .mb-tabs{flex:none;display:flex;gap:2px;padding:0 6px;background:var(--mb-card);border-bottom:1px solid var(--mb-line);overflow-x:auto;scrollbar-width:none}
.mb .mb-tab{flex:1 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-bottom:3px solid transparent;background:none;
color:var(--mb-muted);padding:12px 10px 10px;font-weight:600;line-height:1.2;white-space:nowrap;border-radius:0}
.mb .mb-tab svg{width:18px;height:18px;flex:none}
.mb .mb-tab[aria-selected="true"]{color:var(--mb-acento);border-bottom-color:var(--mb-acento)}
.mb .mb-tab:focus-visible{outline-offset:-3px}
.mb .mb-pest{flex:1;min-height:0;display:flex;flex-direction:column}
.mb .mb-pest[hidden]{display:none!important}
.mb .mb-sub{flex:none;display:flex;gap:6px;align-items:center;padding:8px 10px;overflow-x:auto;background:var(--mb-card);border-bottom:1px solid var(--mb-line);scrollbar-width:none}
.mb .mb-sub::-webkit-scrollbar,.mb .mb-tabs::-webkit-scrollbar{display:none}
.mb .mb-chip{flex:none;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--mb-line);background:var(--mb-card);color:var(--mb-ink);
border-radius:999px;padding:6px 12px;font-size:14px;line-height:1.2;white-space:nowrap}
.mb .mb-chip[aria-pressed="true"]{background:var(--mb-ink);border-color:var(--mb-ink);color:#fff}
.mb .mb-chip .mb-n{opacity:.7;font-variant-numeric:tabular-nums}
.mb .mb-chip i{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}
.mb .mb-chip svg{width:16px;height:16px;flex:none}
.mb .mb-chip.mb-cargando svg{animation:mb-giro 1s linear infinite}
.mb .mb-sep{flex:none;width:1px;align-self:stretch;background:var(--mb-line);margin:2px}
.mb .mb-leyenda{flex:none;display:inline-flex;gap:10px;font-size:12.5px;color:var(--mb-muted);white-space:nowrap;padding:0 4px}
.mb .mb-leyenda i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}
.mb .mb-cuerpo{flex:1;min-height:0;position:relative}
.mb .mb-caja{position:absolute;inset:0}
.mb .mb-mapa{position:absolute;inset:0;z-index:0;background:#e8edf2}
.mb .leaflet-container{font:inherit;font-size:13px}
.mb .mb-lado{position:absolute;inset:0;z-index:660;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:var(--mb-bg);
padding:4px 12px 84px;transform:translateY(100%);visibility:hidden;transition:transform .25s ease,visibility 0s linear .25s;outline:0}
.mb .mb-lista-abierta .mb-lado{transform:none;visibility:visible;transition:transform .25s ease}
.mb .mb-pildora{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:700;display:inline-flex;align-items:center;gap:8px;border:0;
border-radius:999px;background:var(--mb-ink);color:#fff;padding:11px 18px;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.28);white-space:nowrap}
.mb .mb-pildora svg{width:18px;height:18px}
.mb .mb-con-ficha:not(.mb-lista-abierta) .mb-pildora{display:none}
.mb .mb-tarjeta{background:var(--mb-card);border:1px solid var(--mb-line);border-radius:var(--mb-r);padding:14px 16px;margin:10px 0 4px}
.mb .mb-h{font-size:17px;line-height:1.3;font-weight:700;margin:0 0 6px;color:var(--mb-ink)}
.mb ul.mb-puntos{list-style:disc;padding-left:18px}
.mb ul.mb-puntos li{margin:3px 0}
.mb .mb-resumen-n{margin:12px 4px 0;font-weight:600}
.mb .mb-grupo{margin:14px 0 0}
.mb .mb-grupo-tit{display:flex;justify-content:space-between;gap:8px;margin:0 4px 6px;font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mb-muted)}
.mb .mb-grupo-tit .mb-punto{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:0}
.mb .mb-grupo-sub{margin:-2px 4px 6px}
.mb .mb-items{background:var(--mb-card);border:1px solid var(--mb-line);border-radius:var(--mb-r);overflow:hidden}
.mb .mb-item{display:block;width:100%;text-align:left;border:0;border-top:1px solid var(--mb-line);background:none;padding:10px 14px;color:var(--mb-ink);border-radius:0}
.mb .mb-items>li:first-child>.mb-item{border-top:0}
.mb .mb-item:hover:not([disabled]){background:#eef3f8}
.mb .mb-item:focus-visible{outline-offset:-2px}
.mb .mb-item[disabled]{cursor:default}
.mb .mb-nom{font-weight:600}
.mb .mb-item small,.mb .mb-sec{display:block;color:var(--mb-muted);font-size:13.5px;line-height:1.4}
.mb .mb-dist{float:right;margin-left:8px;font-size:13px;font-weight:600;color:var(--mb-muted);font-variant-numeric:tabular-nums}
.mb details.mb-zona{margin:8px 0 0;background:var(--mb-card);border:1px solid var(--mb-line);border-radius:var(--mb-r);overflow:hidden}
.mb details.mb-zona>summary{cursor:pointer;padding:11px 14px;list-style:none;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px}
.mb details.mb-zona>summary::-webkit-details-marker{display:none}
.mb details.mb-zona>summary::before{content:"";width:7px;height:7px;border:solid var(--mb-muted);border-width:0 2px 2px 0;transform:rotate(-45deg);margin-right:4px;align-self:center;transition:transform .15s}
.mb details.mb-zona[open]>summary::before{transform:rotate(45deg)}
.mb details.mb-zona>summary b{font-weight:700}
.mb details.mb-zona>summary span{color:var(--mb-muted);font-size:13px;flex-basis:100%;padding-left:15px}
.mb details.mb-zona .mb-items{border:0;border-top:1px solid var(--mb-line);border-radius:0}
.mb .mb-enlace{border:0;background:none;padding:0;color:var(--mb-acento);font-weight:600;text-decoration:underline}
.mb .mb-cond{margin:16px 4px 0;font-size:14px;color:var(--mb-muted)}
.mb .mb-cond summary{cursor:pointer;color:var(--mb-ink);font-weight:600}
.mb .mb-cond p{margin:6px 0}
.mb .mb-pie{margin:14px 4px 0;font-size:12px;color:var(--mb-muted)}
.mb .mb-b{display:inline-block;font-size:11.5px;font-weight:700;line-height:1.5;padding:0 7px;border-radius:999px;color:#fff;vertical-align:1px;white-space:nowrap;margin-left:6px}
.mb .mb-b.exp{background:var(--mb-express)}
.mb .mb-b.self{background:var(--mb-self)}
.mb .mb-b.no{background:#e9edf1;color:var(--mb-muted)}
.mb .mb-b.partner{background:#fff3bf;color:#6b4f00}
.mb .mb-ficha{position:absolute;left:10px;right:10px;bottom:10px;z-index:650;max-height:60%;overflow-y:auto;overscroll-behavior:contain;
background:var(--mb-card);border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.25);padding:14px 16px 16px}
.mb .mb-ficha[hidden]{display:none}
.mb .mb-ficha h3{font-size:16.5px;line-height:1.3;font-weight:700;padding-right:36px;color:var(--mb-ink)}
.mb .mb-ficha p{margin:6px 0 0}
.mb .mb-ficha ul{margin:8px 0 0}
.mb .mb-ficha li{padding:8px 0;border-top:1px solid var(--mb-line)}
.mb .mb-ficha li.mb-marcado{background:#fff8e1;margin:0 -16px;padding:8px 16px}
.mb .mb-x{position:absolute;top:8px;right:8px;width:36px;height:36px;border-radius:50%;border:0;background:var(--mb-bg);color:var(--mb-ink);display:grid;place-items:center;padding:0}
.mb .mb-x svg{width:18px;height:18px}
.mb .mb-boton{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:10px 16px;border-radius:10px;background:var(--mb-acento);color:#fff!important;font-weight:600;text-decoration:none}
.mb .mb-boton svg{width:18px;height:18px}
.mb .mb-icono{background:none;border:0}
.mb .mb-pin{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);position:relative;transition:transform .15s}
.mb .mb-pin svg{width:18px;height:18px}
.mb .mb-pin b{position:absolute;top:-7px;right:-9px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--mb-ink);color:#fff;font-size:12px;line-height:16px;text-align:center;border:2px solid #fff}
.mb .mb-pin.escuela{background:var(--mb-acento)}
.mb .mb-pin.rest{background:var(--mb-express)}
.mb .mb-pin.rest.self{background:var(--mb-self)}
.mb .mb-pin.rest.no{background:var(--mb-no)}
.mb .mb-pin.tienda{width:30px;height:30px}
.mb .mb-pin.tienda svg{width:16px;height:16px}
.mb .mb-pin.tienda .mb-estrella{position:absolute;top:-7px;right:-7px;width:16px;height:16px;border-radius:50%;background:#ffd43b;color:#6b4f00;font-size:10px;line-height:15px;text-align:center;border:1px solid #fff}
.mb .mb-icono.mb-sel .mb-pin{transform:scale(1.25);box-shadow:0 0 0 4px rgba(255,255,255,.95),0 2px 10px rgba(0,0,0,.55)}
.mb .mb-burbuja{border-radius:50%;display:grid;place-items:center;background:var(--mb-oscuro);color:#fff;font-weight:700;font-size:16px;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);cursor:pointer}
.mb .mb-yo{width:18px;height:18px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 6px rgba(26,115,232,.25),0 1px 4px rgba(0,0,0,.4)}
.mb .leaflet-tooltip.mb-etq{background:rgba(255,255,255,.95);border:0;box-shadow:0 1px 3px rgba(0,0,0,.3);font-weight:600;font-size:12.5px;padding:2px 7px;color:var(--mb-ink)}
.mb .leaflet-tooltip.mb-etq::before{display:none}
.mb .mb-ctrl a,.mb .mb-ctrl button{display:grid;place-items:center;width:34px;height:34px;background:#fff;border:0;border-bottom:1px solid #ccc;color:var(--mb-ink);padding:0;border-radius:0}
.mb .mb-ctrl>:first-child{border-top-left-radius:4px;border-top-right-radius:4px}
.mb .mb-ctrl>:last-child{border-bottom:0;border-bottom-left-radius:4px;border-bottom-right-radius:4px}
.mb .mb-ctrl svg{width:18px;height:18px}
.mb .mb-aviso{position:absolute;inset:0;z-index:640;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .2s}
.mb .mb-aviso span{background:rgba(22,32,43,.88);color:#fff;padding:10px 16px;border-radius:999px;font-weight:600;max-width:84%;text-align:center}
.mb .mb-aviso.mb-visible{opacity:1}
.mb .mb-pista{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:630;background:rgba(22,32,43,.86);color:#fff;font-size:12.5px;line-height:1.3;
padding:5px 12px;border-radius:14px;width:max-content;max-width:calc(100% - 120px);text-align:center;pointer-events:none}
.mb .mb-estado{margin:auto;padding:24px;color:var(--mb-muted);display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.mb .mb-estado.mb-error{color:#b42318;font-weight:600}
.mb .mb-estado .mb-boton{margin:0;border:0}
.mb .mb-spinner{width:28px;height:28px;border:3px solid var(--mb-line);border-top-color:var(--mb-acento);border-radius:50%;animation:mb-giro .8s linear infinite}
@keyframes mb-giro{to{transform:rotate(360deg)}}
@container mb (min-width:760px){
.mb .mb-lado{right:auto;width:340px;transform:none;visibility:visible;transition:none;border-right:1px solid var(--mb-line);padding-bottom:16px;z-index:1}
.mb .mb-caja{left:340px}
.mb .mb-pildora{display:none}
.mb .mb-ficha{right:auto;width:370px}
.mb .mb-tab{flex:0 0 auto;padding-left:16px;padding-right:16px}
}
@media (prefers-reduced-motion:reduce){.mb *{transition:none!important;animation:none!important}}
`;

  // ---------- Utilidades ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');  // **texto** del Excel = negrita
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lis = arr => arr.filter(Boolean).map(x => `<li>${fmt(x)}</li>`).join('');
  const sinMovimiento = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esTactil = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;
  let contador = 0;

  const cargas = {};
  function cargarScript(src) {
    if (!cargas[src]) {
      cargas[src] = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = () => ok();
        s.onerror = () => { delete cargas[src]; s.remove(); ko(new Error('No se pudo cargar ' + src)); };
        document.head.appendChild(s);
      });
    }
    return cargas[src];
  }
  function cargarCss(href) {
    if ([...document.styleSheets].some(h => h.href && /leaflet(\.min)?\.css/.test(h.href))) return;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }
  function inyectarCss() {
    if (document.getElementById('mapa-bonos-css')) return;
    const st = document.createElement('style');
    st.id = 'mapa-bonos-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function asegurarLeaflet() {
    cargarCss(CONFIG.leafletCss);
    const v = window.L && window.L.map && window.L.version ? window.L.version.split('.').map(Number) : null;
    if (v && v[0] === 1 && v[1] >= 7) return Promise.resolve();  // la web ya tiene un Leaflet compatible
    return cargarScript(CONFIG.leafletJs);
  }
  function cargarDatos(url) {
    if (window.MAPA_BONOS_DATOS && url === CONFIG.datos) return Promise.resolve(window.MAPA_BONOS_DATOS);
    return cargarScript(url).then(() => {
      if (!window.MAPA_BONOS_DATOS) throw new Error('El fichero de datos no define MAPA_BONOS_DATOS');
      return window.MAPA_BONOS_DATOS;
    });
  }
  // Ejecuta cb cuando el elemento tenga tamaño (dentro de acordeones, pestañas o modales cerrados).
  function cuandoVisible(el, cb) {
    if (el.offsetWidth > 0 && el.offsetHeight > 0) { cb(); return; }
    if (!('ResizeObserver' in window)) { setTimeout(() => cuandoVisible(el, cb), 400); return; }
    const ro = new ResizeObserver(() => { if (el.offsetWidth > 0 && el.offsetHeight > 0) { ro.disconnect(); cb(); } });
    ro.observe(el);
  }
  function vigilarTamano(el, map) {
    if (!('ResizeObserver' in window)) return;
    let pendiente = false;
    new ResizeObserver(() => {
      if (pendiente || !el.offsetWidth) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; map.invalidateSize({ pan: false }); map.fire('mb:tamano'); });
    }).observe(el);
  }
  function volar(map, destino, zoom) {
    if (sinMovimiento()) map.setView(destino, zoom, { animate: false });
    else map.flyTo(destino, zoom, { duration: 0.6 });
  }
  function volarA(map, bounds, opciones) {
    if (sinMovimiento()) map.fitBounds(bounds, Object.assign({ animate: false }, opciones));
    else map.flyToBounds(bounds, Object.assign({ duration: 0.7 }, opciones));
  }
  function distanciaM(a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // Desplazamiento de la etiqueta de una burbuja según el lado donde va.
  // Lados con guion ("right-up") = en diagonal: Leaflet solo tiene 4 lados, la diagonal se hace con el desplazamiento.
  function desfase(lado, tam) {
    const o = tam / 2 - 2, v = lado.endsWith('-up') ? -o : lado.endsWith('-down') ? o : 0;
    const base = lado.split('-')[0];
    return base === 'top' ? [0, -o] : base === 'bottom' ? [0, o] : base === 'left' ? [-o, v] : [o, v];
  }
  // Aparta en pantalla los marcadores que se pisan (items: { m: marcador, ll: posición real, r: radio en px }).
  function separar(map, items, maxDesvio) {
    const pts = items.map(x => ({ x, p0: map.latLngToLayerPoint(x.ll), p: map.latLngToLayerPoint(x.ll) }));
    for (let it = 0; it < 40; it++) {
      let movido = false;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], c = pts[j];
          const dx = c.p.x - a.p.x, dy = c.p.y - a.p.y, d = Math.hypot(dx, dy), min = a.x.r + c.x.r;
          if (d >= min) continue;
          const ang = d ? null : (i * 2.4 + j);  // misma posición exacta: dirección fija para que no salten
          const ux = d ? dx / d : Math.cos(ang), uy = d ? dy / d : Math.sin(ang), k = (min - d) / 2;
          a.p = L.point(a.p.x - ux * k, a.p.y - uy * k);
          c.p = L.point(c.p.x + ux * k, c.p.y + uy * k);
          movido = true;
        }
      }
      if (!movido) break;
    }
    pts.forEach(q => {
      let p = q.p;
      if (maxDesvio) {
        const dx = p.x - q.p0.x, dy = p.y - q.p0.y, d = Math.hypot(dx, dy);
        if (d > maxDesvio) p = L.point(q.p0.x + dx / d * maxDesvio, q.p0.y + dy / d * maxDesvio);
      }
      q.x.m.setLatLng(map.layerPointToLatLng(p));
    });
  }
  function avisarHost(root, accion, extra) {
    try { root.dispatchEvent(new CustomEvent('mapabonos', { bubbles: true, detail: Object.assign({ accion }, extra) })); } catch (e) { /* navegadores viejos */ }
  }

  // ---------- Idioma ----------
  const EQUIVALENTES = { gl: 'es', eu: 'es', oc: 'ca' };
  function elegirIdioma(pedido, modo) {
    const cands = [pedido];
    if (modo === 'insertado') cands.push(document.documentElement.lang);
    cands.push(...(navigator.languages || [navigator.language]));
    let alguno = false;
    for (const c of cands) {
      if (!c) continue;
      alguno = true;
      const n = String(c).toLowerCase().slice(0, 2);
      if (CONFIG.idiomas.includes(n)) return n;
      if (EQUIVALENTES[n]) return EQUIVALENTES[n];
    }
    return alguno ? 'en' : 'es';
  }
  function textoBase(lang, clave) { const e = TEXTOS_BASE[clave]; return e ? (e[lang] || e.es) : clave; }
  function crearIdioma(lang, D) {
    const tx = D.textos || {};
    const t = (clave, vars) => {
      const e = tx[clave];
      let s = e ? (e[lang] || e.es) : textoBase(lang, clave);
      if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
      return s;
    };
    // Traducción de lo que viene de la hoja Puntos: primero la frase entera; si no, los trozos conocidos.
    const col = CONFIG.idiomas.indexOf(lang);
    const exactas = new Map();
    let re = null;
    if (col > 0 && D.frases && D.frases.length) {
      D.frases.forEach(f => exactas.set(f[0], f[col]));
      const claves = [...exactas.keys()].sort((a, b) => b.length - a.length).map(escRe);
      re = new RegExp('(^|[^\\p{L}])(' + claves.join('|') + ')(?![\\p{L}])', 'gu');
    }
    const tr = s => {
      if (!s || !re) return s || '';
      if (exactas.has(s)) return exactas.get(s);
      return s.replace(re, (m, antes, k) => antes + exactas.get(k));
    };
    const num = new Intl.NumberFormat(lang === 'ca' ? 'ca-ES' : lang, { maximumFractionDigits: 1 });
    const dist = m => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${num.format(m / 1000)} km`);
    return { lang, t, tr, dist };
  }

  // ---------- Opciones ----------
  const ALIAS = { estacion: ['estacion', 'e'], servicios: ['servicios', 's'], pack: ['pack', 'p'], menu: ['menu', 'm'],
    ver: ['ver', 'v'], zona: ['zona', 'z'], sector: ['sector'], lang: ['lang', 'l', 'idioma'] };
  const CLAVES_DATA = ['estacion', 'servicios', 'pack', 'menu', 'ver', 'zona', 'sector', 'lang', 'modo', 'alto', 'datos', 'leerUrl', 'debug'];
  function leerOpciones(el, extra) {
    const d = el.dataset || {}, src = {};
    CLAVES_DATA.forEach(k => { if (d[k] != null && d[k] !== '') src[k] = d[k]; });
    Object.assign(src, extra || {});
    const modo = ['pagina', 'iframe', 'insertado'].includes(src.modo) ? src.modo : 'insertado';
    if (modo !== 'insertado' || (src.leerUrl != null && src.leerUrl !== 'no' && src.leerUrl !== false)) {
      const qs = new URLSearchParams(location.search);
      Object.keys(ALIAS).forEach(k => {
        const a = ALIAS[k].find(x => qs.get(x) !== null);
        if (a) src[k] = qs.get(a);
      });
      if (qs.get('debug') !== null) src.debug = '1';
    }
    let est = String(src.estacion || 'GV').toUpperCase();
    if (!ESTACIONES[est]) est = 'GV';
    const crudo = String(src.servicios != null ? src.servicios : (src.pack != null ? src.pack : 'c,m,a')).toLowerCase();
    const trozos = /[,_\s;+]/.test(crudo) ? crudo.split(/[,_\s;+]+/) : crudo.split('');
    const serv = ['c', 'm', 'a'].filter(s => trozos.includes(s));
    return {
      est, serv, modo,
      menu: String(src.menu || 'express').toLowerCase() === 'self' && ESTACIONES[est].self ? 'self' : 'express',
      ver: src.ver, zona: src.zona, sector: SECTORES[String(src.sector || '').toUpperCase()] ? String(src.sector).toUpperCase() : null, lang: src.lang,
      alto: src.alto, datos: src.datos || CONFIG.datos, debug: src.debug != null && src.debug !== 'no'
    };
  }
  function urlPagina(o, lang, ver) {
    const p = new URLSearchParams({ e: o.est, s: o.serv.join('') });
    if (o.menu === 'self') p.set('m', 'self');
    if (ver) p.set('v', ver);
    if (lang) p.set('l', lang);
    return CONFIG.paginaCompleta + '?' + p.toString();
  }

  // ---------- Piezas de mapa ----------
  function opcionesMapa(modo) {
    const dentro = modo !== 'pagina';
    return { scrollWheelZoom: !dentro, dragging: !(dentro && esTactil()), zoomControl: true, attributionControl: true };
  }
  // Dentro de otra web: un dedo mueve la página, dos dedos el mapa; la rueda solo hace zoom con Ctrl.
  function prepararGestos(map, P, modo, t) {
    if (modo === 'pagina') return;
    const el = map.getContainer();
    if (esTactil()) {
      el.addEventListener('touchmove', e => { if (e.touches.length === 1) P.aviso(t('mapa.dos_dedos')); }, { passive: true });
    } else {
      let ultimo = 0;
      el.addEventListener('wheel', e => {
        if (!(e.ctrlKey || e.metaKey)) { P.aviso(t('mapa.ctrl_rueda')); return; }
        e.preventDefault();
        const ahora = Date.now();
        if (ahora - ultimo < 90) return;
        ultimo = ahora;
        map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + (e.deltaY < 0 ? 0.5 : -0.5));
      }, { passive: false });
    }
  }
  function controlBotones(map, botones) {
    const C = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const div = L.DomUtil.create('div', 'leaflet-bar mb-ctrl');
        botones.forEach(b => {
          const a = L.DomUtil.create(b.href ? 'a' : 'button', '', div);
          a.innerHTML = b.icono;
          a.title = b.titulo;
          a.setAttribute('aria-label', b.titulo);
          if (b.href) { a.href = b.href; a.target = '_blank'; a.rel = 'noopener'; }
          else { a.type = 'button'; L.DomEvent.on(a, 'click', e => { L.DomEvent.stop(e); b.click(); }); }
        });
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
      }
    });
    return new C().addTo(map);
  }
  // Plano de pistas en teselas (coordenadas = píxeles del plano de 3200 px de ancho, origen arriba a la izquierda).
  function crearPlano(el, est, D, modo) {
    const P = D.planos[est];
    const w = P.ancho, h = P.alto;
    const map = L.map(el, Object.assign({ crs: L.CRS.Simple, minZoom: P.zMin - 1, maxZoom: P.zMax + 1, zoomSnap: 0.25, zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120, bounceAtZoomLimits: false }, opcionesMapa(modo)));
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    const limites = L.latLngBounds([[-h, 0], [0, w]]);
    const carpeta = BASE + P.carpeta;
    // Imagen pequeña debajo: se ve al instante mientras llegan las teselas nítidas.
    map.createPane('mbVista').style.zIndex = 150;  // por debajo de las teselas (tilePane = 200)
    const previa = new Image();
    previa.fetchPriority = 'high';
    previa.src = carpeta + '/vista.webp';
    L.imageOverlay(previa.src, limites, { interactive: false, pane: 'mbVista' }).addTo(map);
    // En pantallas de alta densidad se pide el nivel siguiente a la mitad de tamaño (como detectRetina, que no admite zoom negativo).
    const retina = (window.devicePixelRatio || 1) >= 1.5;
    const teselas = L.tileLayer(carpeta + '/{z}/{x}/{y}.webp', {
      tileSize: retina ? 128 : 256, zoomOffset: -P.zMin + (retina ? 1 : 0),
      minNativeZoom: P.zMin - (retina ? 1 : 0), maxNativeZoom: P.zMax - (retina ? 1 : 0),
      minZoom: P.zMin - 1, maxZoom: P.zMax + 1, bounds: limites, noWrap: true, keepBuffer: 3, updateWhenZooming: false,
      attribution: 'Plano © Grandvalira Resorts ' + esc(P.temporada)
    });
    // Las teselas se piden cuando ya ha llegado la vista previa (o a los 400 ms): así se ve algo cuanto antes.
    let puestas = false;
    const ponerTeselas = () => { if (!puestas) { puestas = true; teselas.addTo(map); } };
    if (previa.complete) ponerTeselas();
    else { previa.onload = previa.onerror = ponerTeselas; setTimeout(ponerTeselas, 400); }
    map.fitBounds(limites, { animate: false });
    map.setMinZoom(Math.max(P.zMin - 1, map.getZoom() - 0.5));
    map.setMaxBounds(limites.pad(0.12));
    vigilarTamano(el, map);
    return { map, w, h, limites, ll: (x, y) => L.latLng(-y, x) };
  }
  // Encuadre inicial: los puntos con margen; en pantallas verticales el plano llena el alto.
  function encuadrar(pl, pos, P, t, animar) {
    const map = pl.map, size = map.getSize();
    if (!pos.length) { map.fitBounds(pl.limites, { animate: !!animar }); return; }
    const b = L.latLngBounds(pos);
    let z = Math.min(map.getBoundsZoom(b, false, L.point(70, 70)), -0.75);
    if (size.x < size.y * 1.3) z = Math.min(Math.max(z, Math.log2(0.85 * size.y / pl.h)), -0.75);
    z = Math.max(z, map.getMinZoom());
    const centro = L.latLng(pos.reduce((s, p) => s + p.lat, 0) / pos.length, pos.reduce((s, p) => s + p.lng, 0) / pos.length);
    map.setView(centro, z, { animate: !!animar });
    if (!pos.some(p => map.getBounds().contains(p))) {
      map.setView(pos.slice().sort((a, c) => centro.distanceTo(a) - centro.distanceTo(c))[0], z, { animate: false });
    }
    if (!animar && pos.some(p => !map.getBounds().contains(p))) {
      const d = document.createElement('div');
      d.className = 'mb-pista';
      d.textContent = t('mapa.desliza');
      P.caja.appendChild(d);
      map.once('dragstart zoomstart', () => d.remove());
      setTimeout(() => d.remove(), 6000);
    }
  }
  function icono(html, tam, extra) {
    return L.divIcon(Object.assign({ className: 'mb-icono', html, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] }, extra));
  }
  function pin(clase, contenido, numero) {
    return icono(`<div class="mb-pin ${clase}">${contenido}${numero ? `<b>${numero}</b>` : ''}</div>`, 34, { tooltipAnchor: [17, 0] });
  }
  function marcar(marker, si) {
    const el = marker && marker.getElement();
    if (el) el.classList.toggle('mb-sel', si);
    if (marker && si) marker.setZIndexOffset(2000);
    else if (marker) marker.setZIndexOffset(marker.options.zBase || 0);
  }

  // ---------- Widget ----------
  function crearWidget(root, o, D) {
    const E = ESTACIONES[o.est];
    const uid = 'mb' + (++contador);
    let mapas = [];
    root.style.setProperty('--mb-acento', E.color);
    root.style.setProperty('--mb-oscuro', E.oscuro);
    root.mapaBonos = { opciones: o, version: VERSION, mapas };

    function render(lang, verInicial) {
      mapas.forEach(m => m.remove());
      mapas = root.mapaBonos.mapas = [];
      const I = crearIdioma(lang, D), t = I.t;
      root.setAttribute('lang', lang);
      const TABS = [
        { id: 'escuela', serv: 'c', txt: t('tab.escuela'), icon: ICON.flag, init: initEscuela },
        { id: 'comer', serv: 'm', txt: t('tab.comer'), icon: ICON.fork, init: initComer },
        { id: 'alquiler', serv: 'a', txt: t('tab.alquiler'), icon: ICON.boot, init: initAlquiler }
      ].filter(x => o.serv.includes(x.serv));

      let cab = '';
      if (o.modo === 'pagina') {
        const sup = [E.nombre].concat(o.serv.map(s => s === 'c' ? t('chip.clases') : s === 'm' ? t(o.menu === 'self' ? 'chip.self' : 'chip.express') : t('chip.alquiler')));
        cab = `<header class="mb-cab"><div class="mb-cab-txt"><p class="mb-cab-sup">${esc(sup.join(' · '))}</p>
          <h1 class="mb-cab-tit">${esc(t('app.titulo'))}</h1></div>
          <label class="mb-idioma"><span class="mb-oculto">${esc(t('app.idioma'))}</span><select data-r="idioma">${CONFIG.idiomas.map(l =>
            `<option value="${l}"${l === lang ? ' selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select></label></header>`;
        document.documentElement.lang = lang;
        document.title = `${t('app.titulo')} · ${E.nombre}`;
        const md = document.querySelector('meta[name="description"]');
        if (md) md.setAttribute('content', t('app.descripcion'));
      }
      if (!TABS.length) {
        root.innerHTML = cab + `<p class="mb-estado">${esc(t('app.sin_servicios'))}</p>`;
        conectarIdioma();
        return;
      }
      const conSub = { escuela: false, comer: true, alquiler: true };
      root.innerHTML = cab + (TABS.length > 1 ? `<div class="mb-tabs" role="tablist" aria-label="${esc(E.nombre)}">${TABS.map(x =>
        `<button type="button" class="mb-tab" role="tab" id="${uid}-t-${x.id}" aria-controls="${uid}-p-${x.id}" data-tab="${x.id}">${x.icon}${esc(x.txt)}</button>`).join('')}</div>` : '') +
        TABS.map(x => `<section class="mb-pest" role="tabpanel" id="${uid}-p-${x.id}" ${TABS.length > 1 ? `aria-labelledby="${uid}-t-${x.id}"` : `aria-label="${esc(x.txt)}"`} data-pest="${x.id}" hidden>
          ${conSub[x.id] ? '<div class="mb-sub" data-r="sub"></div>' : ''}
          <div class="mb-cuerpo">
            <div class="mb-caja"><div class="mb-mapa" data-r="mapa" role="region" aria-label="${esc(x.txt)}"></div>
              <div class="mb-ficha" data-r="ficha" role="region" aria-live="polite" hidden></div>
              <div class="mb-aviso" data-r="aviso" aria-hidden="true"><span></span></div></div>
            <aside class="mb-lado" data-r="lado" tabindex="-1" aria-label="${esc(t('mapa.ver_lista'))}"></aside>
            <button type="button" class="mb-pildora" data-r="pildora" aria-expanded="false" aria-controls="${uid}-p-${x.id}"></button>
          </div></section>`).join('');
      conectarIdioma();

      const pest = {}, iniciadas = {};
      TABS.forEach(x => { pest[x.id] = prepararPestana(root.querySelector(`[data-pest="${x.id}"]`), I); });
      function mostrar(id, foco) {
        TABS.forEach(x => {
          const activa = x.id === id;
          const b = root.querySelector(`[data-tab="${x.id}"]`);
          if (b) { b.setAttribute('aria-selected', activa); b.tabIndex = activa ? 0 : -1; if (activa && foco) b.focus(); }
          pest[x.id].sec.hidden = !activa;
          if (activa && !iniciadas[x.id]) { iniciadas[x.id] = true; x.init(pest[x.id], I); }
          else if (activa && pest[x.id].map) pest[x.id].map.invalidateSize();
        });
        if (o.modo === 'pagina') {
          const u = new URL(location.href);
          u.searchParams.set('v', id);
          history.replaceState(null, '', u);
        }
        root.mapaBonos.pestana = id;
        avisarHost(root, 'pestana', { pestana: id, estacion: o.est });
      }
      const botones = [...root.querySelectorAll('[data-tab]')];
      botones.forEach((b, i) => {
        b.addEventListener('click', () => mostrar(b.dataset.tab));
        b.addEventListener('keydown', e => {
          const paso = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key];
          if (!paso) return;
          e.preventDefault();
          const j = Math.max(0, Math.min(botones.length - 1, paso === 99 ? botones.length - 1 : paso === -99 ? 0 : i + paso));
          mostrar(botones[j].dataset.tab, true);
        });
      });
      mostrar(TABS.some(x => x.id === verInicial) ? verInicial : TABS[0].id);
    }

    function conectarIdioma() {
      const sel = root.querySelector('[data-r="idioma"]');
      if (!sel) return;
      sel.addEventListener('change', () => {
        const u = new URL(location.href);
        u.searchParams.set('l', sel.value);
        u.searchParams.delete('lang');
        history.replaceState(null, '', u);
        render(sel.value, root.mapaBonos.pestana);
        const s2 = root.querySelector('[data-r="idioma"]');
        if (s2) s2.focus();
      });
    }

    root.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const sec = root.querySelector('.mb-pest:not([hidden])');
      if (!sec || !sec.mbPestana) return;
      const P = sec.mbPestana;
      if (!P.q('ficha').hidden) P.cerrarFicha();
      else if (sec.classList.contains('mb-lista-abierta')) P.cerrarLista();
    });

    // Piezas comunes de cada pestaña: lista lateral / desplegable, ficha y avisos.
    function prepararPestana(sec, I) {
      const t = I.t;
      const q = r => sec.querySelector(`[data-r="${r}"]`);
      const P = { sec, q, caja: sec.querySelector('.mb-caja'), map: null, alCerrar: null, n: 0 };
      sec.mbPestana = P;
      const pildora = q('pildora');
      const ancho = () => root.clientWidth >= CONFIG.anchoColumnas && window.CSS && CSS.supports('container-type: inline-size');
      P.ancho = ancho;
      function pintarPildora() {
        const abierta = sec.classList.contains('mb-lista-abierta');
        pildora.innerHTML = abierta ? `${ICON.mapa}${esc(t('mapa.ver_mapa'))}` : `${ICON.lista}${esc(t('mapa.ver_lista'))} · ${P.n}`;
        pildora.setAttribute('aria-expanded', abierta);
      }
      P.cuenta = n => { P.n = n; pintarPildora(); };
      P.abrirLista = () => { P.cerrarFicha(); sec.classList.add('mb-lista-abierta'); pintarPildora(); q('lado').focus({ preventScroll: true }); };
      P.cerrarLista = () => { sec.classList.remove('mb-lista-abierta'); pintarPildora(); };
      pildora.addEventListener('click', () => (sec.classList.contains('mb-lista-abierta') ? P.cerrarLista() : P.abrirLista()));
      P.ficha = (html, alCerrar) => {
        if (P.alCerrar) { const c = P.alCerrar; P.alCerrar = null; c(); }
        const f = q('ficha');
        f.innerHTML = `<button type="button" class="mb-x" aria-label="${esc(t('mapa.cerrar'))}">${ICON.x}</button>${html}`;
        f.hidden = false;
        f.scrollTop = 0;
        sec.classList.add('mb-con-ficha');
        f.querySelector('.mb-x').addEventListener('click', () => P.cerrarFicha());
        P.alCerrar = alCerrar || null;
      };
      P.cerrarFicha = () => {
        const f = q('ficha');
        if (f.hidden) return;
        f.hidden = true;
        sec.classList.remove('mb-con-ficha');
        if (P.alCerrar) { const c = P.alCerrar; P.alCerrar = null; c(); }
      };
      let temporizador = null;
      P.aviso = (txt, ms) => {
        const a = q('aviso');
        a.firstChild.textContent = txt;
        a.classList.add('mb-visible');
        clearTimeout(temporizador);
        temporizador = setTimeout(() => a.classList.remove('mb-visible'), ms || 1400);
      };
      // Al elegir algo de la lista: en móvil se cierra la lista para ver el mapa.
      P.irAlMapa = () => { if (!ancho()) P.cerrarLista(); };
      P.nuevoMapa = map => {
        P.map = map;
        mapas.push(map);
        map.on('click', () => P.cerrarFicha());
        prepararGestos(map, P, o.modo, t);
        const extra = [];
        if (o.modo !== 'pagina') extra.push({ icono: ICON.ampliar, titulo: t('mapa.ampliar'), href: urlPagina(o, I.lang, sec.dataset.pest) });
        return extra;
      };
      pintarPildora();
      return P;
    }

    const tarjeta = (titulo, puntos) => `<h2 class="mb-h">${esc(titulo)}</h2><ul class="mb-puntos">${lis(puntos)}</ul>`;
    function resumen(P, t, titulo, puntos, condiciones, despues) {
      P.q('lado').innerHTML = `<div class="mb-tarjeta" data-r="tarjeta">${tarjeta(titulo, puntos)}</div>
        <p class="mb-resumen-n" data-r="resumen-n" hidden></p><div data-r="lista"></div>${despues || ''}
        <details class="mb-cond"><summary>${esc(t('panel.condiciones'))}</summary><div data-r="cond">${condiciones.map(c => `<p>${fmt(c)}</p>`).join('')}</div></details>
        <p class="mb-pie">${esc(E.nombre)} · ${esc(D.generado ? D.generado.slice(0, 10) : '')}</p>`;
    }

    // ----- Escuela -----
    function initEscuela(P, I) {
      const { t, tr } = I;
      const escuelas = D.puntos.filter(p => p.tipo === 'escuela' && p.est === o.est);
      resumen(P, t, t('escuela.titulo'), [t('escuela.p1'), t('escuela.inicio.' + o.est), t('escuela.toca')], [t('escuela.cond1'), t('escuela.cond2')]);
      P.cuenta(escuelas.length);
      const marc = {};
      const lista = P.q('lista');
      lista.innerHTML = `<div class="mb-grupo"><ul class="mb-items">${escuelas.map(p => {
        const ok = p.nucleo && D.nucleos[p.nucleo];
        return `<li><button type="button" class="mb-item" data-id="${esc(p.id)}"${ok ? '' : ' disabled'}><span class="mb-nom">${esc(tr(p.nombre))}</span>
          <small>${esc([tr(p.ubic), tr(p.nota)].filter(Boolean).join(' · '))}${ok ? '' : ` · <i>${esc(t('mapa.sin_ubicar'))}</i>`}</small></button></li>`;
      }).join('')}</ul></div>`;
      function ficha(p) {
        P.ficha(`<h3>${esc(tr(p.nombre))}</h3><p class="mb-sec">${esc(tr(p.ubic))}</p>${p.nota ? `<p>${esc(tr(p.nota))}</p>` : ''}`,
          () => marcar(marc[p.id], false));
        marcar(marc[p.id], true);
        avisarHost(root, 'punto', { tipo: 'escuela', id: p.id });
      }
      lista.addEventListener('click', e => {
        const b = e.target.closest('[data-id]');
        if (!b || !P.map) return;
        const m = marc[b.dataset.id];
        if (!m) return;
        P.irAlMapa();
        volar(P.map, m.getLatLng(), Math.max(P.map.getZoom(), -0.5));
        ficha(escuelas.find(p => p.id === b.dataset.id));
      });
      cuandoVisible(P.q('mapa'), () => {
        const pl = crearPlano(P.q('mapa'), o.est, D, o.modo);
        const extra = P.nuevoMapa(pl.map);
        const pos = [];
        escuelas.forEach(p => {
          const n = D.nucleos[p.nucleo];
          if (!n) return;
          const ll = pl.ll(n.x, n.y);
          pos.push(ll);
          marc[p.id] = L.marker(ll, { icon: pin('escuela', ICON.flag), title: tr(p.nombre), zBase: 0 }).addTo(pl.map)
            .bindTooltip(esc(p.zona), { permanent: true, direction: 'right', className: 'mb-etq', offset: [4, 0] })
            .on('click', () => ficha(p));
        });
        controlBotones(pl.map, [{ icono: ICON.casa, titulo: t('mapa.encuadrar'), click: () => encuadrar(pl, pos, P, t, true) }].concat(extra));
        encuadrar(pl, pos, P, t);
      });
    }

    // ----- Dónde comer -----
    // Filtros: Menú Express · Menú Self (solo donde existe) · Todos. Empieza en el menú del pack.
    // Cada filtro enseña solo los restaurantes de ese menú. Que el Self se pueda cambiar por un Express
    // es una condición del producto: va en "Condiciones", no en el mapa.
    function initComer(P, I) {
      const { t, tr } = I;
      const rest = D.puntos.filter(p => p.tipo === 'restaurante' && p.est === o.est);
      const MODOS = E.self ? ['express', 'self', 'todos'] : ['express', 'todos'];
      const acepta = (p, m) => (m === 'self' ? p.self : m === 'express' ? p.express : true);
      const tieneMenu = p => p.express || (E.self && p.self);
      // "En algunos restaurantes el plato cambia": solo si en esta estación hay menús Express con platos distintos.
      const platoVaria = new Set(rest.filter(p => p.express).map(p => p.nota)).size > 1;
      // Qué incluye en cada restaurante. La nota del Excel es la del menú Express; con el filtro Self se enseña la del Self
      // (la más repetida entre los restaurantes solo Self), también en los que aceptan los dos menús.
      const frecuencias = {};
      rest.filter(p => p.self && !p.express && p.nota).forEach(p => { frecuencias[p.nota] = (frecuencias[p.nota] || 0) + 1; });
      const notaSelf = Object.keys(frecuencias).sort((a, b) => frecuencias[b] - frecuencias[a])[0] || '';
      const queIncluye = p => (modo === 'self' ? notaSelf : tieneMenu(p) ? p.nota : '');
      let modo = o.menu, pl = null, capa = null, marcHub = {}, primeraVez = true;
      const pos = [];
      const badge = (clase, clave) => `<span class="mb-b ${clase}">${esc(t(clave))}</span>`;
      const etiqueta = p => {
        if (modo === 'self') return badge('self', 'comer.badge.self');
        if (modo === 'express') return badge('exp', 'comer.badge.express');
        const b = (p.express ? badge('exp', 'comer.badge.express') : '') + (E.self && p.self ? badge('self', 'comer.badge.self') : '');
        return b || badge('no', 'comer.badge.ninguno');
      };
      resumen(P, t, '', [], []);
      // La tarjeta de arriba explica el menú elegido (con "Todos", el del pack).
      function pintarResumen() {
        const m = modo === 'todos' ? o.menu : modo;
        const titulo = m === o.menu ? t(m === 'self' ? 'comer.titulo.self' : 'comer.titulo.express') : t(m === 'self' ? 'chip.self' : 'chip.express');
        P.q('tarjeta').innerHTML = tarjeta(titulo, m === 'self' ? [t('comer.self.p1'), t('comer.self.p2')] : [t('comer.express.p1'), platoVaria ? t('comer.express.p2') : '']);
        P.q('cond').innerHTML = [t(m === 'self' ? 'comer.cond.self' : 'comer.cond.express'), t('comer.cond2'), t('comer.cond3')].map(c => `<p>${fmt(c)}</p>`).join('');
        const n = rest.filter(p => acepta(p, modo)).length;
        const rn = P.q('resumen-n');
        rn.hidden = false;
        rn.textContent = modo === 'todos' ? t('comer.cuenta.todos', { n }) : t('comer.cuenta.menu', { n, menu: modo === 'self' ? 'Self' : 'Express' });
      }
      const nombreFiltro = { express: 'comer.filtro.express', self: 'comer.filtro.self', todos: 'comer.filtro.todos' };
      P.q('sub').innerHTML = MODOS.map(m => `<button type="button" class="mb-chip" data-modo="${m}">${esc(t(nombreFiltro[m]))} <span class="mb-n">${
        rest.filter(p => acepta(p, m)).length}</span></button>`).join('') + '<span class="mb-sep"></span><span class="mb-leyenda" data-r="leyenda" aria-hidden="true"></span>';
      function pintarLeyenda() {
        const item = (color, txt) => `<span><i style="background:var(${color})"></i>${esc(txt)}</span>`;
        P.q('leyenda').innerHTML = (modo !== 'express' && E.self ? item('--mb-self', 'Self') : '') + (modo !== 'self' ? item('--mb-express', 'Express') : '') +
          (modo === 'todos' ? item('--mb-no', t('comer.leyenda.otros')) : '');
      }
      function fichaHub(hid, resaltar) {
        const n = D.nucleos[hid];
        const peso = p => (tieneMenu(p) ? 2 : 0) + (modo !== 'express' && p.self ? 1 : 0);
        const lista = rest.filter(p => p.nucleo === hid && acepta(p, modo)).sort((a, b) => peso(b) - peso(a));
        P.ficha(`<h3>${esc(tr(n.nombre))}</h3><ul>${lista.map(p => `<li${p.id === resaltar ? ' class="mb-marcado"' : ''}>
          <strong>${esc(p.nombre)}</strong>${etiqueta(p)}<small class="mb-sec">${esc([tr(p.local), tr(queIncluye(p))].filter(Boolean).join(' · '))}</small></li>`).join('')}</ul>`,
          () => marcar(marcHub[hid], false));
        marcar(marcHub[hid], true);
        const m = P.q('ficha').querySelector('.mb-marcado');
        if (m) m.scrollIntoView({ block: 'nearest' });
        avisarHost(root, 'punto', { tipo: 'restaurante', nucleo: hid, id: resaltar });
      }
      function pintarMapa() {
        if (!pl) return;
        P.cerrarFicha();
        capa.clearLayers();
        marcHub = {};
        pos.length = 0;
        const porHub = {};
        rest.forEach(p => { if (p.nucleo && D.nucleos[p.nucleo] && acepta(p, modo)) (porHub[p.nucleo] = porHub[p.nucleo] || []).push(p); });
        Object.keys(porHub).forEach(hid => {
          const lista = porHub[hid], n = D.nucleos[hid];
          const conSelf = modo !== 'express' && E.self && lista.some(p => p.self), conExpress = lista.some(p => p.express);
          const clase = conSelf ? 'rest self' : conExpress ? 'rest' : 'rest no';
          const ll = pl.ll(n.x, n.y);
          pos.push(ll);
          const z = clase === 'rest no' ? 0 : 500;
          marcHub[hid] = L.marker(ll, { icon: pin(clase, ICON.fork, lista.length), zIndexOffset: z, zBase: z, title: tr(n.nombre) })
            .on('click', () => fichaHub(hid)).addTo(capa);
        });
        if (primeraVez && pos.length) { encuadrar(pl, pos, P, t); primeraVez = false; }
      }
      function pintarLista() {
        const visibles = rest.filter(p => acepta(p, modo));
        const zonas = [];
        visibles.forEach(p => { if (!zonas.includes(p.zona)) zonas.push(p.zona); });
        P.q('lista').innerHTML = zonas.map(z => {
          const items = visibles.filter(p => p.zona === z);
          return `<div class="mb-grupo"><h3 class="mb-grupo-tit"><span>${esc(tr(z))}</span><span>${items.length}</span></h3><ul class="mb-items">${items.map(p => {
            const ok = p.nucleo && D.nucleos[p.nucleo];
            return `<li><button type="button" class="mb-item" data-hub="${esc(p.nucleo)}" data-id="${esc(p.id)}"${ok ? '' : ' disabled'}>
              <span class="mb-nom">${esc(p.nombre)}</span>${etiqueta(p)}<small>${esc([tr(p.ubic), tieneMenu(p) ? tr(queIncluye(p)) : tr(p.local)].filter(Boolean).join(' · '))}${
                !ok ? ` · <i>${esc(t('mapa.sin_ubicar'))}</i>` : ''}</small></button></li>`;
          }).join('')}</ul></div>`;
        }).join('');
        P.cuenta(visibles.length);
      }
      function setModo(m) {
        modo = m;
        P.q('sub').querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.modo === m));
        pintarLeyenda();
        pintarResumen();
        pintarMapa();
        pintarLista();
      }
      P.q('sub').addEventListener('click', e => {
        const b = e.target.closest('[data-modo]');
        if (b && b.dataset.modo !== modo) { setModo(b.dataset.modo); avisarHost(root, 'menu', { menu: modo }); }
      });
      P.q('lista').addEventListener('click', e => {
        const b = e.target.closest('[data-hub]');
        if (!b || !pl) return;
        const m = marcHub[b.dataset.hub];
        if (!m) return;
        P.irAlMapa();
        volar(pl.map, m.getLatLng(), Math.max(pl.map.getZoom(), -0.5));
        fichaHub(b.dataset.hub, b.dataset.id);
      });
      setModo(modo);
      cuandoVisible(P.q('mapa'), () => {
        pl = crearPlano(P.q('mapa'), o.est, D, o.modo);
        const extra = P.nuevoMapa(pl.map);
        capa = L.layerGroup().addTo(pl.map);
        controlBotones(pl.map, [{ icono: ICON.casa, titulo: t('mapa.encuadrar'), click: () => encuadrar(pl, pos, P, t, true) }].concat(extra));
        pintarMapa();
      });
    }

    // ----- Alquiler -----
    // Filtro por sector: Grandvalira (GV) o Nord Pass (NP = Pal Arinsal + Ordino Arcalís). Pines y burbujas con el color del sector.
    function initAlquiler(P, I) {
      const { t, tr } = I;
      const tiendas = D.puntos.filter(p => p.tipo === 'tienda');
      const secDe = p => (SECTORES[p.sector] ? p.sector : E.sector);
      const ordenSect = [E.sector].concat(Object.keys(SECTORES).filter(k => k !== E.sector));  // el de la estación, primero
      let sectorSel = o.sector || 'todas';
      const pasa = p => sectorSel === 'todas' || secDe(p) === sectorSel;
      const nombreZona = z => tr(NOMBRE_CORTO_ZONA[z] || z);
      resumen(P, t, t('alquiler.titulo'), [t('alquiler.p1'), t('alquiler.p2'), t('alquiler.p3')],
        [t('alquiler.cond1'), '★ ' + t('alquiler.partner')]);
      P.q('sub').innerHTML = `<button type="button" class="mb-chip" data-r="cerca">${ICON.yo}${esc(t('alquiler.cerca'))}</button><span class="mb-sep"></span>` +
        `<button type="button" class="mb-chip" data-sector="todas">${esc(t('alquiler.todas'))} <span class="mb-n">${tiendas.length}</span></button>` +
        ordenSect.map(k => `<button type="button" class="mb-chip" data-sector="${k}"${k === 'NP' ? ` title="${esc(t('alquiler.np_detalle'))}"` : ''}>
          <i style="background:${SECTORES[k].color}"></i>${esc(SECTORES[k].nombre)} <span class="mb-n">${tiendas.filter(p => secDe(p) === k).length}</span></button>`).join('');
      let map = null, yo = null, marcaYo = null, ordenCerca = false, selId = null;
      let capaZonas, capaPins, marcTienda = {}, zonas = {}, burbujas = [], todas = null;
      const nTiendas = n => t(n === 1 ? 'alquiler.tienda' : 'alquiler.tiendas', { n });
      const MARGEN = () => (P.caja.clientWidth < 560 ? { padding: [24, 24] } : { paddingTopLeft: [60, 50], paddingBottomRight: [70, 50] });
      const limitesDe = lista => { const c = lista.filter(p => p.lat != null); return c.length ? L.latLngBounds(c.map(p => [p.lat, p.lng])) : null; };
      // Encuadre del filtro elegido. Con "Todas" en el móvil no caben todas las poblaciones con su nombre: se empieza por el sector de la estación.
      function limitesVista() {
        if (sectorSel !== 'todas') return limitesDe(tiendas.filter(pasa));
        return P.caja.clientWidth < 700 ? limitesDe(tiendas.filter(p => secDe(p) === E.sector)) || todas : todas;
      }

      function fichaTienda(p) {
        const d = yo && p.lat != null ? I.dist(distanciaM(yo, [p.lat, p.lng])) : '';
        P.ficha(`<h3>${esc(p.nombre)}</h3>
          ${p.partner ? `<p><span class="mb-b partner" style="margin-left:0">★ ${esc(t('alquiler.partner'))}</span></p>` : ''}
          <p class="mb-sec">${esc([t('alquiler.sector', { s: SECTORES[secDe(p)].nombre }), nombreZona(p.zona), tr(p.ubic)].filter(Boolean).join(' · '))}${d ? ` · ${esc(d)}` : ''}</p>
          ${p.dir ? `<p>${esc(p.dir)}</p>` : ''}${p.nota ? `<p>${esc(tr(p.nota))}</p>` : ''}
          ${p.lat != null ? `<a class="mb-boton" data-r="ir" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">${ICON.ir}${esc(t('alquiler.como_llegar'))}</a>` : ''}`,
          () => { selId = null; marcar(marcTienda[p.id], false); });
        selId = p.id;
        marcar(marcTienda[p.id], true);
        const ir = P.q('ficha').querySelector('[data-r="ir"]');
        if (ir) ir.addEventListener('click', () => avisarHost(root, 'como_llegar', { id: p.id, sector: secDe(p) }));
        avisarHost(root, 'punto', { tipo: 'tienda', id: p.id });
      }
      function irAZona(z) {
        const zo = zonas[z];
        if (!zo || !zo.bounds || !map) return;
        volarA(map, zo.bounds, { padding: [50, 50], maxZoom: 17 });
        map.once('moveend', () => { if (map.getZoom() < UMBRAL_TIENDAS) map.setZoom(UMBRAL_TIENDAS); });
      }
      function irATienda(p) {
        const m = marcTienda[p.id];
        if (!m) return;
        P.irAlMapa();
        volar(map, m.getLatLng(), Math.max(map.getZoom(), 17));
        fichaTienda(p);
      }
      function pintar() {
        if (!map) return;
        P.cerrarFicha();
        capaZonas.clearLayers(); capaPins.clearLayers();
        marcTienda = {}; zonas = {}; burbujas = [];
        const ancho = P.caja.clientWidth, TAM = ancho < 560 ? 32 : 44;
        tiendas.filter(pasa).forEach(p => {
          const zo = zonas[p.zona] = zonas[p.zona] || { items: [], marcas: {}, sector: secDe(p) };
          zo.items.push(p);
          zo.marcas[p.marca] = (zo.marcas[p.marca] || 0) + 1;
        });
        Object.keys(zonas).forEach(z => {
          const zo = zonas[z], con = zo.items.filter(p => p.lat != null);
          if (!con.length) return;
          zo.bounds = L.latLngBounds(con.map(p => [p.lat, p.lng]));
          const ll = L.latLng(con.reduce((s, p) => s + p.lat, 0) / con.length, con.reduce((s, p) => s + p.lng, 0) / con.length);
          const lado = LADO_ZONA[z] || 'right';
          const burbuja = L.marker(ll, {
            icon: L.divIcon({ className: 'mb-icono', iconSize: [TAM, TAM], iconAnchor: [TAM / 2, TAM / 2], tooltipAnchor: [0, 0],
              html: `<div class="mb-burbuja" style="width:${TAM}px;height:${TAM}px;font-size:${TAM < 40 ? 14 : 16}px;background:${SECTORES[zo.sector].color}">${zo.items.length}</div>` }),
            title: `${nombreZona(z)}: ${nTiendas(zo.items.length)}`, keyboard: true, zIndexOffset: zo.items.length * 10
          }).bindTooltip(esc(nombreZona(z)), { permanent: true, direction: lado, className: 'mb-etq', offset: desfase(lado, TAM) })
            .on('click', () => irAZona(z)).addTo(capaZonas);
          burbujas.push({ m: burbuja, ll, n: zo.items.length, r: TAM / 2 + 3, lado, tam: TAM });
          con.forEach(p => {
            marcTienda[p.id] = L.marker([p.lat, p.lng], { llReal: L.latLng(p.lat, p.lng),
              icon: icono(`<div class="mb-pin tienda" style="background:${SECTORES[secDe(p)].color}">${ICON.boot}${p.partner ? '<span class="mb-estrella" aria-hidden="true">★</span>' : ''}</div>`, 30),
              title: p.nombre
            }).on('click', () => fichaTienda(p))
              .on('add', e => { if (selId === p.id) marcar(e.target, true); })  // Leaflet rehace el pin al volver a mostrar la capa
              .addTo(capaPins);
          });
        });
        P.q('sub').querySelectorAll('[data-sector]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sector === sectorSel));
        capas();
        pintarLista();
      }
      function capas() {
        const cerca = map.getZoom() >= UMBRAL_TIENDAS;
        if (cerca) { map.removeLayer(capaZonas); capaPins.addTo(map); separarTiendas(); }
        else { map.removeLayer(capaPins); capaZonas.addTo(map); colocarBurbujas(); }
      }
      function recolocar() { if (map.hasLayer(capaZonas)) colocarBurbujas(); else separarTiendas(); }
      // Tiendas del mismo edificio: se apartan unos píxeles para poder tocarlas (la posición real sigue en "Cómo llegar").
      function separarTiendas() {
        const items = Object.values(marcTienda).map(m => ({ m, ll: m.options.llReal, r: 16 }));
        separar(map, items, 22);
      }
      // Separa las burbujas que se pisan (El Tarter y Soldeu, p. ej.) y coloca las etiquetas donde no choquen.
      function colocarBurbujas() {
        if (!map.hasLayer(capaZonas)) return;
        separar(map, burbujas.map(b => ({ m: b.m, ll: b.ll, r: b.r })));
        requestAnimationFrame(colocarEtiquetas);
      }
      function colocarEtiquetas() {
        const caja = el => el && el.getBoundingClientRect();
        const choca = (r, s) => r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top;
        const marco = caja(map.getContainer());
        const iconos = burbujas.map(b => ({ m: b.m, r: caja(b.m.getElement()) })).filter(x => x.r);
        const puestas = [];
        burbujas.slice().sort((a, b) => b.n - a.n).forEach(b => {
          const tt = b.m.getTooltip(), el = tt && tt.getElement();
          if (!el) return;
          const lados = [b.lado].concat(['top', 'right', 'bottom', 'left', 'right-up', 'right-down', 'left-up', 'left-down'].filter(x => x !== b.lado));
          const bien = lados.some(lado => {
            tt.options.direction = lado.split('-')[0];
            tt.options.offset = desfase(lado, b.tam);
            tt.update();
            const r0 = caja(el), r = { left: r0.left + 3, right: r0.right - 3, top: r0.top + 2, bottom: r0.bottom - 2 };  // un poco de margen
            const dentro = r.left >= marco.left + 2 && r.right <= marco.right - 2 && r.top >= marco.top + 2 && r.bottom <= marco.bottom - 2;
            return dentro && !puestas.some(s => choca(r, s)) && !iconos.some(x => x.m !== b.m && choca(r, x.r)) && (puestas.push(r), true);
          });
          el.style.visibility = bien ? 'visible' : 'hidden';
        });
      }
      function resumenMarcas(zo) {
        return Object.keys(zo.marcas).sort((a, b) => zo.marcas[b] - zo.marcas[a]).map(m => m + (zo.marcas[m] > 1 ? ' ×' + zo.marcas[m] : '')).join(' · ');
      }
      function itemTienda(p, conDist) {
        const sin = p.lat == null;
        const d = conDist && yo && !sin ? `<span class="mb-dist">${esc(I.dist(distanciaM(yo, [p.lat, p.lng])))}</span>` : '';
        return `<li><button type="button" class="mb-item" data-id="${esc(p.id)}"${sin ? ' disabled' : ''}>${d}<span class="mb-nom">${esc(p.nombre)}</span>${
          p.partner ? '<span class="mb-b partner">★ Partner</span>' : ''}<small>${esc([conDist ? nombreZona(p.zona) : '', tr(p.ubic), p.dir].filter(Boolean).join(' · '))}${
          sin ? ` · <i>${esc(t('mapa.sin_ubicar'))}</i>` : ''}</small></button></li>`;
      }
      function pintarLista() {
        const visibles = tiendas.filter(pasa);
        P.cuenta(visibles.length);
        const cont = P.q('lista');
        if (ordenCerca && yo) {
          const orden = visibles.filter(p => p.lat != null).sort((a, b) => distanciaM(yo, [a.lat, a.lng]) - distanciaM(yo, [b.lat, b.lng]));
          cont.innerHTML = `<div class="mb-grupo"><h3 class="mb-grupo-tit"><span>${esc(t('alquiler.mas_cercanas'))}</span>
            <button type="button" class="mb-enlace" data-r="por-zona">${esc(t('alquiler.andorra'))}</button></h3>
            <ul class="mb-items">${orden.map(p => itemTienda(p, true)).join('')}</ul></div>`;
          cont.querySelector('[data-r="por-zona"]').addEventListener('click', () => { ordenCerca = false; pintarLista(); });
          return;
        }
        // Sector → población (en el orden de cercanía a la estación) → tiendas.
        const ordenZonas = E.ordenTiendas.filter(z => zonas[z]).concat(Object.keys(zonas).filter(z => !E.ordenTiendas.includes(z)));
        cont.innerHTML = ordenSect.map(k => {
          const zs = ordenZonas.filter(z => zonas[z].sector === k);
          if (!zs.length) return '';
          const n = zs.reduce((s, z) => s + zonas[z].items.length, 0);
          return `<div class="mb-grupo"><h3 class="mb-grupo-tit"><span><i class="mb-punto" style="background:${SECTORES[k].color}"></i>${
            esc(t('alquiler.sector', { s: SECTORES[k].nombre }))}</span><span>${n}</span></h3>${k === 'NP' ? `<p class="mb-sec mb-grupo-sub">${esc(t('alquiler.np_detalle'))}</p>` : ''}
            ${zs.map(z => {
              const zo = zonas[z];
              return `<details class="mb-zona" data-zona="${esc(z)}"><summary><b>${esc(nombreZona(z))}</b> ${esc(nTiendas(zo.items.length))}
                <span>${esc(resumenMarcas(zo))}</span></summary><ul class="mb-items">${zo.items.map(p => itemTienda(p, false)).join('')}</ul></details>`;
            }).join('')}</div>`;
        }).join('');
        cont.querySelectorAll('details.mb-zona').forEach(d => d.addEventListener('toggle', () => { if (d.open && P.ancho()) irAZona(d.dataset.zona); }));
      }
      P.q('lista').addEventListener('click', e => {
        const b = e.target.closest('.mb-item[data-id]');
        if (!b || !map) return;
        const p = tiendas.find(x => x.id === b.dataset.id);
        if (p) irATienda(p);
      });
      P.q('sub').addEventListener('click', e => {
        const b = e.target.closest('[data-sector]');
        if (b) {
          sectorSel = b.dataset.sector;
          pintar();
          const lim = limitesVista();
          if (map && lim) volarA(map, lim, MARGEN());
          avisarHost(root, 'sector', { sector: sectorSel });
          return;
        }
        if (e.target.closest('[data-r="cerca"]')) cercaDeMi();
      });
      function cercaDeMi() {
        const btn = P.q('cerca');
        if (!navigator.geolocation || !map) { P.aviso(t('alquiler.cerca_error'), 3000); return; }
        btn.classList.add('mb-cargando');
        navigator.geolocation.getCurrentPosition(pos => {
          btn.classList.remove('mb-cargando');
          btn.setAttribute('aria-pressed', 'true');
          yo = [pos.coords.latitude, pos.coords.longitude];
          if (marcaYo) marcaYo.remove();
          marcaYo = L.marker(yo, { icon: icono('<div class="mb-yo"></div>', 18), interactive: false, keyboard: false, zIndexOffset: 3000 }).addTo(map);
          ordenCerca = true;
          pintarLista();
          const cercanas = tiendas.filter(p => p.lat != null && pasa(p)).sort((a, b) => distanciaM(yo, [a.lat, a.lng]) - distanciaM(yo, [b.lat, b.lng])).slice(0, 3);
          const b = L.latLngBounds(cercanas.map(p => [p.lat, p.lng]));
          if (cercanas.length && distanciaM(yo, [cercanas[0].lat, cercanas[0].lng]) < 40000) b.extend(yo);
          volarA(map, b, { padding: [50, 50], maxZoom: 17 });
          map.once('moveend', () => { if (map.getZoom() < UMBRAL_TIENDAS) map.setZoom(UMBRAL_TIENDAS); });
          if (!P.ancho()) P.abrirLista();
          avisarHost(root, 'cerca_de_mi', {});
        }, () => {
          btn.classList.remove('mb-cargando');
          P.aviso(t('alquiler.cerca_error'), 3500);
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
      }

      cuandoVisible(P.q('mapa'), () => {
        map = L.map(P.q('mapa'), Object.assign({ zoomSnap: 0.5 }, opcionesMapa(o.modo)));
        map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
        const extra = P.nuevoMapa(map);
        vigilarTamano(P.q('mapa'), map);
        L.tileLayer(CONFIG.fondo.url, CONFIG.fondo.opciones).addTo(map);
        capaZonas = L.layerGroup();
        capaPins = L.layerGroup();
        todas = limitesDe(tiendas);
        controlBotones(map, [{ icono: ICON.casa, titulo: t('alquiler.andorra'), click: () => volarA(map, todas, MARGEN()) }].concat(extra));
        map.on('zoomend', capas);
        map.on('mb:tamano', recolocar);
        map.fitBounds(limitesVista() || todas, Object.assign({ animate: false }, MARGEN()));
        pintar();
        if (o.zona && zonas[o.zona] && zonas[o.zona].bounds) {
          // Sin animación: si Leaflet anima, el setZoom de después se aplicaría sobre el centro antiguo.
          map.fitBounds(zonas[o.zona].bounds, { padding: [50, 50], maxZoom: 17, animate: false });
          if (map.getZoom() < UMBRAL_TIENDAS) map.setZoom(UMBRAL_TIENDAS, { animate: false });
        }
      });
    }

    const lang = elegirIdioma(o.lang, o.modo);
    render(lang, o.ver);
  }

  // ---------- Montaje ----------
  function montar(el, extra) {
    const o = leerOpciones(el, extra);
    inyectarCss();
    el.classList.add('mb', 'mb--' + o.modo);
    if (o.alto) el.style.setProperty('--mb-alto', o.alto);
    el.style.setProperty('--mb-acento', ESTACIONES[o.est].color);
    const lang = elegirIdioma(o.lang, o.modo);
    // La página del QR trae su propio esqueleto (misma altura que la cabecera): se deja hasta pintar el mapa.
    if (o.modo !== 'pagina' || !el.querySelector('.esqueleto')) {
      el.innerHTML = `<div class="mb-estado" role="status"><span class="mb-spinner"></span>${esc(textoBase(lang, 'app.cargando'))}</div>`;
    }
    return Promise.all([asegurarLeaflet(), cargarDatos(o.datos)]).then(r => {
      el.innerHTML = '';
      crearWidget(el, o, r[1]);
    }).catch(e => {
      el.innerHTML = `<div class="mb-estado mb-error" role="alert"><span>${esc(textoBase(lang, 'app.error'))}</span>
        <button type="button" class="mb-boton">${esc(textoBase(lang, 'app.reintentar'))}</button></div>`;
      el.querySelector('button').addEventListener('click', () => montar(el, extra));
      if (window.console) console.error('[MapaBonos]', e);
    });
  }
  function montarTodos() {
    document.querySelectorAll('[data-mapa-bonos]').forEach(el => {
      if (el.__mapaBonos) return;
      el.__mapaBonos = true;
      montar(el);
    });
  }
  window.MapaBonos = { montar, montarTodos, estaciones: ESTACIONES, version: VERSION };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarTodos);
  else montarTodos();
})();
