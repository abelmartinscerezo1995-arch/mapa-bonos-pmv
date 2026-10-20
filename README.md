# Mapa de los bonos (v1.0)

Sustituye el texto largo de los bonos por mapas: **dónde está la escuela, qué restaurantes aceptan tu menú y en qué tiendas recoges el material**, para Grandvalira, Pal Arinsal y Ordino Arcalís, en español, catalán, francés e inglés.

Análisis, comparativa con otros mapas y plan por fases: [docs/PLAN.md](docs/PLAN.md).

## Las tres formas de verlo

| Para qué | Fichero | Ejemplo |
|---|---|---|
| **QR / enlace** en el bono o el email | `index.html` | `…/?e=GV&s=cma&m=self` |
| **Dentro de la web** con iframe (recomendado en Drupal) | `embed.html` | `<iframe src="…/embed.html?e=GV&s=a" …>` |
| **Dentro de la web** con script | `mapa-bonos.js` | `<div data-mapa-bonos data-estacion="GV" data-servicios="a"></div>` + `<script src="…/mapa-bonos.js" defer></script>` |

No hace falta escribir estos códigos a mano: abre **`generador.html`**, elige estación, pack, menú e idioma y copia el enlace, descarga el QR o copia el código para la web.

Parámetros del enlace (forma corta / larga):

| | Valores | Por defecto |
|---|---|---|
| `e` / `estacion` | `GV`, `PA`, `OA` | `GV` |
| `s` / `servicios` | `c` clases, `m` menú, `a` alquiler (`cma`, `c,m,a`). También `p=f_c_m_a` (código del bono) | todos |
| `m` / `menu` | `express`, `self` (solo GV) | `express` |
| `l` / `lang` | `es`, `ca`, `fr`, `en` | el del móvil |
| `v` / `ver` | pestaña inicial: `escuela`, `comer`, `alquiler` | la primera |
| `z` / `zona` | abre las tiendas acercado a una población (`Pas de la Casa`) | — |
| `sector` | tiendas de un sector: `GV` (Grandvalira) o `NP` (Nord Pass = Pal Arinsal + Ordino Arcalís) | todas |

## Verlo en tu ordenador

Doble clic en `index.html` (o en `generador.html`). Hace falta internet solo para el mapa de fondo de las tiendas.

## Cambiar datos o textos (lo normal)

Todo sale del Excel **`Puntos mapa bonos.xlsx`** (carpeta `mapa_bonos`, fuera de este repositorio porque tiene comentarios internos):

- **Puntos:** una fila por escuela, restaurante o tienda. La columna *Sector (GV / NP)* decide en qué sector sale cada tienda (filtro y color del mapa de alquiler).
- **Núcleos plano:** posición (X/Y en píxeles) de cada núcleo sobre el plano de pistas.
- **Textos:** todos los textos del mapa en ES / CA / FR / EN. No toques la columna *Clave* ni los `{n}`. `**texto**` sale en negrita.
- **Frases:** traducción de lo que pone en Puntos (qué incluye, tipo de local, ubicación).

Después: **doble clic en `Actualizar mapa.bat`**. Revisa el Excel, explica cualquier error en castellano, regenera `datos.js`, abre la vista previa y pregunta si publicar.

(Lo mismo a mano: `python herramientas/generar_datos.py`.)

## Nueva temporada (planos nuevos)

1. Deja los PDF nuevos en `mapa_bonos/planos/` con el nombre `Plano GV 26-27.pdf` (y PA, OA).
2. En `herramientas/generar_planos.py` cambia `TEMPORADA = "26-27"` y ejecútalo (tarda ~1 minuto). Crea `planos/GV-2627/…` sin borrar la temporada anterior.
3. Si el plano ha cambiado de dibujo, revisa las X/Y de la hoja **Núcleos plano** (abre el mapa con `?debug=1` para ver qué falta).
4. `Actualizar mapa.bat`.

## Publicarlo en tu servidor

Igual que el traductor del manual de ventas (Docker):

```
git clone https://github.com/abelmartinscerezo1995-arch/mapa-bonos-pmv.git
cd mapa-bonos-pmv
docker compose up -d          # queda en http://SERVIDOR:8503/
```

Para actualizar después: `git pull` (no hace falta reiniciar). Para usarlo en grandvalira.com y en los QR hace falta **HTTPS** y un nombre de dominio (lo da IT). Ver `docs/PLAN.md`, apartado 7.

## Qué es cada fichero

```
index.html              página del QR
embed.html              versión para iframe
mapa-bonos.js           el mapa (todo el código y los estilos; sin compilar)
datos.js                datos generados desde el Excel (no editar a mano)
generador.html          herramienta interna: enlaces, QR y código para la web
ejemplo-embebido.html   ejemplo: el acordeón actual del bono con el mapa dentro
planos/                 teselas de los planos oficiales (generadas desde los PDF)
vendor/                 Leaflet 1.9.4 y el generador de QR (librerías libres)
herramientas/           scripts que generan datos.js y las teselas (Python 3 + openpyxl, pymupdf, Pillow)
deploy/nginx.conf       configuración del servidor web
docker-compose.yml      arranque en el servidor
Actualizar mapa.bat     doble clic para actualizar datos
docs/PLAN.md            análisis, comparativa y plan
```

Planos © Grandvalira Resorts · Mapa de fondo © colaboradores de OpenStreetMap · Leaflet (BSD-2) · qrcode-generator (MIT).
