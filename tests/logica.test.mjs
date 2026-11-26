import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoyEnMadrid, partirFecha, erroresEvento, visibleHasta, eventosFuturos, eventoActual, fechaLegible, erroresOpciones
} from '../scripts/lib.mjs';
import { revisarEnvio, componerCorreo, TEXTO_ALTA_LISTA, TEXTO_ALTA_COMPRA } from '../lib/formulario.mjs';

const ev = (fecha, extra = {}) => ({
  nombre: 'X', fecha, lugar: null, precio: null, enlaceCompra: null, videoTele: null, videoExclusivo: null, ...extra
});

test('hoy en Madrid cambia a medianoche de Valencia, no de UTC', () => {
  assert.equal(hoyEnMadrid(new Date('2026-11-27T22:59:00Z')), '2026-11-27');
  assert.equal(hoyEnMadrid(new Date('2026-11-27T23:01:00Z')), '2026-11-28');
  assert.equal(hoyEnMadrid(new Date('2026-07-01T22:30:00Z')), '2026-07-02'); // horario de verano
});

test('fechas: formato ISO con hora y fechas imposibles', () => {
  assert.deepEqual(partirFecha('2026-12-12T23:00'), { dia: '2026-12-12', hora: '23:00' });
  assert.equal(partirFecha('2026-02-30T20:00'), null);
  assert.equal(partirFecha('12/12/2026'), null);
  assert.equal(partirFecha('2026-12-12'), null);
  assert.equal(partirFecha('2026-12-12T25:00'), null);
});

test('un evento correcto no da errores; los típicos sí', () => {
  assert.deepEqual(erroresEvento(ev('2026-12-12T23:00', { enlaceCompra: 'https://x.es/a', videoTele: '/video/a.mp4', horaFin: '05:00' })), []);
  const malos = erroresEvento({ nombre: 'X', fecha: '12/12/2026', enlaceCompra: 'www.x.com', videoTele: 'a.mov', censurado: 'si', precio: 15, fehca: 1 });
  assert.ok(malos.some((e) => e.includes('fecha')));
  assert.ok(malos.some((e) => e.includes('enlaceCompra')));
  assert.ok(malos.some((e) => e.includes('videoTele')));
  assert.ok(malos.some((e) => e.includes('censurado')));
  assert.ok(malos.some((e) => e.includes('precio')));
  assert.ok(malos.some((e) => e.includes('«fehca»')));
  assert.ok(malos.some((e) => e.includes('falta «videoExclusivo»')));
});

test('visible hasta: su día, o el siguiente si acaba o empieza de madrugada', () => {
  assert.equal(visibleHasta(ev('2026-12-12T20:00')), '2026-12-12');
  assert.equal(visibleHasta(ev('2026-12-12T23:00', { horaFin: '05:00' })), '2026-12-13');
  assert.equal(visibleHasta(ev('2026-12-31T23:30', { horaFin: '06:00' })), '2027-01-01');
  assert.equal(visibleHasta(ev('2027-01-01T00:30')), '2027-01-02');
});

test('estado: el evento más próximo que no ha pasado; si no hay, ninguno', () => {
  const lista = [ev('2027-01-16T20:00', { nombre: 'B' }), ev('2026-12-12T23:00', { nombre: 'A', horaFin: '05:00' }), ev('2026-11-20T22:00', { nombre: 'pasado' })];
  assert.deepEqual(eventosFuturos(lista, '2026-11-26').map((e) => e.nombre), ['A', 'B']);
  assert.equal(eventoActual(lista, '2026-12-13').nombre, 'A');
  assert.equal(eventoActual(lista, '2026-12-14').nombre, 'B');
  assert.equal(eventoActual(lista, '2027-01-17'), null);
  assert.equal(eventoActual([], '2026-11-26'), null);
});

test('fecha legible en español', () => {
  assert.equal(fechaLegible('2026-12-12T23:00'), 'sábado 12 de diciembre · 23:00');
});

test('opciones por decidir: solo valores conocidos y tiempos dentro de lo acordado', () => {
  const buenas = { emailAntesDeComprar: 'opcional', reaccion: 'aleatoria', sonido: 'boton', introMaxMs: 1500, reaccionMs: 1000 };
  assert.deepEqual(erroresOpciones(buenas), []);
  assert.equal(erroresOpciones({ ...buenas, introMaxMs: 2000 }).length, 1);
  assert.equal(erroresOpciones({ ...buenas, reaccionMs: 1500 }).length, 1);
  assert.equal(erroresOpciones({ ...buenas, reaccion: 'baile' }).length, 1);
});

const AHORA = Date.parse('2026-11-26T12:00:00Z');
const base = { tipo: 'lista', t: String(AHORA - 60000), web: '', email: 'Lucia@Ejemplo.com' };

test('lista de espera correcta', () => {
  assert.deepEqual(revisarEnvio(base, AHORA), { tipo: 'lista', datos: { email: 'lucia@ejemplo.com' } });
});

test('email antes de comprar guarda el evento', () => {
  assert.deepEqual(revisarEnvio({ ...base, tipo: 'compra', evento: 'Evento A' }, AHORA).datos, { email: 'lucia@ejemplo.com', evento: 'Evento A' });
});

test('antispam: campo trampa y envío demasiado rápido', () => {
  assert.equal(revisarEnvio({ ...base, web: 'http://spam' }, AHORA).spam, true);
  assert.equal(revisarEnvio({ ...base, t: String(AHORA - 1000) }, AHORA).spam, true);
  assert.equal(revisarEnvio({ ...base, t: 'abc' }, AHORA).spam, true);
});

test('sin JavaScript (marca de tiempo vacía) el alta se acepta', () => {
  assert.deepEqual(revisarEnvio({ ...base, t: '' }, AHORA).datos, { email: 'lucia@ejemplo.com' });
  assert.deepEqual(revisarEnvio({ tipo: 'lista', email: 'a@b.es' }, AHORA).datos, { email: 'a@b.es' });
});

test('errores: email mal escrito y formulario caducado', () => {
  assert.match(revisarEnvio({ ...base, email: 'lucia@' }, AHORA).error, /email/);
  assert.match(revisarEnvio({ ...base, t: String(AHORA - 2 * 24 * 3600e3) }, AHORA).error, /caducado/);
});

test('el correo guarda la prueba del consentimiento con el texto exacto', () => {
  const lista = componerCorreo({ tipo: 'lista', datos: { email: 'a@b.es' } }, { ip: '1.2.3.4', fecha: new Date(AHORA) });
  assert.ok(lista.texto.includes(TEXTO_ALTA_LISTA));
  assert.ok(lista.texto.includes('1.2.3.4'));
  assert.ok(lista.texto.includes('26/11/2026'));
  const compra = componerCorreo({ tipo: 'compra', datos: { email: 'a@b.es', evento: 'Evento A' } }, {});
  assert.ok(compra.texto.includes(TEXTO_ALTA_COMPRA));
  assert.ok(compra.texto.includes('NO quiere decir que haya pagado'));
});
