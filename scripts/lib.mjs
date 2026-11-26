// Funciones puras que usa la construcción de la web (y que prueban los tests).

/** Fecha de hoy en Valencia (Europe/Madrid) como AAAA-MM-DD. */
export function hoyEnMadrid(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(ahora);
  const v = (t) => partes.find((p) => p.type === t).value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}

const FECHA_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;
const HORA_RE = /^\d{2}:\d{2}$/;
export const CLAVES_EVENTO = ['nombre', 'fecha', 'horaFin', 'lugar', 'enlaceCompra', 'videoTele', 'posterTele', 'videoExclusivo', 'censurado', 'tema', 'tramos'];
const OBLIGATORIAS = ['nombre', 'fecha', 'lugar', 'enlaceCompra', 'videoTele', 'videoExclusivo', 'tramos'];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const TEXTURA_RE = /^[\w.-]+\.(webp|png|jpg|jpeg|avif|svg)$/i;

function fechaReal(dia) {
  const d = new Date(dia + 'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dia;
}

/** Separa "2026-12-12T23:00" en { dia, hora }; null si está mal escrita. */
export function partirFecha(fecha) {
  const m = FECHA_RE.exec(fecha || '');
  if (!m || !fechaReal(m[1])) return null;
  const [h, min] = m[2].split(':').map(Number);
  if (h > 23 || min > 59) return null;
  return { dia: m[1], hora: m[2] };
}

/** Comprueba un evento; devuelve la lista de problemas explicados en español. */
export function erroresEvento(ev) {
  if (!ev || typeof ev !== 'object' || Array.isArray(ev)) return ['no es un evento (tiene que ir entre { y })'];
  const errores = [];
  for (const k of Object.keys(ev)) {
    if (k === 'precio') errores.push('«precio» ya no se usa: los precios van en «tramos», p. ej. [{ "nombre": "General", "precio": 15 }]');
    else if (!CLAVES_EVENTO.includes(k) && !k.startsWith('_')) errores.push(`dato desconocido «${k}» (¿está bien escrito?)`);
  }
  for (const k of OBLIGATORIAS) {
    if (!(k in ev)) errores.push(`falta «${k}» (si aún no se sabe, pon null)`);
  }
  if (!partirFecha(ev.fecha)) errores.push(`fecha «${ev.fecha}» no válida (formato "2026-12-12T23:00", hora de Madrid)`);
  if (ev.horaFin != null && !HORA_RE.test(ev.horaFin)) errores.push(`horaFin «${ev.horaFin}» no válida (formato "05:00")`);
  if (ev.enlaceCompra != null && !/^https:\/\/[^\s"'<>]+$/.test(ev.enlaceCompra)) errores.push('enlaceCompra debe empezar por https:// (o null si aún no hay)');
  for (const k of ['videoTele', 'posterTele']) {
    if (ev[k] != null && !/^\/video\/[\w.-]+$|^\/img\/[\w.-]+$/.test(ev[k])) errores.push(`${k} debe ser una ruta como "/video/archivo.mp4" (o null)`);
  }
  if (ev.videoTele != null && !/\.mp4$/i.test(ev.videoTele)) errores.push('videoTele tiene que ser un .mp4');
  if (ev.censurado != null && typeof ev.censurado !== 'boolean') errores.push('censurado tiene que ser true o false, sin comillas');
  for (const k of ['nombre', 'lugar']) {
    if (ev[k] != null && typeof ev[k] !== 'string') errores.push(`${k} tiene que ir entre comillas (o null)`);
  }
  errores.push(...erroresTramos(ev.tramos), ...erroresTema(ev.tema));
  return errores;
}

/** Tramos de entradas: lista de { nombre, precio }. null o [] = aún no se saben (sale PENDIENTE). */
export function erroresTramos(tramos) {
  if (tramos == null) return [];
  if (!Array.isArray(tramos)) return ['tramos tiene que ser una lista entre [ y ], p. ej. [{ "nombre": "General", "precio": 15 }] (o null)'];
  const errores = [];
  tramos.forEach((t, i) => {
    const n = `tramo ${i + 1}`;
    if (!t || typeof t !== 'object' || Array.isArray(t)) { errores.push(`${n}: tiene que ir entre { y }`); return; }
    for (const k of Object.keys(t)) if (!['nombre', 'precio'].includes(k) && !k.startsWith('_')) errores.push(`${n}: dato desconocido «${k}»`);
    if (t.nombre != null && (typeof t.nombre !== 'string' || !t.nombre.trim())) errores.push(`${n}: el nombre tiene que ir entre comillas (o null)`);
    if (t.precio != null && !(typeof t.precio === 'number' && Number.isFinite(t.precio) && t.precio >= 0 && Math.round(t.precio * 100) === t.precio * 100)) {
      errores.push(`${n}: precio «${t.precio}» no válido (un número en euros sin comillas ni «€», como 15 o 12.5; o null si aún no se sabe)`);
    }
  });
  return errores;
}

/** Tema opcional del evento: { acento: "#rrggbb" | null, textura: "archivo.webp" | null }. null = blanco y negro puro. */
export function erroresTema(tema) {
  if (tema == null) return [];
  if (typeof tema !== 'object' || Array.isArray(tema)) return ['tema tiene que ser { "acento": "#rrggbb", "textura": "archivo.webp" } (o null)'];
  const errores = [];
  for (const k of Object.keys(tema)) if (!['acento', 'textura'].includes(k) && !k.startsWith('_')) errores.push(`tema: dato desconocido «${k}»`);
  if (tema.acento != null && !HEX_RE.test(tema.acento)) errores.push(`tema.acento «${tema.acento}» no válido (formato "#rrggbb", o null)`);
  if (tema.textura != null && !TEXTURA_RE.test(tema.textura)) errores.push(`tema.textura «${tema.textura}» no válida (nombre de un archivo de publico/img/texturas/, o null)`);
  return errores;
}

/** «15 €», «12,50 €» */
export function formatearPrecio(precio) {
  const entero = Number.isInteger(precio);
  return (entero ? String(precio) : precio.toFixed(2).replace('.', ',')) + ' €';
}

/** Escena (config.json → escena): foto y rectángulo de la pantalla de la tele, en % de la foto. */
export function erroresEscena(e) {
  if (!e || typeof e !== 'object') return ['falta «escena» (foto del salón y posición de la pantalla de la tele)'];
  const errores = [];
  if (e.imagen != null && !/^\/img\/[\w.-]+\.(webp|avif|jpg|jpeg|png)$/i.test(e.imagen)) errores.push('escena.imagen tiene que ser como "/img/escena.webp" (o null mientras no haya foto)');
  for (const k of ['ancho', 'alto']) if (!(Number.isInteger(e[k]) && e[k] > 0)) errores.push(`escena.${k} tiene que ser el ${k} de la foto en píxeles (número entero)`);
  if (!/^\d+:\d+$/.test(e.ratioVideo || '')) errores.push('escena.ratioVideo tiene que ser como "4:3"');
  const p = e.pantalla;
  if (!p || typeof p !== 'object') errores.push('falta escena.pantalla { x, y, ancho, alto } (en % de la foto)');
  else {
    for (const k of ['x', 'y', 'ancho', 'alto']) if (!(typeof p[k] === 'number' && p[k] >= 0 && p[k] <= 100)) errores.push(`escena.pantalla.${k} tiene que ser un número entre 0 y 100 (% de la foto)`);
    if (!errores.length && (p.x + p.ancho > 100 || p.y + p.alto > 100)) errores.push('escena.pantalla se sale de la foto (x + ancho y y + alto no pueden pasar de 100)');
    if (!errores.length && (p.ancho === 0 || p.alto === 0)) errores.push('escena.pantalla no puede medir 0');
  }
  return errores;
}

/** Día siguiente a una fecha AAAA-MM-DD. */
function diaSiguiente(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Último día (AAAA-MM-DD, Madrid) en que el evento se muestra. Normalmente su propio día; si acaba
 * de madrugada (horaFin menor que la hora de inicio) o empieza de madrugada (antes de las 06:00),
 * sigue visible también el día siguiente.
 */
export function visibleHasta(ev) {
  const { dia, hora } = partirFecha(ev.fecha);
  const cruza = (ev.horaFin && ev.horaFin < hora) || hora < '06:00';
  return cruza ? diaSiguiente(dia) : dia;
}

/** Eventos que aún no han terminado, ordenados por fecha. */
export function eventosFuturos(eventos, hoy) {
  return eventos
    .filter((ev) => visibleHasta(ev) >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Evento que toca enseñar hoy (el más próximo) o null. Misma regla que publico/js/estado.js. */
export function eventoActual(eventos, hoy) {
  return eventosFuturos(eventos, hoy)[0] || null;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** «sábado 12 de diciembre · 23:00» */
export function fechaLegible(fecha) {
  const { dia, hora } = partirFecha(fecha);
  const [a, m, d] = dia.split('-').map(Number);
  const semana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[semana]} ${d} de ${MESES[m - 1]} · ${hora}`;
}

/** Identificador estable para un evento (para el HTML). */
export function idEvento(ev, i) {
  return `ev-${partirFecha(ev.fecha).dia}-${i + 1}`;
}

export function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Comprueba las opciones «por decidir» de config.json. */
export function erroresOpciones(o = {}) {
  const permitidos = { emailAntesDeComprar: ['no', 'opcional', 'obligatorio'] };
  const errores = [];
  for (const [k, vals] of Object.entries(permitidos)) {
    if (!vals.includes(o[k])) errores.push(`opciones.${k} = «${o[k]}» no vale (usa una de: ${vals.join(', ')})`);
  }
  for (const k of Object.keys(o)) {
    if (!(k in permitidos) && !k.startsWith('_')) errores.push(`opciones.${k} ya no se usa: bórralo`);
  }
  return errores;
}
