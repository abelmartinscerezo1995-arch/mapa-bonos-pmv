# Mapa de los bonos (PMV)

Sustituye el texto largo de los bonos (escuela, restaurantes con contramarca y tiendas de alquiler) por una página con mapas.

- **Escuela y Dónde comer:** puntos sobre el plano oficial de pistas de cada estación (GV, PA, OA).
- **Alquiler:** mapa de Andorra con una burbuja por población; al tocarla, el mapa se acerca y muestra cada tienda con su enlace "Cómo llegar".
- Solo aparecen las pestañas de los servicios que incluye el pack.

## Dos versiones, un solo código

Todo el mapa lo pinta `mapa-bonos.js`. Se usa de dos formas:

1. **Web propia** (`index.html`): una página con cabecera que lee el pack de la dirección.
2. **Insertado en otra web** (la de Grandvalira, el bono, un CMS…): se pega un `<div>` donde se quiera el mapa y se carga el script una vez. Ver `ejemplo-embebido.html`, que es el acordeón actual del bono con los mapas dentro.

```html
<div data-mapa-bonos data-estacion="GV" data-servicios="a"></div>
<script src="https://abelmartinscerezo1995-arch.github.io/mapa-bonos-pmv/mapa-bonos.js" defer></script>
```

Atributos del `<div>`: `data-estacion`, `data-servicios`, `data-menu`, `data-ver`, `data-zona`, `data-marca` (igual que los parámetros de abajo), y además `data-resumen="no"` / `data-condiciones="no"` para ocultar los textos, `data-alto="480px"` para el alto del mapa y `data-leer-url="si"` para tomar el pack de la dirección de la página. Con un solo servicio no se muestran pestañas. El script carga Leaflet si la web no lo tiene, usa clases con prefijo `mb-` para no chocar con los estilos de la web y funciona dentro de acordeones o pestañas cerradas. También se puede montar desde JS: `MapaBonos.montar(elemento, { estacion: 'PA', servicios: 'a' })`.

## Cómo se abre

Es una página estática: basta con abrir `index.html` en el navegador (necesita internet para Leaflet y el mapa de fondo) o publicarla en GitHub Pages.

El pack va en la dirección, que es lo que pondría el enlace del bono:

| Parámetro | Valores | Ejemplo |
|---|---|---|
| `estacion` | `GV`, `PA`, `OA` | `estacion=PA` |
| `servicios` | `c` clases, `m` menú, `a` alquiler, separados por coma | `servicios=c,a` |
| `menu` | `express`, `self` (solo GV) | `menu=self` |
| `ver` | pestaña inicial: `escuela`, `comer`, `alquiler` | `ver=alquiler` |
| `zona` | abre el mapa de tiendas ya acercado a una población | `zona=Pas de la Casa` |
| `marca` | filtra las tiendas por marca | `marca=Pic Negre` |

Ejemplo: `index.html?estacion=GV&servicios=c,m,a&menu=self`

En el PMV hay además un recuadro amarillo, "Simular otro pack", para probar combinaciones sin tocar la dirección.

## Cómo se actualizan los datos

Los datos no se editan aquí: salen de la hoja `Puntos mapa bonos.xlsx`, que está fuera del repositorio (carpeta `mapa_bonos`, porque incluye comentarios internos).

1. Edita la hoja (pestaña **Puntos** para escuelas, restaurantes y tiendas; pestaña **Núcleos plano** para la posición de cada núcleo sobre el plano).
2. Ejecuta `python herramientas/generar_datos.py` → regenera `datos.js`.
3. Sube el cambio.

Si cambian los planos de pistas (nueva temporada): deja los PDF en `mapa_bonos/planos/`, ejecuta `python herramientas/generar_planos.py` y revisa las coordenadas X/Y de la hoja **Núcleos plano**.

Requisitos de los scripts: Python 3 con `openpyxl`, `pymupdf` y `Pillow`.

## Estructura

```
mapa-bonos.js               el mapa (widget): todo el JS y CSS, sin dependencias de compilación
index.html                  versión web: cabecera + simulador + el widget
ejemplo-embebido.html       ejemplo: el acordeón del bono con el widget dentro (ejemplo/bono.css = estilos del bono)
datos.js                    datos generados desde el Excel (no editar a mano)
img/plano_GV|PA|OA.jpg      planos oficiales 25-26 recortados (sin leyenda), 3200 px de ancho
herramientas/               scripts que generan datos.js y las imágenes
```

## Pendiente antes de producción

- **Puntos sin ubicar** (salen en la lista con "todavía sin ubicar"): varios restaurantes y 3 tiendas. Ver la hoja Excel.
- **Mapa de fondo:** el PMV usa las teselas gratuitas de OpenStreetMap France (estilo HOT). Para producción conviene un proveedor con clave y acuerdo de uso (MapTiler, Stadia, Esri…).
- **Idiomas:** solo español. Los nombres de los locales no se traducen; habría que traducir los textos de la interfaz (CA, FR, EN).
- **Dónde va el enlace:** botón "Ver en el mapa" en el acordeón actual o enlace/QR en el bono, sin tocar el funnel de compra.

Planos © Grandvalira Resorts · Mapa © colaboradores de OpenStreetMap.
