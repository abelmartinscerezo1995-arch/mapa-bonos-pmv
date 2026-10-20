# Evaluación de la v1 y propuestas de mejora

Fecha: 20-oct-2026. Material de apoyo en `C:\Proyectos\mapa_bonos\propuestas\` (fuera del repositorio):
- `Escuela - 4 opciones en el movil.png`: comparativa de la pestaña Escuela.
- `escuela_tarjetas\d_tarjetas.html`: prototipo de la opción D (abrir con doble clic).
- `Restaurantes - fichas oficiales (propuesta).xlsx`: qué ficha de la web oficial corresponde a cada restaurante, para validar.

## 1. Nota por áreas

| Área | Nota | Por qué |
|---|---|---|
| Rendimiento | ★★★★★ | Plano visible en 1,5–2 s con 4G lento; mejor que Intermaps y que la web oficial |
| Fidelidad a los bonos | ★★★★★ | Restaurantes Express/Self, inicio de clases y tiendas coinciden con los 100 ficheros de los bonos |
| Accesibilidad | ★★★★★ | 0 fallos (axe, WCAG 2 AA) |
| Alquiler | ★★★★☆ | Sectores, "Cerca de mí", "Cómo llegar". Falta teléfono / web / reserva de cada tienda |
| Dónde comer | ★★★☆☆ | Filtros claros. Los pines solo llevan un número (hay que tocarlos para saber qué son) y la ficha no tiene foto, horario ni enlace |
| **Escuela** | ★★☆☆☆ | Dice *dónde*, pero no *a qué hora*, *dónde exactamente se queda* ni *cómo se llega*. En el móvil se ven 2 de las 6 escuelas de Grandvalira |
| Aspecto | ★★★☆☆ | Limpio pero genérico (sin logo ni tipografía de la marca). El plano, en el móvil, se ve recargado |
| Idiomas | ★★★★☆ | ES/CA/FR/EN con textos oficiales; falta revisión de alguien nativo |
| Mantenimiento | ★★★★☆ | Todo sale del Excel con comprobación automática y `Actualizar mapa.bat` |
| Publicación y medición | ★☆☆☆☆ | Sin publicar: falta HTTPS/dominio, mapa de fondo definitivo y saber si se usa |
| Sin cobertura en pistas | ★☆☆☆☆ | Sin conexión no carga |

## 2. ¿El plano es "cutre"?

No el plano: es la ilustración oficial, profesional y la que el cliente ve en papel y en la estación. Lo que se ve pobre es **cómo lo enseñamos en el móvil**:
- Es un dibujo pensado para imprimir a casi un metro de ancho; en el móvil enseñamos un trozo y sobra detalle (números de remontes, iconos de servicios).
- Nuestros pines compiten con los iconos azules del propio plano ("Sector Soldeu", "i", WC…).
- Para ver las 6 escuelas hay que arrastrar; de entrada se ven 2.

Se probaron 4 opciones para Escuela (captura en `propuestas/`):

| Opción | Resultado |
|---|---|
| A · Ahora | Recargado, 2 de 6 escuelas visibles |
| B · Plano atenuado (menos color, pines y nombres más visibles) | Ayuda poco: sigue viéndose solo una parte |
| C · Mapa real con pistas de OpenStreetMap (670 pistas y 140 remontes en Andorra) | Exacto y permitiría "Estás aquí", pero de lejos no se ven las pistas y de cerca es un lío de líneas; necesitaría mucho trabajo de cartografía. **No ahora** |
| **D · Tarjetas con el trozo del plano** | **La más clara**: una tarjeta por escuela con el recorte del plano oficial alrededor del punto, nombre, altitud y días. Cada cliente va a una escuela, no necesita ver las 6 a la vez |

## 3. Restaurantes: enlace a la ficha oficial

- grandvalira.com (32 fichas), palarinsal.com (9) y ordinoarcalis.com (6) tienen ficha de restaurante en **4 idiomas** (el enlace puede abrir en el idioma del cliente), con temporada, horario, servicios, reservas, carta y fotos.
- De los 38 restaurantes con menú del pack: **24 con ficha segura, 7 probables (a confirmar), 7 sin ficha** (Fun Food ×2, L'ou del Pla de les Pedres, Bordes 1956, La Plage Blanche, Terraza San Miguel, Xalet Igloo). De los 60 restaurantes del mapa, 44 tienen ficha segura.
- Recomendación: **enlazar, no copiar** horarios (cambian cada temporada; la web oficial ya los mantiene).
- Ojo: hoy las fichas enseñan la información de **verano** y dos ponen "Apertura: CERRADO" (Frankfurt Gourmets y La Cabana). Hay que volver a mirarlas cuando cambien a invierno.

## 4. Escuela: qué le falta al cliente

Lo que necesita el primer día y hoy no le damos:
1. **Hora** de inicio (los bonos no la dicen).
2. **Punto de encuentro exacto** (no basta "Espiolets": ¿a la salida del telecabina? ¿delante de la escuela?).
3. **Cómo llegar**: qué remonte coger desde el pueblo o el aparcamiento (p. ej. "Telecabina de Soldeu hasta Espiolets"). Se puede preparar un borrador con el plano y OpenStreetMap para que lo confirme la escuela.
4. **Teléfono** de la escuela, por si llega tarde o hay incidencias.
5. Opcional: una foto del punto de encuentro.

Dato de la web oficial: en Grandvalira hay **dos escuelas**: *Ski & Mountain Academy* (Encamp, Peretol, Grau Roig, Pas de la Casa) y la *Escuela de esquí y snowboard* (Canillo, El Tarter, Soldeu). El mapa las llama todas "Escuela Grandvalira …". Conviene usar el nombre que verá el cliente en la puerta.

## 5. Propuestas, por orden

| # | Qué | Esfuerzo | Necesita de ti |
|---|---|---|---|
| 1 | **Escuela en tarjetas** (opción D) con "Ver en el plano"; campos nuevos en el Excel: hora, punto de encuentro, cómo llegar, teléfono | Medio | Hora, punto exacto y teléfono de cada escuela (o quién los sabe) |
| 2 | **Enlace a la ficha oficial** de cada restaurante en el idioma del cliente (columna nueva en el Excel) | Bajo | Validar la tabla (7 dudosos) |
| 3 | **Dónde comer más legible**: nombre del núcleo en los pines al acercar y plano algo atenuado | Bajo | — |
| 4 | **Imagen de marca**: logo y tipografía de Grandvalira Resorts | Bajo | Logo oficial / guía de marca |
| 5 | **Tiendas**: teléfono y web / reserva | Bajo | Datos (o permiso para sacarlos de las webs de las tiendas) |
| 6 | Publicar con HTTPS, medir uso (registros del servidor, sin cookies), funcionar sin cobertura | Medio | Decisiones del PLAN.md §7 |
| 7 | "Estás aquí" (mapa real o plano georreferenciado) | Alto | — (más adelante) |
