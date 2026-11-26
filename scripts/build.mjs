// Construye la landing en dist/ a partir de plantillas/, datos/ y publico/.
// Sin dependencias: solo Node. Uso: node scripts/build.mjs
// Para las pruebas: DATOS=tests/fixtures/estados DIST=dist-pruebas node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  hoyEnMadrid, erroresEvento, erroresOpciones, eventosFuturos, eventoActual, visibleHasta,
  fechaLegible, idEvento, escapar
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
  config = { ...config, ...extra, opciones: { ...config.opciones, ...extra.opciones } };
}
const eventos = leerJSON(join(DATOS, 'eventos.json'), 'eventos.json') || [];
// Archivos extra de la carpeta de datos de pruebas (p. ej. un vídeo de prueba): se copian encima de publico/.
const PUBLICO_EXTRA = DATOS !== join(RAIZ, 'datos') && existsSync(join(DATOS, 'publico')) ? join(DATOS, 'publico') : null;
const archivoPublico = (ruta) => [join(RAIZ, 'publico', ruta), PUBLICO_EXTRA && join(PUBLICO_EXTRA, ruta)].find((r) => r && existsSync(r));

// ---------- Comprobaciones: un error en los datos para la publicación (mejor que publicar algo roto) ----------
if (!Array.isArray(eventos)) errores.push('eventos.json tiene que ser una lista entre [ y ] (vacía si no hay eventos: [])');
else eventos.forEach((ev, i) => erroresEvento(ev).forEach((e) => errores.push(`eventos.json, evento ${i + 1}: ${e}`)));
erroresOpciones(config.opciones).forEach((e) => errores.push(`config.json: ${e}`));
if (!config.nombre) errores.push('config.json: falta "nombre" (el nombre de la marca)');
if (config.dominio != null && !/^https:\/\/[^/\s]+$/.test(config.dominio)) errores.push('config.json: "dominio" tiene que ser como "https://veleta.com", sin barra al final (o null)');

const MAX_VIDEO = 3 * 1024 * 1024;
const MAX_IMAGEN = 500 * 1024;
if (!errores.length) {
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
function rellenar(plantilla, bloques) {
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
              <canvas class="sin-senal" width="96" height="72" data-sin-senal aria-hidden="true"></canvas>
              <span class="sin-senal__texto">Sin señal</span>
            </div>`;
  }
  if (!ev.videoTele) {
    return `            <div class="emision" data-bloque="${ev.id}">${pendiente('vídeo de la tele')}</div>`;
  }
  const poster = ev.posterTele ? ` poster="${escapar(ev.posterTele)}"` : '';
  return `            <div class="emision" data-bloque="${ev.id}">
              <video class="tele__video" muted loop playsinline preload="${ev.id === idActualBuild ? 'metadata' : 'none'}"${poster} data-video aria-label="Avance del evento">
                <source src="${escapar(ev.videoTele)}" type="video/mp4">
              </video>
            </div>`;
}

function pantallaEvento(ev) {
  const nombreTexto = ev.censurado ? 'Por desvelar' : (ev.nombre || 'Evento sin nombre');
  const b = {
    evId: ev.id,
    evNombre: ev.censurado ? CENSURA : (ev.nombre ? escapar(ev.nombre) : pendiente('nombre del evento')),
    evNombreTexto: escapar(nombreTexto),
    evFechaISO: ev.fecha,
    evFecha: escapar(fechaLegible(ev.fecha)),
    evLugar: ev.lugar ? escapar(ev.lugar) : (ev.censurado ? 'Por desvelar' : pendiente('lugar')),
    evPrecio: ev.precio ? escapar(ev.precio) : pendiente('precio'),
    evEnlace: ev.enlaceCompra ? escapar(ev.enlaceCompra) : '',
    modoEmail: op.emailAntesDeComprar,
    etiquetaEmail: op.emailAntesDeComprar === 'obligatorio' ? 'Tu email' : 'Tu email (si quieres)'
  };
  let compra = ev.enlaceCompra ? leer('plantillas/parciales/comprar.html') : leer('plantillas/parciales/pronto.html');
  // Sin email antes de comprar: fuera el bloque del email.
  if (op.emailAntesDeComprar === 'no') compra = compra.replace(/\s*<div class="comprar__email"[\s\S]*?<\/p>\n\s*<\/div>/, '');
  b.evCompra = rellenar(compra, b);
  return rellenar(leer('plantillas/parciales/evento.html'), b);
}

const bloquesLanding = {
  emisiones: [...futuros.map(emision), emision(null)].join('\n'),
  pantallas: [...futuros.map(pantallaEvento), rellenar(leer('plantillas/parciales/sin-evento.html'), {})].join('\n')
};

// Reglas CSS de estado: sin JS, solo el bloque elegido en la build; con JS, el que diga estado.js.
// Van en un archivo con huella en el nombre para que la caché nunca mezcle reglas viejas con HTML nuevo.
const ids = [...futuros.map((e) => e.id), 'ninguno'];
const cssEstado = [
  '/* Generado por scripts/build.mjs: qué bloque se ve en cada estado. */',
  `html:not([data-actual]) [data-bloque]:not([data-bloque="${idActualBuild}"]) { display: none !important; }`,
  ...ids.map((id) => `html[data-actual]:not([data-actual="${id}"]) [data-bloque="${id}"] { display: none !important; }`)
].join('\n') + '\n';
const huella = createHash('sha256').update(cssEstado).digest('hex').slice(0, 10);
const metaEventos = JSON.stringify(futuros.map((e) => ({ id: e.id, hasta: visibleHasta(e) })));
// Opciones que necesita el JS (en una etiqueta meta: la CSP no permite scripts en línea)
const metaOpciones = JSON.stringify({
  emailAntesDeComprar: op.emailAntesDeComprar, reaccion: op.reaccion, sonido: op.sonido,
  introMaxMs: op.introMaxMs, reaccionMs: op.reaccionMs
});

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
    cssEstado: p.landing ? `<link rel="stylesheet" href="/css/estado-${huella}.css">` : '',
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
