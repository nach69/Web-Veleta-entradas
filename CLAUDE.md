# Landing de Veleta (entradas) — memoria del proyecto

Léelo antes de trabajar. Lo mantiene Claude; actualízalo cuando cambie algo.
Hereda lo aprendido con la web de Grupo Sobremesa (repo nach69/Private-).

## Quién y cómo hablarle
- Cliente: Nacho (socio de Grupo Sobremesa; Veleta es una de sus marcas). Español, sin jerga,
  pasos numerados. Consultarle antes de cambios grandes. Le gusta ver opciones.
- Nacho no puede abrir archivos .md ni .docx enviados: las explicaciones, en el chat.
- Tono de los textos: natural y cercano, nada de lenguaje de pitch ni de "agencia".
- No mezclar con la web del grupo (nach69/Private-), la app de tareas (nach69/Sobremesa)
  ni la futura web de fidelización de Veleta.

## Estado (26/11/2026)
- Repositorio: github.com/nach69/Web-Veleta-entradas (público). Creado vacío por Nacho el 26/11.
- Fase 1 (estructura, sin diseño) hecha en la rama `claude/confident-dijkstra-7goz2c`, **sin
  publicar**: todavía no existe `main` ni el Worker de Cloudflare.
- `datos/eventos.json` está vacío a propósito (no hay evento confirmado): la web sale en el
  estado «sin evento». Los eventos de prueba viven solo en `tests/fixtures/`.

## Qué es esta web
Landing de UNA SOLA PANTALLA, ultrarrápida, pensada para vender entradas (email → comprar).
Referencia de rapidez y originalidad: bogartconcept.es. Móvil primero: casi todo el tráfico
viene de Instagram. Mismo diseño en móvil y en ordenador.

Concepto: la primera pantalla es un abuelo en su sillón viendo la tele, con algo de veleta.
Lo que emite la tele es el evento. De ahí se pasa a la pantalla de venta.

## IMPORTANTE: qué es definitivo y qué no
- DEFINITIVO: la estructura (estados, recorrido, reglas, datos por evento).
- NO DEFINITIVO: todo lo visual. Existe un prototipo HTML de prueba (abuelo ilustrado, colores,
  tele dibujada) que solo sirve para ver la lógica. NO copiar su diseño, sus colores, su
  ilustración ni sus textos de ejemplo. El diseño real vendrá aparte; hasta entonces,
  marcadores de posición neutros y claramente provisionales (clase `.provisional`, rayado gris
  con la etiqueta «PROVISIONAL»).

## Los dos estados (cambian solos según la fecha del evento)
| Estado | Cuándo | Qué ve la gente | Qué consigue |
|---|---|---|---|
| Con evento | Hay un evento con fecha por delante | La tele emite el vídeo del evento → zoom → pantalla de venta | Entradas |
| Sin evento | No hay evento, o ya pasó la fecha | Tele pixelada sin señal → zoom → "estamos esperando al nuevo programa" + email | Lista de espera |

- No hay tercer estado: las entradas agotadas se resuelven en la ticketera.
- Al pasar la fecha del evento vuelve sola al estado sin evento (hora de Madrid; si acaba de
  madrugada, sigue visible hasta el día siguiente, como en Sobremesa).
- Evento con enlace de compra a `null`: la pantalla de venta dice «Entradas pronto» y no
  muestra botón. Nunca inventar precios ni fechas.
- Verificar que el cambio de estado funciona al cargar la página (no solo en cada build).

Cómo está hecho: la build mete en la página TODOS los eventos futuros más el bloque «sin
evento», cada uno con `data-hasta` (último día visible). `publico/js/estado.js` (en `<head>`,
antes de pintar) lee `<meta name="veleta-eventos">`, calcula el día de hoy en Madrid y pone
`<html data-actual="ev-…">` o `data-actual="ninguno"`; la build genera las reglas CSS que
enseñan solo ese bloque. Sin JavaScript se ve el estado del momento de la build (si un evento
pasa y nadie vuelve a publicar, quien no tenga JavaScript lo seguiría viendo: caso raro).

## Recorrido con evento
1. Entra y ve al abuelo y el vídeo del evento en la tele.
2. Zoom a la tele: máximo 1,5 s, se salta con un toque, y sin intro para quien ya ha entrado
   en esa sesión (guardar en sessionStorage dentro de try/catch).
3. Pantalla de venta: evento, fecha, lugar, precio y botón «Comprar entrada». Es una
   escenografía: NO cobra nada. Debe ser HTML normal con un enlace real a la ticketera, de modo
   que funcione sin JavaScript (zoom y reacción son mejora progresiva).
4. Al pulsar comprar, el abuelo reacciona (animación corta, ≤ 1 s) y se abre la ticketera. Si la
   animación falla, la ticketera se abre igual.
5. Tras comprar, fuera de la web, el comprador recibe por email un vídeo exclusivo.

La web NO sabe si alguien ha pagado, solo si ha pulsado. La reacción ocurre al pulsar.

## Datos por evento (`datos/eventos.json`; marca solo en `datos/config.json`)
Cuatro cosas por evento; si falta alguna, `null` y la web lo marca como PENDIENTE:
1. `fecha` (ISO, hora de Madrid: `"2026-12-12T23:00"`) + `horaFin` opcional (`"05:00"`)
2. `enlaceCompra` (ticketera; Fourvenues en Sobremesa → Veleta [RELLENAR])
3. `videoTele` (lo que emite la tele; archivo en `publico/video/`) + `posterTele` opcional
4. `videoExclusivo` (solo referencia: se manda por email, no se usa en la web)
Más: `nombre`, `lugar`, `precio`, `"censurado": true` para eventos aún secretos.

## Por decidir (está PARAMETRIZADO en `datos/config.json` → `opciones`; no elegir por Nacho)
1. Cómo sacamos la lista de compradores: exportar a mano de la ticketera (recomendado para
   empezar) / aviso automático / código único. Confirmar qué permite la ticketera. (No afecta a
   la web todavía.)
2. ¿Email antes de ir a la ticketera? `emailAntesDeComprar`: `no` / `opcional` (puesto por
   defecto) / `obligatorio`. Sin JavaScript siempre se puede comprar (el campo no se enseña).
3. Vídeo exclusivo: extra distinto / mismo vídeo del evento completo / decidir por evento;
   y cuándo se manda. (Solo `videoExclusivo` como referencia.)
4. Reacción del abuelo: `reaccion`: `pulgar` / `golpecito` / `brindis` / `aleatoria`.
5. Aspecto del abuelo (ilustración, vídeo real, foto con animaciones): lo decide el diseño.
6. A dónde van los emails de la lista de espera: por ahora llegan por correo a info@
   (`EMAIL_TO`), como en Sobremesa. Herramienta de email / hoja de cálculo: por decidir.
7. Sonido: `sonido`: `nunca` / `boton` (puesto: sin sonido hasta pulsar «Activar sonido»).
8. Medición: la regla heredada es «sin analítica». No hay ningún contador. Preguntar a Nacho
   antes de añadir nada.
9. Fotos, preguntas frecuentes o pie con más contenido: NO. Solo Instagram y legales en el pie.

## Reglas que ya nos funcionaron (no repetir errores)
- **No inventar datos** (fechas, sitios, precios, cuentas, nombres): lo que falta va a `null`
  y la web lo marca como PENDIENTE. Eventos: solo los que confirme Nacho.
- Eventos +18. Nada de fotos de menores.
- Nada de terceros antes de aceptar cookies; sin analítica. Lo externo (iframes, píxeles) se
  marca con `data-consent-src` y solo se carga tras «Aceptar». El aviso de cookies solo
  aparece si la página tiene algo marcado así (hoy no hay nada, así que no sale).
- **DNS**: el correo de info@gruposobremesa.com está en Google Workspace. Guardar todos los
  registros (MX, SPF, DKIM, DMARC) antes de tocar nada y no tocar el DNS sin el visto bueno de
  Nacho y del informático. Para enviar con Resend solo se AÑADEN registros.
- Con «reducir movimiento»: sin zoom ni parallax, solo fundidos; el vídeo de la tele SÍ se
  reproduce (decisión de Nacho para el vídeo de portada).
- Cada efecto de movimiento va marcado [MOV-n] en CSS y JS para poder quitarlo por separado:
  [MOV-1] zoom a la tele, [MOV-2] reacción del abuelo, [MOV-3] nieve de «sin señal».
- Guardar en el navegador siempre dentro de try/catch (modo privado).
- Rendimiento: es el objetivo principal. Nada de librerías pesadas ni fuentes externas.

## Técnica (copiada de Sobremesa, ya probada)
- Web estática con generador propio sin dependencias: `scripts/build.mjs` junta `plantillas/` +
  `datos/` + `publico/` en `dist/`. Motor mínimo: `{{> parcial}}`, `{{{bloque}}}` (HTML),
  `{{clave}}` (dato escapado; null = PENDIENTE). Páginas: portada, 3 legales y 404.
  Para las pruebas: `DATOS=tests/fixtures/estados DIST=dist-pruebas node scripts/build.mjs`
  (el `config.json` de la carpeta DATOS, si existe, se mezcla encima del real).
- La build COMPRUEBA los datos (fechas mal escritas, vídeo que no existe…) y si hay error no
  publica: la web sigue como estaba y el error sale explicado en español en Cloudflare.
- Publicación: Cloudflare **Worker** con Static Assets (plan gratuito), conectado a GitHub,
  publica desde `main`. Nombre del Worker [RELLENAR]; debe coincidir con `name` en
  `wrangler.jsonc` (de momento `veleta-entradas`). Build `npm run build`, deploy
  `npx wrangler deploy`. **No usar Netlify.** Crearlo como Worker, no como Pages.
- `src/worker.js` solo actúa en `/api/*` (`run_worker_first`); el resto lo sirve Cloudflare.
  `/api/lista` (lista de espera, y email antes de comprar con `tipo=compra`).
- Lista de espera por email: `src/lista.js` + `lib/formulario.mjs`, envío por Resend
  (RESEND_API_KEY como secreto; EMAIL_FROM; EMAIL_TO opcional). Antispam sin captcha: campo
  trampa, tiempo mínimo de 3 s (solo si llega la marca de tiempo, que pone el JS; sin JS llega
  vacía y se acepta: si no, nadie sin JavaScript podría apuntarse), comprobación de origen. A los robots se les responde «ok» sin
  enviar. Funciona también sin JavaScript (lleva a `/gracias/` o `/error-envio/`).
- Consentimiento: el correo que llega a info@ guarda fecha, IP y el texto exacto que vio la
  persona. Los textos viven en constantes (`TEXTO_ALTA_LISTA`, `TEXTO_ALTA_COMPRA`) y un test
  comprueba que coinciden con los de la página.
- `publico/_headers`: CSP estricta (todo 'self'), cabeceras de seguridad, caché larga para
  fuentes e imágenes. `noindex` en la dirección workers.dev [RELLENAR cuando exista].
- La build genera `sitemap.xml`, `robots.txt`, Open Graph y 404. Si `dominio` es `null`, no
  pone direcciones absolutas (canonical, og:url, og:image) y lo avisa.
- Pesos: la build avisa si un vídeo pasa de 3 MB o una imagen de 500 KB. Vídeo mp4 con póster,
  que se pausa cuando no se ve.
- Fuentes propias servidas desde la web, solo los pesos que se usan.

## Tipografía y estilo
- Del grupo: RL Madena (titulares; licencia del grupo para web, confirmada por Nacho;
  `publico/fuentes/rl-madena.woff2`) + Helvetica Neue (textos). Si Veleta tiene identidad
  propia (colores, letra), manda la de Veleta [RELLENAR con Nacho].
- Logo: `publico/img/logo-veleta-negro.png` (de materiales/logos de la web del grupo, recortado el margen vacío). `publico/img/og.jpg` = logo sobre blanco, provisional.

## Material de Veleta que ya existe (en nach69/Private-)
- Vídeo recap de Casino Veleta (`publico/video/casino-veleta.mp4`) y su póster.
- Fotos en `galeria/veleta/fotos-web-base/` y `publico/img/nosotros.jpg`.
- Disponibles, pero NO decidido que se usen en esta landing (no se han copiado).

## Legal (reutilizados de Sobremesa adaptándolos)
- Aviso legal, privacidad y cookies en `plantillas/legal-*.html` (borrador 26/11).
- Pendiente: datos del titular (los pasa Nacho), validar Resend, cómo se manda el vídeo
  exclusivo (sale como PENDIENTE en privacidad).
- Información básica de privacidad bajo el formulario de la lista de espera y bajo el email
  opcional antes de comprar.
- Alta rápida sin casilla: escribir el email y pulsar el botón es el consentimiento, con el
  texto a la vista. Que lo confirme el asesor.

## Cómo trabajar
- Probar antes de subir: `npm test`, `npm run test:navegador` (Chromium: los dos estados,
  cambio de estado con el reloj, con y sin JavaScript, zoom, reacción, nada de terceros, sin
  errores JS, formulario) y `npx wrangler deploy --dry-run`.
- Para ver la web publicada: pedir permiso para abrir la dirección workers.dev del Worker y
  developers.cloudflare.com.
- Commits en español; push a `main` = publicar. Trabajar en una rama y avisar antes de publicar.
- Guardar cada decisión de Nacho en este archivo, con su fecha.
