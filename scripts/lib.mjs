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
export const CLAVES_EVENTO = ['nombre', 'fecha', 'horaFin', 'lugar', 'precio', 'enlaceCompra', 'videoTele', 'posterTele', 'videoExclusivo', 'censurado'];
const OBLIGATORIAS = ['nombre', 'fecha', 'lugar', 'precio', 'enlaceCompra', 'videoTele', 'videoExclusivo'];

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
    if (!CLAVES_EVENTO.includes(k) && !k.startsWith('_')) errores.push(`dato desconocido «${k}» (¿está bien escrito?)`);
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
  for (const k of ['nombre', 'lugar', 'precio']) {
    if (ev[k] != null && typeof ev[k] !== 'string') errores.push(`${k} tiene que ir entre comillas (o null)`);
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
 * sigue visible también el día siguiente. Igual que en la web de Sobremesa.
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
  const permitidos = {
    emailAntesDeComprar: ['no', 'opcional', 'obligatorio'],
    reaccion: ['pulgar', 'golpecito', 'brindis', 'aleatoria'],
    sonido: ['nunca', 'boton']
  };
  const errores = [];
  for (const [k, vals] of Object.entries(permitidos)) {
    if (!vals.includes(o[k])) errores.push(`opciones.${k} = «${o[k]}» no vale (usa una de: ${vals.join(', ')})`);
  }
  if (!(Number.isInteger(o.introMaxMs) && o.introMaxMs >= 0 && o.introMaxMs <= 1500)) errores.push('opciones.introMaxMs tiene que ser un número entre 0 y 1500 (milisegundos)');
  if (!(Number.isInteger(o.reaccionMs) && o.reaccionMs >= 0 && o.reaccionMs <= 1000)) errores.push('opciones.reaccionMs tiene que ser un número entre 0 y 1000 (milisegundos)');
  return errores;
}
