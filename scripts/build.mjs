// Construye la landing en dist/ a partir de plantillas/, datos/ y publico/.
// Sin dependencias: solo Node. Uso: node scripts/build.mjs
// Para las pruebas: DATOS=tests/fixtures/estados DIST=dist-pruebas node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  hoyEnMadrid, erroresEvento, erroresOpciones, erroresEscena, eventosFuturos, eventoActual, visibleHasta,
  fechaLegible, idEvento, escapar, formatearPrecio
} from './lib.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = resolve(RAIZ, process.env.DATOS || 'datos');
const DIST = resolve(RAIZ, process.env.DIST || 'dist');
const leer = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8');
const avisos = [];
const errores = [];

function leerJSON(ruta, nombre) {
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    errores.push(`${nombre} no se puede leer: ${e.code === 'ENOENT' ? 'no existe' : 'está mal escrito (revisa comas, comillas y llaves). Detalle: ' + e.message}`);
    return null;
  }
}

// config.json real; si la carpeta de datos de prueba trae otro, se mezcla encima.
let config = leerJSON(join(RAIZ, 'datos/config.json'), 'datos/config.json') || {};
if (DATOS !== join(RAIZ, 'datos') && existsSync(join(DATOS, 'config.json'))) {
  const extra = leerJSON(join(DATOS, 'config.json'), 'config.json de pruebas') || {};
  config = { ...config, ...extra, opciones: { ...config.opciones, ...extra.opciones }, escena: { ...config.escena, ...extra.escena } };
}
const eventos = leerJSON(join(DATOS, 'eventos.json'), 'eventos.json') || [];
// Archivos extra de la carpeta de datos de pruebas (p. ej. un vídeo de prueba): se copian encima de publico/.
const PUBLICO_EXTRA = DATOS !== join(RAIZ, 'datos') && existsSync(join(DATOS, 'publico')) ? join(DATOS, 'publico') : null;
const archivoPublico = (ruta) => [join(RAIZ, 'publico', ruta), PUBLICO_EXTRA && join(PUBLICO_EXTRA, ruta)].find((r) => r && existsSync(r));

// ---------- Comprobaciones: un error en los datos para la publicación (mejor que publicar algo roto) ----------
if (!Array.isArray(eventos)) errores.push('eventos.json tiene que ser una lista entre [ y ] (vacía si no hay eventos: [])');
else eventos.forEach((ev, i) => erroresEvento(ev).forEach((e) => errores.push(`eventos.json, evento ${i + 1}: ${e}`)));
erroresOpciones(config.opciones).forEach((e) => errores.push(`config.json: ${e}`));
erroresEscena(config.escena).forEach((e) => errores.push(`config.json: ${e}`));
if (!config.nombre) errores.push('config.json: falta "nombre" (el nombre de la marca)');
const ticketera = config.ticketera || {};
if (ticketera.enlaceGeneral != null && !/^https:\/\/[^\s"'<>]+$/.test(ticketera.enlaceGeneral)) errores.push('config.json: ticketera.enlaceGeneral debe empezar por https:// (o null)');
if (config.dominio != null && !/^https:\/\/[^/\s]+$/.test(config.dominio)) errores.push('config.json: "dominio" tiene que ser como "https://veleta.com", sin barra al final (o null)');

const MAX_VIDEO = 3 * 1024 * 1024;
const MAX_IMAGEN = 500 * 1024;
const MAX_ESCENA = 250 * 1024; // presupuesto de la foto del salón (WebP/AVIF ~150-250 KB)
if (!errores.length) {
  const escena = config.escena;
  if (escena.imagen) {
    const ruta = archivoPublico(escena.imagen);
    if (!ruta) errores.push(`config.json: no existe la foto de la escena publico${escena.imagen} (súbela o pon null)`);
    else if (statSync(ruta).size > MAX_ESCENA) avisos.push(`publico${escena.imagen} pesa ${Math.round(statSync(ruta).size / 1024)} KB: el presupuesto es ~150-250 KB (WebP o AVIF).`);
  }
  if (escena.primerPlano && !archivoPublico(escena.primerPlano.imagen)) errores.push(`config.json: no existe la capa de primer plano publico${escena.primerPlano.imagen} (súbela o pon null)`);
  // En el móvil (vertical) solo se ve la franja central de la foto: la pantalla tiene que caer ahí.
  const p = escena.pantalla;
  const visible = (100 * (9 / 19.5)) / (escena.ancho / escena.alto); // % del ancho visible en un móvil típico
  const desde = 50 - visible / 2, hasta = 50 + visible / 2;
  if (p.x < desde || p.x + p.ancho > hasta) avisos.push(`config.json: escena.pantalla (de ${p.x}% a ${p.x + p.ancho}% del ancho) se sale de la franja que se ve en el móvil (de ~${Math.round(desde)}% a ~${Math.round(hasta)}%). En el móvil la tele saldría cortada.`);
  const [rw, rh] = escena.ratioVideo.split(':').map(Number);
  const proporcion = (p.ancho * escena.ancho) / (p.alto * escena.alto);
  if (Math.abs(proporcion / (rw / rh) - 1) > 0.05) avisos.push(`config.json: el rectángulo de la pantalla no es ${escena.ratioVideo} (es ${proporcion.toFixed(2)}:1): el vídeo se recortará un poco.`);
  eventos.forEach((ev, i) => {
    if (ev.tema && ev.tema.textura && !archivoPublico('/img/texturas/' + ev.tema.textura)) errores.push(`eventos.json, evento ${i + 1}: no existe la textura publico/img/texturas/${ev.tema.textura}`);
  });
  eventos.forEach((ev, i) => {
    for (const k of ['videoTele', 'posterTele']) {
      if (!ev[k]) continue;
      const ruta = archivoPublico(ev[k]);
      if (!ruta) { errores.push(`eventos.json, evento ${i + 1}: no existe el archivo publico${ev[k]} (súbelo o pon null)`); continue; }
      const peso = statSync(ruta).size;
      const max = k === 'videoTele' ? MAX_VIDEO : MAX_IMAGEN;
      if (peso > max) avisos.push(`publico${ev[k]} pesa ${(peso / 1048576).toFixed(1)} MB: conviene reducirlo (máx. ~${max / 1048576 >= 1 ? max / 1048576 + ' MB' : max / 1024 + ' KB'}) para que la web vaya rápida.`);
    }
  });
}
if (errores.length) {
  console.error('\nNo se puede construir la web (la web publicada sigue como estaba):\n- ' + errores.join('\n- ') + '\n');
  process.exit(1);
}

// ---------- Marcadores de dato pendiente ----------
const pendiente = (que) => `<mark class="pendiente">PENDIENTE: ${escapar(que)}</mark>`;
const ETIQUETAS = {
  'titular.nombre': 'nombre del titular',
  'titular.nif': 'NIF del titular',
  'titular.direccion': 'dirección del titular'
};
const CENSURA = '<span class="censura" aria-label="Por desvelar">█████████</span>';

// ---------- Motor de plantillas mínimo ----------
// {{> parcial}}  incluye plantillas/parciales/parcial.html
// {{{bloque}}}   inserta HTML generado tal cual
// {{clave}}      inserta un dato de config.json escapado (null = marcador PENDIENTE)
function obtener(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function rellenar(plantilla, propios) {
  const bloques = { ...COMUNES, ...propios };
  let html = plantilla;
  for (let i = 0; i < 5 && html.includes('{{>'); i++) {
    html = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => leer(`plantillas/parciales/${n}.html`));
  }
  html = html.replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}/g, (_, n) => {
    if (!(n in bloques)) throw new Error(`Bloque desconocido {{{${n}}}}`);
    return bloques[n];
  });
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, ruta) => {
    const v = obtener(config, ruta);
    if (v === undefined) throw new Error(`Dato desconocido {{${ruta}}}`);
    if (v === null || v === '') return pendiente(ETIQUETAS[ruta] || ruta);
    return escapar(v);
  });
}

// Bloques que puede usar cualquier plantilla. El email va en un bloque porque se usa dentro de un enlace.
const COMUNES = {
  emailEnlace: config.email
    ? `<a href="mailto:${escapar(config.email)}">${escapar(config.email)}</a>`
    : pendiente('email de contacto de Veleta')
};

// ---------- Estado: eventos futuros + «sin evento» ----------
const hoy = hoyEnMadrid();
const futuros = eventosFuturos(eventos, hoy).map((ev) => ({ ...ev, id: idEvento(ev, eventos.indexOf(ev)) }));
const actual = eventoActual(futuros, hoy);
const idActualBuild = actual ? actual.id : 'ninguno';
const op = config.opciones;

function emision(ev) {
  if (!ev) {
    // [MOV-3] nieve de «sin señal»: el JS la anima; sin JS (o con «reducir movimiento») queda quieta.
    return `            <div class="emision emision--sin-senal" data-bloque="ninguno">
              <canvas class="sin-senal" width="96" height="72" data-sin-senal role="img" aria-label="La tele no tiene señal"></canvas>
            </div>`;
  }
  if (!ev.videoTele) {
    return `            <div class="emision" data-bloque="${ev.id}">${pendiente('vídeo de la tele')}</div>`;
  }
  // Sin sonido siempre; autoplay para que se vea también sin JavaScript (si el navegador lo bloquea, queda el póster).
  const poster = ev.posterTele ? ` poster="${escapar(ev.posterTele)}"` : '';
  const actualEnBuild = ev.id === idActualBuild;
  return `            <div class="emision" data-bloque="${ev.id}">
              <video class="tele__video" muted playsinline${actualEnBuild ? ' autoplay preload="auto"' : ' preload="none"'}${poster} data-video aria-label="Avance del evento">
                <source src="${escapar(ev.videoTele)}" type="video/mp4">
              </video>
            </div>`;
}

function pantallaEvento(ev) {
  // TODOS los tramos llevan al mismo enlace: el del evento o, si aún no tiene, el general de Lema.
  // Sin ninguno de los dos: «Entradas pronto» y los tramos sin enlace.
  const enlace = ev.enlaceCompra || ticketera.enlaceGeneral || null;
  const nombreTexto = ev.censurado ? 'Por desvelar' : (ev.nombre || 'Evento sin nombre');
  const tramos = Array.isArray(ev.tramos) ? ev.tramos : [];
  // Cada tramo es una tarjeta (rectángulo con volumen, como en Bogart) que es un enlace normal
  const fila = (nombreHTML, precioHTML, etiqueta) => enlace
    ? `          <li><a class="tramo" href="${escapar(enlace)}" rel="noopener" data-comprar data-evento="${escapar(nombreTexto)}" aria-label="${escapar(etiqueta)}"><span class="tramo__nombre">${nombreHTML}</span><span class="tramo__precio">${precioHTML}</span></a></li>`
    : `          <li><span class="tramo tramo--apagado"><span class="tramo__nombre">${nombreHTML}</span><span class="tramo__precio">${precioHTML}</span></span></li>`;
  let filas = tramos.map((t, i) => {
    const nombre = t.nombre ? escapar(t.nombre) : pendiente(`nombre del tramo ${i + 1}`);
    const precio = t.precio != null ? escapar(formatearPrecio(t.precio)) : pendiente('precio');
    const etiqueta = `Comprar entrada: ${t.nombre || 'tramo ' + (i + 1)}${t.precio != null ? ', ' + formatearPrecio(t.precio) : ''}`;
    return fila(nombre, precio, etiqueta);
  });
  // Sin tramos todavía: una fila para poder comprar igual, y el aviso de que faltan.
  if (!filas.length) filas = [fila('Comprar entrada', pendiente('tramos y precios'), 'Comprar entrada')];
  const b = {
    evId: ev.id,
    evNombre: ev.censurado ? CENSURA : (ev.nombre ? escapar(ev.nombre) : pendiente('nombre del evento')),
    evFechaISO: ev.fecha,
    evFecha: escapar(fechaLegible(ev.fecha, ev.horaFin)),
    evLugar: ev.lugar ? escapar(ev.lugar) : (ev.censurado ? 'Por desvelar' : pendiente('lugar')),
    modoEmail: op.emailAntesDeComprar,
    etiquetaEmail: op.emailAntesDeComprar === 'obligatorio' ? 'Tu email (lo necesitamos para seguir)' : 'Tu email (si quieres)',
    evTramos: `        <ul class="tramos" role="list" aria-label="Tramos de entradas">\n${filas.join('\n')}\n        </ul>`,
    // «Continuar» lleva al mismo enlace que los tramos; sin enlace, «Entradas pronto» apagado
    evContinuar: enlace
      ? `          <a class="pastilla pastilla--clara" href="${escapar(enlace)}" rel="noopener" data-comprar data-continuar data-evento="${escapar(nombreTexto)}">Continuar</a>`
      : '          <span class="pastilla pastilla--apagada" aria-disabled="true">Entradas pronto</span>'
  };
  b.evEmail = enlace && op.emailAntesDeComprar !== 'no' ? rellenar(leer('plantillas/parciales/email-compra.html'), b) : '';
  return rellenar(leer('plantillas/parciales/evento.html'), b);
}

// Fondo de la escena: la foto o, mientras no exista, el gris PROVISIONAL (el rectángulo de la tele se dibuja igual).
const esc = config.escena;
const fondoEscena = esc.imagen
  ? `          <img class="escena__foto" src="${escapar(esc.imagen)}" alt="" width="${esc.ancho}" height="${esc.alto}" fetchpriority="high" decoding="async">`
  : `          <div class="escena__foto escena__foto--provisional" aria-hidden="true"><span>PROVISIONAL · foto del salón en blanco y negro: señor de espaldas en su sillón viendo la tele</span></div>`;
// Lo que en la foto queda delante de la pantalla (la cabeza): va encima del vídeo
const primerPlano = esc.imagen && esc.primerPlano
  ? `          <img class="escena__primer-plano" src="${escapar(esc.primerPlano.imagen)}" alt="" decoding="async">`
  : '';

const bloquesLanding = {
  fondoEscena,
  primerPlano,
  emisiones: [...futuros.map(emision), emision(null)].join('\n'),
  pantallas: [...futuros.map(pantallaEvento), rellenar(leer('plantillas/parciales/sin-evento.html'), {})].join('\n')
};

// Reglas CSS de estado: sin JS, solo el bloque elegido en la build; con JS, el que diga estado.js.
// Van en un archivo con huella en el nombre para que la caché nunca mezcle reglas viejas con HTML nuevo.
const ids = [...futuros.map((e) => e.id), 'ninguno'];
const [vw, vh] = esc.ratioVideo.split(':').map(Number);
const cssEstado = [
  '/* Generado por scripts/build.mjs a partir de datos/: escena, qué bloque se ve en cada estado y temas. */',
  `:root { --escena-ratio: ${esc.ancho / esc.alto}; --tele-x: ${esc.pantalla.x}%; --tele-y: ${esc.pantalla.y}%; --tele-ancho: ${esc.pantalla.ancho}%; --tele-alto: ${esc.pantalla.alto}%; --video-ratio: ${vw / vh}; }`,
  (() => { const m = esc.marco || esc.pantalla; return `:root { --marco-x: ${m.x}%; --marco-y: ${m.y}%; --marco-ancho: ${m.ancho}%; --marco-alto: ${m.alto}%; }`; })(),
  esc.primerPlano ? `:root { --pp-x: ${esc.primerPlano.x}%; --pp-y: ${esc.primerPlano.y}%; --pp-ancho: ${esc.primerPlano.ancho}%; --pp-alto: ${esc.primerPlano.alto}%; }` : '',
  `html:not([data-actual]) [data-bloque]:not([data-bloque="${idActualBuild}"]) { display: none !important; }`,
  ...ids.map((id) => `html[data-actual]:not([data-actual="${id}"]) [data-bloque="${id}"] { display: none !important; }`),
  // Tema secundario por evento (opcional). Sin tema: blanco y negro puro.
  ...futuros.filter((e) => e.tema).map((e) => [
    e.tema.acento && `[data-bloque="${e.id}"] { --acento: ${e.tema.acento}; }`,
    e.tema.textura && `.venta[data-bloque="${e.id}"] { --textura: url("/img/texturas/${e.tema.textura}"); }`
  ].filter(Boolean).join('\n'))
].join('\n') + '\n';
const huella = createHash('sha256').update(cssEstado).digest('hex').slice(0, 10);
const metaEventos = JSON.stringify(futuros.map((e) => ({ id: e.id, hasta: visibleHasta(e) })));
// Opciones que necesita el JS (en una etiqueta meta: la CSP no permite scripts en línea)
const metaOpciones = JSON.stringify({ emailAntesDeComprar: op.emailAntesDeComprar });

// ---------- Páginas ----------
const PAGINAS = [
  { plantilla: 'inicio.html', salida: 'index.html', ruta: '/', titulo: null, descripcion: config.descripcion, clase: 'es-landing', landing: true },
  { plantilla: 'legal-aviso.html', salida: 'aviso-legal/index.html', ruta: '/aviso-legal/', titulo: 'Aviso legal', descripcion: `Aviso legal de la web de ${config.nombre}.`, noindex: true },
  { plantilla: 'legal-privacidad.html', salida: 'privacidad/index.html', ruta: '/privacidad/', titulo: 'Política de privacidad', descripcion: `Cómo trata ${config.nombre} tus datos personales.`, noindex: true },
  { plantilla: 'legal-cookies.html', salida: 'cookies/index.html', ruta: '/cookies/', titulo: 'Política de cookies', descripcion: `Qué guarda la web de ${config.nombre} en tu navegador.`, noindex: true },
  { plantilla: 'gracias.html', salida: 'gracias/index.html', ruta: '/gracias/', titulo: 'Ya estás en la lista', descripcion: config.descripcion, noindex: true },
  { plantilla: 'error-envio.html', salida: 'error-envio/index.html', ruta: '/error-envio/', titulo: 'No se ha podido enviar', descripcion: config.descripcion, noindex: true },
  { plantilla: '404.html', salida: '404.html', ruta: '/404', titulo: 'Página no encontrada', descripcion: config.descripcion, noindex: true }
];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(RAIZ, 'publico'), DIST, { recursive: true, filter: (s) => !s.endsWith('.gitkeep') });
if (PUBLICO_EXTRA) cpSync(PUBLICO_EXTRA, DIST, { recursive: true });
writeFileSync(join(DIST, `css/estado-${huella}.css`), cssEstado);

// Imágenes de más peso de la cuenta
for (const dir of ['img']) {
  const base = join(DIST, dir);
  if (!existsSync(base)) continue;
  for (const f of readdirSync(base)) {
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase())) continue;
    const peso = statSync(join(base, f)).size;
    if (peso > MAX_IMAGEN) avisos.push(`publico/${dir}/${f} pesa ${Math.round(peso / 1024)} KB: conviene reducirla (máx. ~500 KB).`);
  }
}

if (!config.dominio) avisos.push('config.json: falta "dominio" (la dirección definitiva). Mientras tanto no hay canonical, og:image ni sitemap con direcciones absolutas.');
const ogImagen = existsSync(join(RAIZ, 'publico/img/og.jpg')) ? '/img/og.jpg' : null;
if (!ogImagen) avisos.push('Falta publico/img/og.jpg (1200×630): la imagen que sale al compartir el enlace.');

const enlaceInstagram = config.instagram && config.instagram.url
  ? `<a href="${escapar(config.instagram.url)}" target="_blank" rel="noopener">Instagram</a>`
  : pendiente('Instagram de Veleta');

const base = leer('plantillas/parciales/base.html');
for (const p of PAGINAS) {
  const tituloCompleto = p.titulo ? `${p.titulo} · ${config.nombre}` : `${config.nombre} · Entradas`;
  const url = config.dominio ? config.dominio + (p.ruta === '/404' ? '/' : p.ruta) : null;
  const absolutas = [
    url && `<link rel="canonical" href="${escapar(url)}">`,
    url && `<meta property="og:url" content="${escapar(url)}">`,
    config.dominio && ogImagen && `<meta property="og:image" content="${escapar(config.dominio + ogImagen)}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">`
  ].filter(Boolean).join('\n  ');
  let contenido = rellenar(leer(`plantillas/${p.plantilla}`), p.landing ? bloquesLanding : {});
  if (!p.landing) contenido = rellenar('{{> cabecera-simple}}\n  <main id="main" class="pagina">\n' + contenido + '\n  </main>', {});
  const html = rellenar(base, {
    contenido,
    tituloPagina: escapar(tituloCompleto),
    descripcionPagina: escapar(p.descripcion),
    robots: p.noindex ? '<meta name="robots" content="noindex">' : '',
    absolutas,
    metaEstado: p.landing ? `<meta name="veleta-eventos" content="${escapar(metaEventos)}">\n  <meta name="veleta-opciones" content="${escapar(metaOpciones)}">` : '',
    cssEstado: p.landing ? `<link rel="stylesheet" href="/css/estado-${huella}.css">` + (esc.imagen ? `\n  <link rel="preload" as="image" href="${escapar(esc.imagen)}" fetchpriority="high">` : '') : '',
    claseCuerpo: p.clase || 'es-pagina',
    enlaceInstagram
  });
  const destino = join(DIST, p.salida);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html);
}

// sitemap.xml y robots.txt (solo con dominio: necesitan direcciones absolutas)
if (config.dominio) {
  writeFileSync(join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${config.dominio}/</loc></url>\n</urlset>\n`);
  writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.dominio}/sitemap.xml\n`);
} else {
  writeFileSync(join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\n');
}

const estadoTexto = actual ? `con evento (${actual.nombre || actual.id}, ${actual.fecha})` : 'sin evento';
console.log(`Web construida en ${DIST.replace(RAIZ + '/', '')}/ · hoy ${hoy} · ${futuros.length} evento(s) futuro(s) de ${eventos.length} · estado al construir: ${estadoTexto}`);
if (avisos.length) console.warn('Avisos:\n- ' + avisos.join('\n- '));
