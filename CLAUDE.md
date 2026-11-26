# Landing de Veleta (entradas) — memoria del proyecto

Léelo antes de trabajar. Lo mantiene Claude; actualízalo cuando cambie algo.

## ESTA WEB NO ES LA DE SOBREMESA
- Es la web de VELETA, una marca con identidad propia. No tiene un enfoque parecido al de la
  web del grupo Sobremesa: ni estructura, ni diseño, ni tipografía, ni tono, ni plantillas.
- La web del grupo es una web con varias secciones. Esta es UNA SOLA PANTALLA que se vive como
  una experiencia (el abuelo y la tele) y lleva a comprar.
- De Sobremesa se reutiliza SOLO la parte técnica ya probada (ver "Técnica") y las reglas de
  seguridad y legales. Nada de diseño, textos ni estructura.
- Si dudas entre «como en Sobremesa» y «distinto», es distinto. Pregunta a Nacho.
- (26/11) Se quitaron de la fase 1 la letra RL Madena, el estilo de titulares del grupo,
  «Grupo Sobremesa» como responsable y el correo info@ del grupo. No volver a meterlos.

## Quién y cómo hablarle
- Cliente: Nacho (socio de Grupo Sobremesa; Veleta es una de sus marcas). Español, sin jerga,
  pasos numerados. Consultarle antes de cambios grandes. Le gusta ver opciones.
- Nacho no puede abrir archivos .md ni .docx enviados: las explicaciones, en el chat.
- Tono de los textos: natural y cercano, nada de lenguaje de pitch ni de "agencia".
- No mezclar con la web del grupo (nach69/Private-), la app de tareas (nach69/Sobremesa)
  ni la futura web de fidelización de Veleta.

## Estado (26/11/2026)
- Repositorio: github.com/nach69/Web-Veleta-entradas (público). Creado vacío por Nacho el 26/11.
- Fase 1 (estructura, sin diseño) en la rama `claude/confident-dijkstra-7goz2c`, **sin
  publicar**: todavía no existe `main` ni el Worker de Cloudflare. GitHub tomó esa rama como
  principal por ser la primera; ordenarlo al publicar.
- `datos/eventos.json` está vacío a propósito (no hay evento confirmado): la web sale en el
  estado «sin evento». Los eventos de prueba viven solo en `tests/fixtures/`.
- Pendiente de Nacho: primer evento, ticketera, Instagram, dominio, identidad de Veleta,
  titular legal, correos (punto 10 de «Por decidir»), nombre del Worker.

## Qué es esta web
Landing de UNA SOLA PANTALLA, ultrarrápida, pensada para vender entradas (email → comprar).
Móvil primero: casi todo el tráfico viene de Instagram. Mismo diseño en móvil y en ordenador.
Referencia principal de estructura: https://www.bogartconcept.es/ (ver "Referencias").

Concepto: la primera pantalla es un abuelo en su sillón viendo la tele, con algo de veleta.
Lo que emite la tele es el evento. De ahí se pasa a la pantalla de venta.

## IMPORTANTE: qué es definitivo y qué no
- DEFINITIVO: la estructura (estados, recorrido, reglas, datos por evento).
- NO DEFINITIVO: todo lo visual. Existe un prototipo HTML de prueba (abuelo ilustrado, colores,
  tele dibujada) que solo sirve para ver la lógica. NO copiar su diseño, sus colores, su
  ilustración ni sus textos de ejemplo. El diseño real vendrá aparte; hasta entonces,
  marcadores de posición neutros y claramente provisionales (clase `.provisional`: rayado gris
  con la etiqueta «PROVISIONAL»; letra del sistema).

## Los dos estados (cambian solos según la fecha del evento)
| Estado | Cuándo | Qué ve la gente | Qué consigue |
|---|---|---|---|
| Con evento | Hay un evento con fecha por delante | La tele emite el vídeo del evento → zoom → pantalla de venta | Entradas |
| Sin evento | No hay evento, o ya pasó la fecha | Tele pixelada sin señal → zoom → "estamos esperando al nuevo programa" + email | Lista de espera |

- No hay tercer estado: las entradas agotadas se resuelven en la ticketera.
- Al pasar la fecha del evento vuelve sola al estado sin evento (hora de Madrid; si acaba de
  madrugada, sigue visible hasta el día siguiente).
- Evento con enlace de compra a `null`: la pantalla de venta dice «Entradas pronto» y no
  muestra botón. Nunca inventar precios ni fechas.
- Verificar que el cambio de estado funciona al cargar la página (no solo en cada build).

Cómo está hecho: la build mete en la página TODOS los eventos futuros más el bloque «sin
evento», cada uno con `data-bloque`. `publico/js/estado.js` (en `<head>`, antes de pintar) lee
`<meta name="veleta-eventos">` (id + último día visible), calcula el día de hoy en Madrid y pone
`<html data-actual="ev-…">` o `data-actual="ninguno"`; las reglas CSS que enseñan solo ese
bloque las genera la build en `css/estado-<huella>.css`. Si hay varios eventos futuros se
enseña el más próximo. Sin JavaScript se ve el estado del momento de la build.

## Recorrido con evento
1. Entra y ve al abuelo y el vídeo del evento en la tele.
2. Zoom a la tele: máximo 1,5 s, se salta con un toque, y sin intro para quien ya ha entrado
   en esa sesión (guardar en sessionStorage dentro de try/catch; clave `veleta_intro`).
3. Pantalla de venta: evento, fecha, lugar, precio y botón «Comprar entrada». Es una
   escenografía: NO cobra nada. Debe ser HTML normal con un enlace real a la ticketera, de modo
   que funcione sin JavaScript (zoom y reacción son mejora progresiva).
4. Al pulsar comprar, el abuelo reacciona (animación corta, ≤ 1 s) y se abre la ticketera. Si la
   animación falla, la ticketera se abre igual. (Hecho: se abre en la misma pestaña tras
   `reaccionMs`; Ctrl/Cmd+clic y similares no se retrasan.)
5. Tras comprar, fuera de la web, el comprador recibe por email un vídeo exclusivo.

La web NO sabe si alguien ha pagado, solo si ha pulsado. La reacción ocurre al pulsar.

## Datos por evento (`datos/eventos.json`; marca solo en `datos/config.json`)
Cuatro cosas por evento; si falta alguna, `null` y la web lo marca como PENDIENTE:
1. `fecha` (ISO, hora de Madrid: `"2026-12-12T23:00"`) + `horaFin` opcional (`"05:00"`)
2. `enlaceCompra` (ticketera de Veleta [RELLENAR])
3. `videoTele` (lo que emite la tele; archivo en `publico/video/`) + `posterTele` opcional
4. `videoExclusivo` (solo referencia: se manda por email, no se usa en la web)
Más: `nombre`, `lugar`, `precio`, `"censurado": true` para eventos aún secretos.

## Referencias de webs (para inspirarse en la LÓGICA, no para copiar el diseño)
Regla: de cada referencia se toma una idea concreta de cómo funciona. No se copia su aspecto,
colores, textos ni imágenes. Abre cada enlace (en móvil y en ordenador) antes de proponer nada.
Las marcadas "Visto" las ha abierto Claude en un navegador; las marcadas "Solo leído" se
conocen por texto y hay que comprobarlas.

### Referencia principal
**Bogart Concept** — https://www.bogartconcept.es/  (Visto)
- Qué mirar: la pantalla de entrada es un gesto («click here to play»), no un menú. Al pulsar,
  pasa a una pantalla de TICKETS. Cuando no hay evento, esa pantalla lo dice claramente
  («No event is available right now») con botones Back / Continue.
- Qué nos sirve: entrada-gesto, venta a un paso y estado sin evento como pantalla propia.
- Qué NO copiar: el naranja, el dragón, el logo de la cerveza, los textos en inglés.
- Diferencia con lo nuestro: nuestro estado sin evento no es solo un aviso, capta emails.

### Ropa
**Belaguer** (Valencia) — https://www.belaguer.com  (Visto)
- Qué mirar: foto a pantalla completa y un menú diminuto en el centro (SHOP, ABOUT, INFO, CART).
  Poquísima interfaz; la tienda está a un clic.
- Qué nos sirve: cuánto se puede quitar de la interfaz sin perder claridad.
- Qué NO copiar: la fotografía ni el logo. Ojo: pide aceptar cookies nada más entrar; la
  nuestra solo debe cargar terceros tras «Aceptar».

### Fiesta
**El Tardet** (tardeo, Barcelona) — https://eltardet.es  (Visto)
- Qué mirar: botón de «Comprar entradas» siempre visible en la cabecera (en ordenador).
- Qué NO copiar: la estructura, que es de web con varias secciones, ni que el botón grande de
  la portada sea de reserva y no de compra. En Veleta el botón principal es el de comprar.

**elrow** (Barcelona) — https://elrow.com  (Visto)
- Qué mirar: tono y energía de marca y botón «Próximos eventos» siempre en la cabecera.
- Qué NO copiar: la estructura, que es de web grande con muchas secciones.

### Solo leídas (comprobar antes de usar)
- **Nite Riot** — https://tympanus.net/codrops/2025/04/15/nite-riot-minimalism-gets-a-wild-side/
  «Minimalismo con un toque de caos»: interfaz sobria y pantalla de carga con personalidad. Es
  una web de productora, no vende nada: solo para ver cómo se mete carácter en algo mínimo.
- **N8BM Wien** — https://n8bm-wien.webflow.io
  Iniciativa de vida nocturna de Viena. Modo oscuro, formas geométricas y efectos al pasar el
  ratón. No vende entradas: solo referencia de ambiente.
- **Plantilla Nightlist** — https://www.framer.com/marketplace/templates/nightlist/
  Mecanismo parecido al nuestro: empieza con una entrada digital que, al tocarla, revela la
  página del evento con un botón. Es una plantilla, no una marca real.

### Dónde buscar más (no se pudieron abrir desde aquí)
- https://www.awwwards.com/websites/fashion/
- https://www.awwwards.com/websites/single-page/
Si Nacho trae nuevas referencias, añadirlas aquí con el mismo formato (qué mirar / qué nos
sirve / qué NO copiar) y marcar si se han visto o no.

### Lo que sacamos de todas
1. La entrada es un gesto, no un menú.
2. El estado sin evento es una pantalla con sentido propio (y capta emails).
3. Poca interfaz: como mucho, el botón de comprar siempre visible.
4. La personalidad va en el contenido y el movimiento, no en cargar la pantalla de elementos.

Nota (26/11): hoy la intro pasa sola a la venta en 1,5 s y un toque la adelanta. Si Nacho
quiere que la entrada sea un gesto (esperar al toque, como Bogart), es un cambio pequeño en
`main.js` (no lanzar el temporizador); preguntárselo antes, porque choca con «máximo 1,5 s».

## Por decidir (PARAMETRIZADO en `datos/config.json` → `opciones`; no elegir por Nacho)
1. Cómo sacamos la lista de compradores: exportar a mano de la ticketera (recomendado para
   empezar) / aviso automático / código único. Confirmar qué ticketera usa Veleta y qué permite.
   (No afecta a la web todavía; sale PENDIENTE en privacidad.)
2. ¿Email antes de ir a la ticketera? `emailAntesDeComprar`: `no` / `opcional` (puesto) /
   `obligatorio`. Sin JavaScript nunca se pide (el enlace funciona igual).
3. Vídeo exclusivo: extra distinto / mismo vídeo del evento completo / decidir por evento;
   y cuándo se manda. (Solo `videoExclusivo` como referencia.)
4. Reacción del abuelo: `reaccion`: `pulgar` (puesto) / `golpecito` / `brindis` / `aleatoria`.
5. Aspecto del abuelo (ilustración, vídeo real, foto con animaciones): lo decide el diseño.
6. A dónde van los emails de la lista de espera (herramienta de email / hoja de cálculo →
   base de asistentes de Veleta / ambas). Hoy: un correo por alta a `EMAIL_TO`.
7. Sonido: `sonido`: `nunca` / `boton` (puesto: sin sonido hasta pulsar «Activar sonido»).
8. Medición: la regla es «sin analítica». No hay ningún contador. Preguntar a Nacho antes de
   añadir nada.
9. Fotos, preguntas frecuentes o pie con más contenido: NO. Solo Instagram y legales en el pie.
10. Correo desde el que se envía y al que llega la lista de espera: ¿el del grupo o uno de
    Veleta? Preguntar a Nacho. Hoy `EMAIL_FROM` y `EMAIL_TO` son obligatorios en el Worker (sin
    ellos no se envía y se avisa a la persona) y `email` en `config.json` está a `null`.
Duraciones: `introMaxMs` (≤ 1500) y `reaccionMs` (≤ 1000); la build rechaza valores mayores.

## Reglas que ya nos funcionaron (no repetir errores)
- **No inventar datos** (fechas, sitios, precios, cuentas, nombres): lo que falta va a `null`
  y la web lo marca como PENDIENTE. Eventos: solo los que confirme Nacho.
- Eventos +18. Nada de fotos de menores.
- Nada de terceros antes de aceptar cookies; sin analítica. Lo externo (iframes, píxeles) se
  marca con `data-consent-src` y solo se carga tras «Aceptar». El aviso de cookies solo
  aparece si la página tiene algo marcado así (hoy no hay nada, así que no sale).
- **DNS**: el correo del grupo está en Google Workspace. Guardar todos los registros (MX, SPF,
  DKIM, DMARC) antes de tocar nada y no tocar el DNS sin el visto bueno de Nacho y del
  informático. Para enviar con Resend solo se AÑADEN registros.
- Con «reducir movimiento»: sin zoom ni parallax, solo fundidos; el vídeo de la tele SÍ se
  reproduce.
- Cada efecto de movimiento va marcado [MOV-n] en CSS y JS para poder quitarlo por separado:
  [MOV-1] zoom a la tele, [MOV-2] reacción del abuelo, [MOV-3] nieve de «sin señal».
- Guardar en el navegador siempre dentro de try/catch (modo privado).
- Rendimiento: es el objetivo principal. Nada de librerías pesadas ni fuentes externas.
  Hoy la página pesa unos 40 KB sin contar el vídeo.

## Técnica (solo infraestructura, reutilizada de la web de Sobremesa y ya probada)
- Web estática con generador propio sin dependencias: `scripts/build.mjs` junta `plantillas/` +
  `datos/` + `publico/` en `dist/`. Motor mínimo: `{{> parcial}}`, `{{{bloque}}}` (HTML),
  `{{clave}}` (dato escapado; null = PENDIENTE). Páginas: la landing, 3 legales, «gracias»,
  «error al enviar» y 404. Para las pruebas:
  `DATOS=tests/fixtures/estados DIST=dist-pruebas node scripts/build.mjs` (el `config.json` y la
  carpeta `publico/` de DATOS, si existen, se ponen encima de los reales).
- La build COMPRUEBA los datos (fechas mal escritas, vídeo que no existe, opciones con valores
  raros…) y si hay error no publica: la web sigue como estaba y el error sale explicado en
  español en Cloudflare.
- Publicación: Cloudflare **Worker** con Static Assets (plan gratuito), conectado a GitHub,
  publica desde `main`. Nombre del Worker [RELLENAR]; debe coincidir con `name` en
  `wrangler.jsonc` (de momento `veleta-entradas`). Build `npm run build`, deploy
  `npx wrangler deploy`. **No usar Netlify.** Crearlo como Worker, no como Pages.
- `src/worker.js` solo actúa en `/api/*` (`run_worker_first`); el resto lo sirve Cloudflare.
- Lista de espera por email: `/api/lista` → `src/lista.js` (equivale al `contacto.js` de
  Sobremesa) + `lib/formulario.mjs`, envío por Resend (RESEND_API_KEY como secreto; EMAIL_FROM;
  EMAIL_TO). El email antes de comprar va al mismo sitio con `tipo=compra` (keepalive, no frena
  la compra). Antispam sin captcha: campo trampa, tiempo mínimo de 3 s (solo si llega la marca
  de tiempo, que pone el JS; sin JS llega vacía y se acepta: si no, nadie sin JavaScript podría
  apuntarse) y comprobación de origen (no hay límite de enlaces: solo hay un campo de email).
  A los robots se les responde «ok» sin enviar. Sin JavaScript lleva a `/gracias/` o
  `/error-envio/`.
- Consentimiento: el correo que llega guarda fecha, IP y el texto exacto que vio la persona.
  Los textos viven en constantes (`TEXTO_ALTA_LISTA`, `TEXTO_ALTA_COMPRA`) y un test comprueba
  que coinciden con los de la página.
- `publico/_headers`: CSP estricta (todo 'self'; ni scripts ni estilos en línea: las opciones
  van en `<meta name="veleta-opciones">`), cabeceras de seguridad, caché larga para imágenes.
  `noindex` en la dirección workers.dev [RELLENAR cuando exista].
- La build genera `robots.txt`, Open Graph y 404. Con `dominio` a `null` no pone direcciones
  absolutas (canonical, og:url, og:image) ni `sitemap.xml`, y lo avisa.
- Pesos: la build avisa si un vídeo pasa de 3 MB o una imagen de 500 KB. Vídeo mp4 con póster,
  que se pausa cuando no se ve.
- Fuentes propias servidas desde la web, solo los pesos que se usan (hoy ninguna: letra del
  sistema hasta tener la de Veleta).

## Tipografía y estilo
- Manda la identidad de Veleta (colores, letra, logo) [RELLENAR con Nacho]. NO usar por
  defecto la tipografía, los colores ni el estilo de la web del grupo.
- Logo de Veleta: `publico/img/logo-veleta-negro.png` (de `veleta-negro.png` en los
  materiales de nach69/Private-, recortado el margen vacío). `publico/img/og.jpg` = logo sobre
  blanco, provisional.

## Material de Veleta que ya existe (en nach69/Private-)
- Vídeo recap de Casino Veleta (`publico/video/casino-veleta.mp4`) y su póster.
- Fotos en `galeria/veleta/fotos-web-base/` y `publico/img/nosotros.jpg`.
- Disponibles, pero NO decidido que se usen en esta landing (no se han copiado).

## Legal (reutilizar de Sobremesa solo como base, adaptándolo a Veleta)
- Aviso legal, privacidad y cookies en `plantillas/legal-*.html` (borrador 26/11), adaptados a
  Veleta, sin nombres ni frases de Sobremesa.
- Pendiente: datos del titular de Veleta (los pasa Nacho), email de contacto, validar Resend,
  cómo se manda el vídeo exclusivo (sale PENDIENTE en privacidad).
- Información básica de privacidad bajo el formulario de la lista de espera y bajo el email
  antes de comprar.
- Alta rápida sin casilla: escribir el email y pulsar el botón es el consentimiento, con el
  texto a la vista. Que lo confirme el asesor.

## Cómo trabajar
- Probar antes de subir: `npm test`, `npm run test:navegador` (Chromium: los dos estados,
  cambio de estado moviendo el reloj, con y sin JavaScript, zoom, reacción, «reducir
  movimiento», nada de terceros, sin errores JS ni de CSP, formularios, enlaces) y
  `npx wrangler deploy --dry-run`.
- Para ver la web publicada: pedir permiso para abrir la dirección workers.dev del Worker y
  developers.cloudflare.com.
- Commits en español; push a `main` = publicar. Trabajar en una rama y avisar antes de publicar.
- Guardar cada decisión de Nacho en este archivo, con su fecha.

## Piezas técnicas que se copiaron de la web de Sobremesa
Solo infraestructura; ninguna plantilla de diseño ni texto de marca.
- Motor: `scripts/build.mjs` y `scripts/lib.mjs` (recortados y adaptados a una sola pantalla).
- Formulario y correos: `src/worker.js`, `src/lista.js`, `lib/formulario.mjs`.
- Cloudflare y seguridad: `wrangler.jsonc` y `publico/_headers`.
- Cookies: `plantillas/parciales/cookies.html` (texto reescrito). No hay invitación a la
  newsletter: la lista de espera ya es la pantalla «sin evento».
- Textos legales: `plantillas/legal-*.html`, adaptados.
- Pruebas: carpeta `tests/`. Guía de eventos: `README.md`.
