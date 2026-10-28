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
3. Si el plano ha cambiado de dibujo, revisa las X/Y de la hoja **Núcleos plano**. Los puntos sin posición salen en la lista con «Aún no está en el plano».
4. `Actualizar mapa.bat`.

## Plano propio (prueba): Grandvalira, Pal Arinsal y Ordino Arcalís

En `plano/` hay un plano propio por estación: relieve de invierno, pistas y remontes, y **solo** restaurantes, escuelas y tiendas de alquiler. Está en pruebas y aún no sustituye al mapa de los bonos.

- Un solo enlace, `plano/`, con un botón por estación arriba (*Grandvalira · Pal Arinsal · Ordino Arcalís*). Al cambiar de estación se conservan la pestaña y el filtro.
- Enlace directo a una estación: `plano/?e=PA`. Para el enlace de un bono, `plano/?e=PA&solo=1` deja solo esa estación arriba.
- **Dónde comer** (por defecto) con filtros *Express / Self / Otros restaurantes / Todos* (el enlace de «Otros restaurantes» sigue siendo `?menu=carta`) (los que no tienen ningún restaurante en esa estación no salen, p. ej. Self en PA), **Escuela** y **Alquiler**. Botones de sector.
- Al cambiar de pestaña o de filtro, el plano va a lo nuevo del sector elegido (p. ej. de los restaurantes de Soldeu a sus tiendas); sin sector, a la vista de entrada. Si has movido el plano tú, se queda donde está mientras se vea algo.
- **Alquiler**: cada estación enseña las tiendas que caen en su plano (las del Excel valen para todas: "Todas"). Ficha con dirección, *Partner*, qué incluye el alquiler (hoja *Textos*, `alquiler.p2`) y botón **Cómo llegar** (Google Maps). En Pal Arinsal y Ordino Arcalís, un enlace lleva a las tiendas Nord Pass del otro plano. El plano no tiene calles: para llegar a la tienda, *Cómo llegar*.
- De lejos, una burbuja por sector; al acercar, cada restaurante o tienda con su nombre (sin tocar nada). Los del mismo edificio comparten pin.
- Ficha con los menús que acepta y enlace a su página oficial (grandvalira.com, palarinsal.com, ordinoarcalis.com). En el móvil sale abajo; en pantallas anchas (ordenador, tableta), a la izquierda.
- Dentro de un iframe no atrapa el desplazamiento de la página: Ctrl + rueda (ordenador) o dos dedos (móvil) para mover el plano.
- Parámetros: `e` (`GV`, `PA`, `OA`), `solo=1`, `menu` (`express`, `self`, `carta`, `todos`), `modo` (`escuela`, `alquiler`), `sector=Grau Roig`, `abrir=R-GV-13` (abre esa ficha; la estación sale del código, salvo en las tiendas: `?e=PA&abrir=T-MAS-01`), `c=lat,lon,zoom`.

Cada estación tiene su carpeta (`plano/GV/`, `plano/PA/`, `plano/OA/`) con el relieve, las líneas y los puntos. Sus datos (zona del relieve, pueblos, orden de los sectores, página de la escuela, y la caja que decide qué tiendas salen en cada plano) están en `herramientas/plano/comun.py`.

Cómo se mantiene:

| Cuándo | Qué hacer |
|---|---|
| Cambia el Excel | Nada más: `Actualizar mapa.bat` también regenera los puntos del plano de cada estación (los puntos sin coordenadas no salen; los avisa, y también si los puntos de una zona están tan separados que no se pueden enseñar juntos). |
| Cada temporada (pistas nuevas) | `python herramientas/plano/descargar.py` y después `python herramientas/plano/lineas.py`. Revisa el plano contra el oficial: las pistas salen de OpenStreetMap. |
| Cambiar la zona o el estilo del relieve | `python herramientas/plano/relieve.py` (alrededor de un minuto por estación; necesita numpy, scipy y Pillow). |
| Comprobar que todo se lee bien | `python herramientas/plano/revisar.py` (necesita Playwright y Edge): prueba 9 tamaños de pantalla y avisa si algún nombre se pisa o se esconde. |
| Añadir otra estación | Copia un bloque en `herramientas/plano/comun.py` con su código (p. ej. `XX`), ejecuta `descargar.py XX`, `relieve.py XX`, `lineas.py XX` y `puntos.py XX`, y añade su código y nombre a `ESTACIONES` en `plano/index.html` (son los botones de arriba). |

Todos los programas aceptan el código de una estación para hacer solo esa (`python herramientas/plano/lineas.py PA`); sin nada, hacen todas.

El enlace de cada restaurante sale de `mapa_bonos/propuestas/Restaurantes - fichas oficiales (propuesta).xlsx`.

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
plano/                  plano propio (prueba): página y una carpeta por estación (relieve, líneas de OSM y puntos)
herramientas/plano/     scripts del plano propio (descargar, relieve, líneas, puntos, revisar)
deploy/nginx.conf       configuración del servidor web
docker-compose.yml      arranque en el servidor
Actualizar mapa.bat     doble clic para actualizar datos
docs/PLAN.md            análisis, comparativa y plan
```

Planos © Grandvalira Resorts · Mapa de fondo © colaboradores de OpenStreetMap · Relieve del plano propio: AWS Terrain Tiles (Mapzen) · Leaflet (BSD-2) · qrcode-generator (MIT).
