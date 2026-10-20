# Mapa de los bonos · análisis, comparativa y plan

Fecha: 20-oct-2026 · Versión analizada: v0.2 (PMV publicado en GitHub Pages) · Versión nueva: v1.0 (rama `v1`)

## 1. En 30 segundos

- **Qué es:** una página con mapas que sustituye el texto largo de los bonos: dónde están la escuela, los restaurantes que aceptan tu menú y las tiendas de alquiler. Se abre con un **QR** (página propia) o va **metida en la web** de Grandvalira (iframe o script).
- **Cómo estaba (v0.2):** la idea y los datos eran buenos, pero en un móvil con 4G tardaba **6,1 s** en enseñar el plano (una imagen de 840 KB), la página **saltaba** mientras cargaba y en el móvil el mapa quedaba por debajo de la pantalla. Solo en español.
- **Cómo queda (v1.0):** el plano se ve en **1,5–2,0 s**, la página **no salta**, pesa **menos de la mitad**, el mapa ocupa la pantalla, hay **4 idiomas**, botón **"Cerca de mí"**, separación de puntos amontonados, un **generador de enlaces y QR** y los ficheros para tu **servidor**.
- **Qué falta para producción:** 3 decisiones tuyas (servidor con HTTPS, mapa de fondo de las tiendas y cómo entra en la web de Grandvalira) y confirmar unos pocos datos. Detalle en los apartados 7 y 8.

## 2. Qué había y qué fallaba (v0.2)

Medido con el mismo banco de pruebas que el resto (apartado 9): móvil de 390 px, 4G lento, procesador ×4 más lento.

| | v0.2 (antes) | v1.0 (ahora) |
|---|---|---|
| Peso de la página (Grandvalira, 3 servicios) | 904 KB | 363 KB |
| Plano visible (LCP) | **6,1 s** | **2,0 s** (Pal Arinsal y Ordino: 1,5 s) |
| Saltos de la página al cargar (CLS; bueno < 0,1) | **0,79** | **0,003** |
| Mapa de tiendas visible | 2,9 s | 2,7 s (depende del servidor de teselas externo) |
| Idiomas | ES | ES, CA, FR, EN (los textos salen del Excel) |
| En el móvil, el mapa se ve sin bajar | No (empieza a 930 px) | Sí (ocupa la pantalla) |
| Errores de accesibilidad (axe) | sin medir | 0 |

Lo que estaba bien y se conserva: la lógica de los datos (contramarca Express/Self, Self → Express), el Excel como única fuente, el plano oficial como base, el widget único para web propia y web ajena, los enlaces "Cómo llegar".

Fallos concretos de la v0.2 (todos corregidos):
1. **Plano en una sola imagen de 840 KB:** había que descargarla entera antes de ver nada. Ahora va en teselas (trocitos de ~5 KB) y solo se piden las que se ven, con una vista previa de 30 KB que aparece al instante.
2. **Tres esperas en cadena:** página → script → Leaflet y datos → imagen. Ahora se piden en paralelo y Leaflet va en nuestro servidor (no depende de un CDN externo).
3. **La página saltaba** (el aviso "Cargando…" se cambiaba por bloques de otra altura). Ahora el hueco está reservado desde el primer momento.
4. **En el móvil el mapa quedaba debajo** de la cabecera, el simulador y el texto. Ahora es "mapa primero" y la lista e información están a un toque ("Ver lista").
5. **Burbujas y tiendas amontonadas** (El Tarter / Soldeu; 15 tiendas en Pas de la Casa). Ahora se separan y las etiquetas buscan sitio libre.
6. **Dentro de otra web el mapa "atrapaba" el dedo** al hacer scroll. Ahora, metido en otra web, se mueve con dos dedos (con uno baja la página) y en ordenador hace zoom con Ctrl + rueda, como Google Maps.
7. **Variable global `window.DATOS`**: podía chocar con la web de Grandvalira. Ahora es `MAPA_BONOS_DATOS`.
8. **Puntos sin ubicar:** salen en la lista con «Aún no está en el plano» (en el idioma del cliente) y desaparece en cuanto tienen posición en el Excel.
9. El recuadro "Simular otro pack" lo veía el cliente. Ahora está en una herramienta aparte: `generador.html`.

## 3. Comparativa con otros mapas interactivos

Misma prueba para todos (móvil, 4G lento). "Red en calma" = cuando ya no descarga nada más.

| Mapa | Qué es | Peso | Peticiones | Contenido principal visible (LCP) | Red en calma |
|---|---|---|---|---|---|
| **Nuestro v1.0** (Grandvalira, 3 servicios) | Página QR | **363 KB** | 36 | **2,0 s** | 3,7 s |
| Nuestro v0.2 | Página QR | 904 KB | 7 | 6,1 s | 6,2 s |
| grandvalira.com · Mapas | Página con enlaces a PDF | 953 KB (+ PDF de **6,9 MB**) | 52 | 2,3 s (sin mapa) | 8,6 s |
| grandvalira.com · enlace "Mapa Grandvalira 2D" | — | **no carga**: el dominio no existe (comprobado en DNS de Google, 20-oct-2026) | | | |
| grandvalira.com · Restaurantes | Lista sin mapa | 1,2 MB | 44 | 2,1 s | 7,1 s |
| Intermaps · Portes du Soleil | Mapa de pistas interactivo (proveedor líder en los Alpes) | 1,9 MB | 117 | 5,3 s | 14,4 s |
| Intermaps · Hochzillertal | Ídem | 969 KB | 110 | 3,9 s | 7,9 s |
| Portes du Soleil (web que lo inserta) | Página + iframe | 3,5 MB | 87 | 3,6 s | 11,9 s |
| Avoriaz · mapas | Página de mapas | 6,2 MB | 76 | 31 s | 34 s |
| OnTheSnow · Grandvalira | Portal con plano | 4,1 MB | 179 (47 dominios) | 2,8 s | 28 s |
| SnowStash · Hochzillertal | Portal con plano | 3,0 MB | 116 | 8,2 s | 22,5 s |
| Pic Negre · Nuestras tiendas | Buscador de tiendas | 5,4 MB | 121 | 9,0 s | 30 s |

Qué aprendemos:
- **La técnica de los líderes es la misma que la nuestra:** Intermaps usa Leaflet + plano en teselas + capas de puntos. La v1.0 hace lo mismo con un 80 % menos de peso porque solo carga lo que necesita el pack del cliente (y sin publicidad ni analítica de terceros).
- **Lo que ellos tienen y nosotros no (todavía):** estado de pistas y remontes en directo, buscador, vista 3D, app con GPS en pistas. Para un bono no hacen falta; sí serían útiles el modo sin cobertura y saber "dónde estoy" en el plano (fase 3).
- **Lo que nosotros tenemos y ellos no:** el mapa está **personalizado al pack** (solo lo que el cliente ha comprado, qué restaurantes aceptan su menú, tiendas válidas para su bono).
- La web oficial hoy manda al cliente a un PDF de 6,9 MB o a un enlace roto. Es un dato para la conversación con el equipo web, no un juicio: puede haber motivos que no conocemos.

## 4. Qué trae la v1.0

- **Tres formas de uso, un solo código** (`mapa-bonos.js`): página del QR (`index.html`), iframe (`embed.html`) y script.
- **Diseño "mapa primero"** con pestañas Escuela / Dónde comer / Alquiler; lista e información con "Ver lista"; ficha abajo al tocar un punto. En ordenador, la lista queda fija a la izquierda.
- **4 idiomas** (ES, CA, FR, EN): por defecto el del móvil del cliente; se puede forzar con `l=`. Todos los textos están en el Excel (hojas **Textos** y **Frases**), con la redacción oficial de los bonos.
- **Planos en teselas WebP** generadas desde los PDF oficiales, nítidos en pantallas de alta densidad.
- **Tiendas:** filtro por sector (**Grandvalira / Nord Pass**) con el color del sector en burbujas y pines; burbuja por población → tiendas una a una al acercarse; lista por sector y población; **"Cerca de mí"** (ordena por distancia, solo si el cliente da permiso); "Cómo llegar" con Google Maps. En el móvil empieza encuadrado en el lado de su estación.
- **Restaurantes:** filtros **Menú Express / Menú Self / Todos** (Self solo en Grandvalira; empieza en el menú del pack; cada filtro enseña solo los restaurantes de ese menú; que el Self se pueda cambiar por un Express va en Condiciones), leyenda de colores y resumen del menú elegido.
- **Comprobación del Excel** antes de publicar (IDs repetidos, núcleos que no existen, coordenadas fuera de Andorra, traducciones que faltan, `{n}` borrados…).
- **`generador.html`:** enlace corto, QR (SVG para imprenta / PNG), código iframe y script para cada pack, vista previa y tabla con todos los packs.
- **`Actualizar mapa.bat`:** doble clic → revisa el Excel → regenera → abre la vista previa → publica si dices que sí.
- **Servidor:** `docker-compose.yml` + `deploy/nginx.conf` (mismo sistema que el traductor; puerto 8503; actualizar = `git pull`).
- **Medición opcional:** el mapa avisa a la web anfitriona de lo que hace el cliente (evento `mapabonos`: pestaña, punto, "Cómo llegar", "Cerca de mí"), por si el equipo web lo quiere enviar a su analítica. El mapa no usa cookies ni rastreadores.

## 5. Cómo está hecho (en sencillo)

```
 Excel "Puntos mapa bonos.xlsx"          PDF de los planos oficiales
 (Puntos, Núcleos plano, Textos, Frases)  (planos/Plano GV 25-26.pdf…)
            │                                       │
  herramientas/generar_datos.py           herramientas/generar_planos.py
  (comprueba y convierte)                 (una vez por temporada)
            │                                       │
         datos.js                     planos/GV-2526/{z}/{x}/{y}.webp
            └──────────────┬────────────────────────┘
                     mapa-bonos.js  (+ Leaflet en vendor/)
            ┌──────────────┼──────────────────────┐
       index.html     embed.html        <div data-mapa-bonos> + script
     (página del QR)  (iframe en la web)  (script en la web)
```

- Sin base de datos ni programas que instalar en el servidor: son ficheros estáticos. Cualquier servidor web vale.
- Sin "compilar": se edita y se publica. Así lo puedes mantener tú.
- Leaflet (librería libre de mapas, la misma que usa Intermaps) va copiada en `vendor/`.

## 6. Plan por fases

| Fase | Qué | Quién | Hecho cuando… |
|---|---|---|---|
| **0. v1.0** | Rediseño, rendimiento, idiomas, herramientas, servidor | Claude | ✅ Rama `v1` (20-oct-2026) |
| **1. Revisión** | Probarlo en tu móvil y en uno de otra persona (iPhone y Android); revisar textos y traducciones en el Excel; confirmar los datos del apartado 8 | Tú (con mi ayuda para lo que cambie) | No hay nada que te chirríe y los datos dudosos están resueltos |
| **2. Publicación** | Decidir servidor + HTTPS, mapa de fondo y forma de entrar en grandvalira.com (apartado 7); subir; generar los QR | Tú decides / IT y equipo web / Claude configura | El QR abre el mapa en un móvil con datos y el mapa se ve dentro de la ficha del pack |
| **3. Mejoras** (por orden de utilidad) | 1) Funcionar **sin cobertura** en pistas tras abrirlo una vez · 2) Contar escaneos por pack con los registros del servidor (sin cookies) · 3) "Estás aquí" en el plano (tenemos posición real y posición en el plano de ~30 núcleos: se puede calcular) · 4) Foto o indicación del punto de encuentro de cada escuela · 5) Mapa de fondo propio (ver 7.b) | Claude, con tu visto bueno en cada una | Cada mejora se prueba con el mismo banco de pruebas antes de publicarla |
| **4. Cada temporada** | Nuevos PDF → `generar_planos.py` (cambiar `TEMPORADA`) → revisar X/Y de los núcleos → revisar puntos del Excel → `Actualizar mapa.bat` | Tú + Claude | Checklist en el README |

## 7. Decisiones pendientes (tuyas), con mi recomendación

**a) Dónde vive el mapa.**
- *GitHub Pages* (como ahora): gratis, HTTPS incluido, cero mantenimiento. Pega: la dirección es `abelmartinscerezo1995-arch.github.io/...`, poco corporativa, y el repositorio es público.
- *Tu servidor* (como el traductor): `docker compose up -d` y listo en el puerto 8503. **Para meterlo en grandvalira.com y para el QR necesita HTTPS y un nombre** (p. ej. `mapa.algo.com`); eso suele pasar por IT.
- **Recomendación:** seguir en GitHub Pages para la fase de pruebas y pasar al servidor (con HTTPS y un subdominio) para producción. El código es el mismo; el QR se genera con la dirección final, así que **no imprimas QR hasta tener la dirección definitiva**.

**b) Mapa de fondo de las tiendas.** Ahora usa las teselas gratuitas de OpenStreetMap France: sirven para pruebas, pero su política es de uso razonable y no garantizan servicio para una web comercial.
- *Proveedor con clave* (MapTiler, Stadia…): fácil, tiene coste según visitas.
- *Teselas propias* (Protomaps, extracto de Andorra de unos pocos MB en tu servidor): sin coste por visita, sin depender de nadie; un poco más de trabajo inicial (lo hago yo).
- **Recomendación:** teselas propias. Se cambia en un único sitio (`CONFIG.fondo` en `mapa-bonos.js`).

**c) Cómo entra en la web de Grandvalira (Drupal).**
- *iframe:* el más seguro; el editor de Drupal suele permitirlo. El alto lo fija la web (480/560/640 px).
- *script:* se integra mejor, pero muchos editores de Drupal borran los `<script>` por seguridad.
- **Recomendación:** iframe. El código de cada pack sale del generador. Hay que preguntar al equipo web si su configuración (formato de texto y política de seguridad) admite iframes de nuestra dirección.

**d) Dónde va el enlace o QR:** en el bono/voucher, en el email de confirmación, en la ficha del pack… Sin tocar el funnel de compra.

## 8. Datos por confirmar (no los doy por buenos ni por malos)

Del Excel (columna "A confirmar"):
- Escuela de Encamp: ¿punto de encuentro arriba (Cortals, llegada Funicamp) o abajo (base del Funicamp, en el pueblo)?
- "Burger Brothers" (El Cubil) no aparece con ese nombre en la web; allí está "La Suculenta", que anuncia menú Express. ¿Es el mismo?
- "Pessons": ¿restaurante de pie de pistas de Grau Roig o refugio del Llac de Pessons?
- Xiri Frankfurt (Pi de Migdia y Espiolets) y Self-Service La Cabana: la web ponía "Apertura: CERRADO" la temporada pasada.
- Esports Pirot El Tarter: Google la sitúa en Urb. Sant Pere; ¿es la de la Pleta del Tarter?
- Sin posición todavía (salen en la lista, no en el mapa): Bordes 1956, My Corner Funicamp, Terraza San Miguel, Xalet Igloo (sin núcleo en el plano), La Trattoria, Esports Pirot Signature, Rentaski, Sant Moritz (pistas).

Traducciones: las he escrito partiendo de los textos oficiales de los bonos en cada idioma. Conviene que alguien nativo o el equipo de marketing les eche un vistazo (hoja **Textos** del Excel).

## 9. Cómo se ha medido

- Navegador Microsoft Edge automatizado (Playwright), perfil igual al de Lighthouse para móvil: pantalla de 390 × 844, 4G lento (150 ms de latencia, 1,6 Mbit/s), procesador 4 veces más lento, sin caché.
- Peso = bytes descargados de todos los dominios hasta que la red queda 3 s en calma. LCP y CLS = métricas estándar de Google (Core Web Vitals; bueno: LCP < 2,5 s, CLS < 0,1).
- La v1.0 se midió en un servidor local con compresión gzip, como la tendrá nginx. Las demás webs, en vivo el 20-oct-2026: sus cifras cambian con el día, la publicidad y el aviso de cookies.
- Pruebas funcionales: 15 escenarios (3 estaciones, 4 idiomas, móvil, ordenador, iframe, acordeón del bono, fichero abierto con doble clic) sin errores en consola. Accesibilidad: axe-core 4.10 (WCAG 2 A/AA), 0 fallos en el mapa.
