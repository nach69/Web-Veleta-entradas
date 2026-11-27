// Prueba la construcción: los datos reales son válidos, los errores paran la publicación
// y los textos de consentimiento coinciden con los de la página.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { erroresEvento, erroresOpciones } from '../scripts/lib.mjs';
import { TEXTO_ALTA_LISTA, TEXTO_ALTA_COMPRA } from '../lib/formulario.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;
const leerJSON = (r) => JSON.parse(readFileSync(join(RAIZ, r), 'utf8'));

test('los datos reales del repositorio son válidos', () => {
  for (const ev of leerJSON('datos/eventos.json')) assert.deepEqual(erroresEvento(ev), []);
  assert.deepEqual(erroresOpciones(leerJSON('datos/config.json').opciones), []);
});

function construir(eventos, nombre, config) {
  const datos = mkdtempSync(join(tmpdir(), 'veleta-'));
  const dist = join(datos, 'dist');
  writeFileSync(join(datos, 'eventos.json'), typeof eventos === 'string' ? eventos : JSON.stringify(eventos));
  if (config) writeFileSync(join(datos, 'config.json'), JSON.stringify(config));
  const r = spawnSync('node', ['scripts/build.mjs'], { cwd: RAIZ, env: { ...process.env, DATOS: datos, DIST: dist }, encoding: 'utf8' });
  return { ...r, dist, limpiar: () => rmSync(datos, { recursive: true, force: true }), nombre };
}

test('con datos mal escritos NO se construye y se explica en español', () => {
  const r = construir([{ nombre: 'X', fecha: '12/12/2026', lugar: null, enlaceCompra: null, videoTele: null, videoExclusivo: null, tramos: null }]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /No se puede construir la web/);
  assert.match(r.stderr, /fecha «12\/12\/2026» no válida/);
  assert.equal(existsSync(join(r.dist, 'index.html')), false);
  r.limpiar();
});

test('un JSON roto o un vídeo que no existe paran la build', () => {
  const roto = construir('[{ "nombre": "X", }]');
  assert.notEqual(roto.status, 0);
  assert.match(roto.stderr, /mal escrito/);
  roto.limpiar();
  const sinVideo = construir([{ nombre: 'X', fecha: '2030-01-01T20:00', lugar: null, enlaceCompra: null, videoTele: '/video/no-existe.mp4', videoExclusivo: null, tramos: null }]);
  assert.notEqual(sinVideo.status, 0);
  assert.match(sinVideo.stderr, /no existe el archivo publico\/video\/no-existe\.mp4/);
  sinVideo.limpiar();
});

const SIN_ENLACE = { nombre: 'X', fecha: '2030-01-01T20:00', lugar: null, enlaceCompra: null, videoTele: null, videoExclusivo: null, tramos: null };
const TRAMOS = [{ nombre: 'Primer tramo', precio: 10 }, { nombre: 'Segundo tramo', precio: 12.5 }, { nombre: 'Tercer tramo', precio: null }];
const hrefsTramos = (html) => [...html.matchAll(/<a class="tramo" href="([^"]+)"/g)].map((m) => m[1]);

test('TODOS los tramos llevan al mismo enlace: el del evento o, si no tiene, el general de Lema', () => {
  const general = construir([{ ...SIN_ENLACE, tramos: TRAMOS }]);
  assert.equal(general.status, 0, general.stderr);
  const h1 = hrefsTramos(readFileSync(join(general.dist, 'index.html'), 'utf8'));
  assert.deepEqual(h1, ['https://veleta.lema.club', 'https://veleta.lema.club', 'https://veleta.lema.club']);
  general.limpiar();
  const propio = construir([{ ...SIN_ENLACE, tramos: TRAMOS, enlaceCompra: 'https://veleta.lema.club/evento-x' }]);
  const html = readFileSync(join(propio.dist, 'index.html'), 'utf8');
  assert.deepEqual(hrefsTramos(html), Array(3).fill('https://veleta.lema.club/evento-x'));
  assert.match(html, /12,50 €/);
  assert.match(html, /PENDIENTE: precio/);
  propio.limpiar();
});

test('sin tramos todavía: una fila para comprar igual y el aviso PENDIENTE', () => {
  const r = construir([SIN_ENLACE]);
  const html = readFileSync(join(r.dist, 'index.html'), 'utf8');
  assert.deepEqual(hrefsTramos(html), ['https://veleta.lema.club']);
  assert.match(html, /PENDIENTE: tramos y precios/);
  r.limpiar();
});

test('lo que falta sale como PENDIENTE y sin ningún enlace de compra no hay enlaces', () => {
  const r = construir([{ ...SIN_ENLACE, tramos: TRAMOS }], 'sin enlace', { ticketera: { enlaceGeneral: null } });
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(join(r.dist, 'index.html'), 'utf8');
  assert.match(html, /PENDIENTE: lugar/);
  assert.match(html, /Entradas pronto/);
  assert.deepEqual(hrefsTramos(html), []);
  assert.doesNotMatch(html, /data-comprar/);
  r.limpiar();
});

test('precios mal puestos, temas raros o una escena imposible paran la build', () => {
  const precio = construir([{ ...SIN_ENLACE, tramos: [{ nombre: 'General', precio: '15 €' }] }]);
  assert.notEqual(precio.status, 0);
  assert.match(precio.stderr, /tramo 1: precio «15 €» no válido/);
  precio.limpiar();
  const viejo = construir([{ ...SIN_ENLACE, precio: '15 €' }]);
  assert.match(viejo.stderr, /«precio» ya no se usa/);
  viejo.limpiar();
  const tema = construir([{ ...SIN_ENLACE, tema: { acento: 'rojo' } }]);
  assert.match(tema.stderr, /tema\.acento «rojo» no válido/);
  tema.limpiar();
  const textura = construir([{ ...SIN_ENLACE, tema: { textura: 'no-existe.webp' } }]);
  assert.match(textura.stderr, /no existe la textura/);
  textura.limpiar();
  const escena = construir([], 'escena', { escena: { pantalla: { x: 90, y: 10, ancho: 30, alto: 20 } } });
  assert.match(escena.stderr, /escena\.pantalla se sale de la foto/);
  escena.limpiar();
  const foto = construir([], 'foto', { escena: { imagen: '/img/no-existe.webp' } });
  assert.match(foto.stderr, /no existe la foto de la escena/);
  foto.limpiar();
});

test('sin foto: gris PROVISIONAL con el rectángulo de la tele, y sin capa de primer plano', () => {
  const r = construir([], 'sin foto', { escena: { imagen: null } });
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(join(r.dist, 'index.html'), 'utf8');
  assert.match(html, /escena__foto--provisional/);
  assert.doesNotMatch(html, /escena__primer-plano/);
  assert.doesNotMatch(html, /rel="preload" as="image"/);
  r.limpiar();
  const conFoto = construir([]);
  const h2 = readFileSync(join(conFoto.dist, 'index.html'), 'utf8');
  assert.match(h2, /<img class="escena__foto" src="\/img\/escena\.webp" alt="" width="3072" height="2048"/);
  assert.match(h2, /escena__primer-plano/);
  assert.match(h2, /rel="preload" as="image" href="\/img\/escena\.webp"/);
  conFoto.limpiar();
});

test('la tele fuera de la franja del móvil da un aviso (no para la build)', () => {
  const r = construir([], 'franja', { escena: { pantalla: { x: 5, y: 30, ancho: 24, alto: 27 } } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /se sale de la franja que se ve en el móvil/);
  r.limpiar();
});

test('los textos de consentimiento de la página coinciden con los que se guardan', () => {
  execFileSync('node', ['scripts/build.mjs'], { cwd: RAIZ, env: { ...process.env, DATOS: join(RAIZ, 'tests/fixtures/estados'), DIST: join(RAIZ, 'dist-pruebas') } });
  const html = readFileSync(join(RAIZ, 'dist-pruebas/index.html'), 'utf8');
  const texto = (tipo) => [...html.matchAll(new RegExp(`data-texto-alta="${tipo}">([^<]*)<`, 'g'))].map((m) => m[1]);
  assert.ok(texto('lista').length >= 1);
  assert.ok(texto('compra').length >= 1);
  for (const t of texto('lista')) assert.equal(t, TEXTO_ALTA_LISTA);
  for (const t of texto('compra')) assert.equal(t, TEXTO_ALTA_COMPRA);
});

test('la página no carga nada de fuera ni lleva scripts en línea (CSP)', () => {
  const html = readFileSync(join(RAIZ, 'dist/index.html'), 'utf8');
  assert.doesNotMatch(html, /<(script|link|img|video|source|iframe)[^>]+(src|href)="https?:\/\//);
  assert.doesNotMatch(html, /<script>(?!<\/script>)|<script(?![^>]*src=)[^>]*>/);
  assert.doesNotMatch(html, / style="/);
});
