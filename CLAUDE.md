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
- Datos de Nacho (26/11): ticketera **Lema**, enlace general https://veleta.lema.club (para
  comprar mientras no haya enlace propio del evento); correo de Veleta **veletavlc@gmail.com**;
  Instagram https://www.instagram.com/veletavalencia/; identidad en Instagram y en el Drive
  (ver «Identidad de Veleta»). El titular legal lo pasa Nacho al final.
- (26/11) Hero rehecho según las «decisiones finales» de Nacho (ver abajo): foto B/N casi quieta
  + zoom + sacudida + segunda pantalla a pantalla completa con TRAMOS. Sin publicar.
- Pendiente de Nacho: foto definitiva de la escena (y medir el rectángulo de la pantalla), archivo
  de la letra, nombres y precios de los tramos de cada evento, primer evento, dominio, dirección de
  envío de Resend (EMAIL_FROM), titular legal, Worker de Cloudflare, si «Eusebio» es el abuelo.
- Desde aquí no se pueden abrir veleta.lema.club ni instagram.com (red del entorno): el enlace
  de Lema está puesto tal cual lo dio Nacho, sin comprobar.

## Qué es esta web
Landing de UNA SOLA PANTALLA, ultrarrápida, pensada para vender entradas (email → comprar).
Móvil primero: casi todo el tráfico viene de Instagram. Mismo diseño en móvil y en ordenador.
Referencia principal de estructura: https://www.bogartconcept.es/ (ver "Referencias").

Veleta es una marca de tardeo para gente joven en Valencia.
Concepto: la primera pantalla es un señor mayor de espaldas en su sillón viendo la tele. Lo que
emite la tele es el evento. De ahí se pasa a la pantalla de venta.

## IMPORTANTE: qué es definitivo y qué no
- DEFINITIVO: la estructura (estados, recorrido, reglas, datos por evento) y las decisiones
  finales del hero de abajo.
- Existe un prototipo HTML de prueba que solo sirvió para ver la lógica: NO copiar nada de él.
- (26/11, Nacho, más tarde) **Colores de la marca: SOLO BLANCO Y NEGRO.** Paleta menta/amarillo
  quitada del código el 26/11. Lo PENDIENTE va en rojo (no es diseño).

### Decisiones finales del hero (Nacho, 26/11; mandan sobre lo anterior)
1. Solo blanco y negro. Logos negro/blanco (en la web: el blanco). Letra del sistema hasta que
   llegue el archivo de la de Veleta; nada de fuentes externas.
2. La escena es una foto B/N casi quieta (salón español de los 60-80): señor DE ESPALDAS en su
   sillón viendo una tele de tubo. Todo el movimiento lo pone la web, nunca la imagen. En la
   foto: nada de textos, logos, veleta ni objetos modernos.
3. La pantalla de la tele es un rectángulo definido sobre la foto (`config.json` → `escena`). El
   vídeo del evento (4:3, B/N, sin sonido) se reproduce dentro.
4. Intro automática de ~3,5 s (constantes en `publico/js/main.js`): 0,7 s quieta → 2,3 s de zoom
   lento hasta que la pantalla llena la vista → 0,5 s de «golpe de cámara» → segunda pantalla.
   Esto sustituye al antiguo «máximo 1,5 s».
5. Golpe de cámara: 2-3 oscilaciones laterales (±1,5 % translateX, giro ≤ 0,3°), frenando, con un
   destello en la pantalla. Al final el vídeo se pausa.
6. Segunda pantalla a pantalla completa (NO texto dentro de la tele): nombre, fecha, lugar y la
   lista de TRAMOS (filas grandes: nombre + precio). TODOS los tramos llevan al MISMO enlace (el
   del evento o veleta.lema.club). Son `<a href>` normales: funciona sin JavaScript. Sin estado de
   agotado. **Sin animación al pulsar: se navega y ya** (se quitó la reacción del abuelo).
7. Tema secundario por evento (`tema`: acento y/o textura). Por defecto null = B/N puro. No
   inventar temas.
8. Sin evento: misma intro con nieve animada en la tele; luego «Estamos esperando al nuevo
   programa» + email («Avísame cuando empiece la emisión»). Mismo flujo de lista de espera.
9. Email antes de la ticketera (`emailAntesDeComprar`) se mantiene; con «opcional» nunca frena.
10. Se mantiene: dos estados por fecha (Madrid, al cargar; madrugada → día siguiente; el más
    próximo gana), +18, sin analítica, nada de terceros sin consentimiento, SIEMPRE sin sonido
    (botón «Activar sonido» quitado el 26/11 a petición de Nacho).
- (26/11, Nacho) **Estética vintage / retro**: fotografía antigua de salón (años 60-80), en B/N.
  Elementos centrales: el señor en el sillón y la tele.
- Referencias de imagen (Drive, carpeta 1i7ZUqfNOx_jt9h0t9RmIY7kIWBQb7Z2V, vistas el 26/11):
  «referencia primera toma web» (contraluz de ventana, persona en sillón a la izquierda, tele a la
  derecha con el único punto de luz en pantalla), «señor al lado de tele» (retrato a cámara con
  flash, años 70-80), «señor viendo la tele en sillon» (plano general con gran angular, tele
  pequeña al fondo), «abuelo en sillon» (retrato vertical con luz lateral de ventana),
  «ejemplo tele antigua web» (tele-mueble de los 60, frontal), «ejemplo foto tele antigua»
  (tele de los 70 frontal; foto de Getty con marca de agua: solo referencia, NO usar). Hay
  además «fotos web veleta.zip» sin revisar.
- Más referencias (26/11, misma carpeta): «foto abuelo en sillon» (luz de lámpara de pie,
  gramófono), «foto abuelo viendo tele» y «foto abuelo viendo tele 2» (abuelo de espaldas/perfil,
  tele en una estantería llena de fotos en B/N; parecen hechas con IA), «foto niño viendo tele»
  (tele centrada con antena, niño de espaldas; Getty con marca de agua: NO usar), «foto chicas
  viendo tele» (vertical, sofá desenfocado como marco), «foto familia viendo tele» 1, 2 y 3
  (años 60-80; la 3 es España 1981 con la tele sin señal y el padre moviendo la antena).
- Propuestas finales del hero (chat del 26/11): 1 Eje central de espaldas, 2 Hombro en diagonal,
  3 La pared de fotos, 4 Contraluz. Descartadas: gran angular (tele muy pequeña en móvil) y
  retrato a cámara (rompe la idea de «ver la tele con él»). La decisión final (señor de espaldas,
  foto casi quieta) va en la línea de la opción 1.

## Método BICI (secundario)
En Veleta se aplica a las tareas creativas abiertas: **B**riefing (qué problema y qué queremos
conseguir), **I**nsight (qué necesita y qué motiva a la persona), **C**oncepto (cambiar de
perspectiva para no caer en lo de siempre) e **I**dea (ideas con técnicas anti-página-en-blanco,
defendiendo qué necesidad resuelve cada una).
- Ya está aplicado: de ahí salieron el abuelo y la tele y los dos estados. No
  repetir el proceso entero ni replantear el concepto. Mandan los criterios de este documento.
- Usarlo solo si surge una decisión creativa nueva que el documento no cubre (p. ej. el aspecto
  visual final, punto 5 de «Por decidir») y, aun así, consultar antes a Nacho.

## Los dos estados (cambian solos según la fecha del evento)
| Estado | Cuándo | Qué ve la gente | Qué consigue |
|---|---|---|---|
| Con evento | Hay un evento con fecha por delante | La tele emite el vídeo del evento → zoom → golpe de cámara → venta por tramos | Entradas |
| Sin evento | No hay evento, o ya pasó la fecha | Tele con nieve → zoom → golpe de cámara → "Estamos esperando al nuevo programa" + email | Lista de espera |

- No hay tercer estado: las entradas agotadas se resuelven en la ticketera.
- Al pasar la fecha del evento vuelve sola al estado sin evento (hora de Madrid; si acaba de
  madrugada, sigue visible hasta el día siguiente).
- Evento con enlace de compra a `null`: los tramos llevan al enlace general de la ticketera
  (`config.json` → `ticketera.enlaceGeneral`, hoy https://veleta.lema.club; Nacho, 26/11). Solo si
  ese también es `null`, sale «Entradas pronto» y los tramos van sin enlace. Sin tramos (`null` o
  `[]`): una sola fila «Comprar entrada» + PENDIENTE. Nunca inventar precios ni fechas.
- Verificar que el cambio de estado funciona al cargar la página (no solo en cada build).

Cómo está hecho: la build mete en la página TODOS los eventos futuros más el bloque «sin
evento», cada uno con `data-bloque`. `publico/js/estado.js` (en `<head>`, antes de pintar) lee
`<meta name="veleta-eventos">` (id + último día visible), calcula el día de hoy en Madrid y pone
`<html data-actual="ev-…">` o `data-actual="ninguno"`; las reglas CSS que enseñan solo ese
bloque las genera la build en `css/estado-<huella>.css`. Si hay varios eventos futuros se
enseña el más próximo. Sin JavaScript se ve el estado del momento de la build.

## Recorrido con evento
1. Entra y ve la foto del salón con el vídeo del evento en la tele (sin sonido).
2. Intro automática ~3,5 s: quieta → zoom → golpe de cámara. Un toque en cualquier sitio la
   salta. Quien ya la vio en esta visita va directo a la segunda pantalla (sessionStorage dentro
   de try/catch; clave `veleta_intro`). Con «reducir movimiento»: sin zoom ni sacudida, solo un
   fundido (el vídeo sí se reproduce).
3. Segunda pantalla: nombre, fecha, lugar y tramos. Escenografía: NO cobra nada; cada tramo es
   un enlace normal a la ticketera (misma pestaña, sin esperas).
4. Tras comprar, fuera de la web, el comprador recibe por email un vídeo exclusivo.

La web NO sabe si alguien ha pagado, solo si ha pulsado.

Cómo está hecha la escena: `.escena__lienzo` tiene la proporción de la foto y se recorta tipo
«cover» con CSS (variables generadas en `css/estado-<huella>.css`). La tele (`.tele`) se coloca
con los % de `escena.pantalla`. El zoom calcula en JS la escala para que el rectángulo llene la
vista (×1,02) con `transform-origin` en su centro, usando Web Animations (ids `zoom`,
`sacudida`, `destello`, `fundido`). Sin JavaScript, la escena se ve entera (con su proporción)
encima de la segunda pantalla.

## Datos por evento (`datos/eventos.json`; marca solo en `datos/config.json`)
Si falta algo, `null` y la web lo marca como PENDIENTE:
1. `fecha` (ISO, hora de Madrid: `"2026-12-12T23:00"`) + `horaFin` opcional (`"05:00"`)
2. `enlaceCompra` (enlace del evento en Lema; si es `null`, se usa el general de Lema)
3. `videoTele` (mp4 4:3 en `publico/video/`; se ve en B/N) + `posterTele` opcional
4. `videoExclusivo` (solo referencia: se manda por email, no se usa en la web)
5. `tramos`: `[{ "nombre": "…", "precio": 15 }]` (precio número en euros, ≥ 0, máx. 2 decimales; o null)
Más: `nombre`, `lugar`, `"censurado": true` para eventos aún secretos y `tema` opcional
(`{ "acento": "#rrggbb", "textura": "archivo en publico/img/texturas/" }`). `precio` suelto ya no
existe: la build lo rechaza con un mensaje.

Escena (`config.json` → `escena`): `imagen` (null = gris PROVISIONAL), `ancho`, `alto`,
`pantalla { x, y, ancho, alto }` en % de la foto y `ratioVideo` ("4:3"). La build valida todo y
avisa si la pantalla se sale de la franja que se ve en el móvil o no es 4:3.

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

Nota (26/11): decidido por Nacho: intro automática (~3,5 s); un toque la salta.

## Por decidir (PARAMETRIZADO en `datos/config.json` → `opciones`; no elegir por Nacho)
1. Cómo sacamos la lista de compradores: exportar a mano de la ticketera (recomendado para
   empezar) / aviso automático / código único. Confirmar qué ticketera usa Veleta y qué permite.
   (No afecta a la web todavía; sale PENDIENTE en privacidad.)
2. ¿Email antes de ir a la ticketera? `emailAntesDeComprar`: `no` / `opcional` (puesto) /
   `obligatorio`. Sin JavaScript nunca se pide (el enlace funciona igual).
3. Vídeo exclusivo: extra distinto / mismo vídeo del evento completo / decidir por evento;
   y cuándo se manda. (Solo `videoExclusivo` como referencia.)
4. ~~Reacción del abuelo~~: quitada (Nacho, 26/11: al tocar un tramo se navega sin animación).
5. Aspecto del abuelo (ilustración, vídeo real, foto con animaciones): lo decide el diseño.
6. A dónde van los emails de la lista de espera (herramienta de email / hoja de cálculo →
   base de asistentes de Veleta / ambas). Hoy: un correo por alta a `EMAIL_TO`.
7. Sonido: decidido (26/11): SIEMPRE sin sonido; botón «Activar sonido» quitado.
8. Medición: la regla es «sin analítica». No hay ningún contador. Preguntar a Nacho antes de
   añadir nada.
9. Fotos, preguntas frecuentes o pie con más contenido: NO. Solo Instagram y legales en el pie.
10. Correo (26/11, Nacho): Veleta usa **veletavlc@gmail.com**. Es el email de contacto de los
    legales (`config.json` → `email`) y el destino de las altas (`EMAIL_TO` en `vars` de
    `wrangler.jsonc`). Falta `EMAIL_FROM`: Resend solo envía desde un dominio verificado (no
    desde Gmail), así que hace falta un dominio (¿de Veleta?) y el visto bueno del informático
    para AÑADIR sus registros DNS. Sin EMAIL_FROM o sin clave no se envía y se avisa a la persona.
Duraciones de la intro: constantes `FASE_QUIETA_MS`, `FASE_ZOOM_MS`, `FASE_SACUDIDA_MS` en
`publico/js/main.js`. `opciones` solo admite `emailAntesDeComprar` (la build rechaza lo demás).

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
  [MOV-1] zoom a la tele, [MOV-2] golpe de cámara (+ destello), [MOV-3] nieve de «sin señal»,
  [MOV-4] grano de película animado, [MOV-5] parpadeo de la luz de la tele.
- Guardar en el navegador siempre dentro de try/catch (modo privado).
- Rendimiento: es el objetivo principal. Nada de librerías pesadas ni fuentes externas.
  Hoy (26/11): HTML+CSS+JS ≈ 12 KB comprimidos + logo 9 KB; la foto (≈150-200 KB, WebP/AVIF)
  y el vídeo van aparte. La build avisa si la foto pasa de 200 KB.

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
- Capas de ambiente baratas: grano (`publico/img/grano.svg`, 300 bytes), viñeteo y barrido con
  degradados CSS, luz de la tele con `opacity`.

## Tipografía y estilo
- Manda la identidad de Veleta (colores, letra, logo). NO usar por defecto la tipografía, los
  colores ni el estilo de la web del grupo.

### Identidad de Veleta (revisado el Drive el 26/11; colores y logo aplicados el 26/11)
- Dónde: Drive compartido → Eventos +18 → «Veleta » → «Logos / Recursos generales VELETA»
  (PNG, AI, «RECURSOS MANU» → logos veleta → PNG/AI/SVG) y la carpeta Marketing de cada evento
  (p. ej. «(7) Evento 6 Noviembre» → Marketing: Visuales Alegal, Vídeo presentación, Portada).
  Instagram @veletavalencia (no se puede abrir desde aquí).
- Colores que salen en los nombres de los logos: azul menta #8FCDC0, amarillo #C3C500
  («amarillo premiere»), negro y blanco. **Para la web, solo negro y blanco (Nacho, 26/11).**
- Logos: negro, blanco, blanco y negro, azul #8FCDC0, amarillo #C3C500, versiones «SIN
  VALENCIA», «azul hueco» y «grafiti negro». Originales en .ai.
- Letra: no hay archivos de fuente en el Drive. Preguntar a Nacho cuál es (o sacarla del .ai).
- En el plan de marketing del 6/11 sale «Eusebio» («Flyer principal: imagen Eusebio + info»):
  preguntar si es el personaje del abuelo antes de suponerlo.
- Logos en la web (`publico/img/`, recortado el margen vacío): `logo-veleta-blanco.png` (segunda
  pantalla y pie; del Drive, «logo veleta blanco.png») y `logo-veleta-negro.png` (guardado, sin
  usar ahora). El menta se borró el 26/11. `og.jpg` = logo blanco sobre negro, 1200×630. La
  carpeta SVG del Drive está vacía.

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
- Probar antes de subir: `npm test` (34 pruebas), `npm run test:navegador` (72 comprobaciones en
  Chromium: los dos estados, cambio por fecha moviendo el reloj, móvil y ordenador, con y sin
  JavaScript, fases de la intro, saltar, segunda visita, «reducir movimiento», tramos al mismo
  enlace, tema, solo B/N, nada de terceros, sin errores JS ni de CSP, formularios, enlaces) y
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
